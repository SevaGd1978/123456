import { useRef, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { useStore } from '../store'
import { analyzeExcelWorkbook, type ExcelAnalysis } from '../lib/excelAnalyze'
import { parseExcelWorkbook } from '../lib/excelIo'
import { formatMoney } from '../lib/money'
import { Btn, Card } from './ui'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-[#f4ead6] p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">{label}</div>
      <div className="font-serif text-xl">{value}</div>
      {hint && <div className="text-xs text-[#6d614c]">{hint}</div>}
    </div>
  )
}

export function ExcelAnalyzeCard() {
  const store = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<ExcelAnalysis | null>(null)
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-serif text-xl">Анализ Excel</div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6d614c]">
            Загрузите .xlsx / .xls / .csv — разберём листы и, если узнаем рейсы, посчитаем км, выручку и маржу. В рабочую
            базу ничего не пишется, пока не нажмёте «Внести в базу».
          </p>
        </div>
        <Btn type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
          <FileSpreadsheet size={16} />
          {busy ? 'Читаем файл…' : 'Загрузить Excel для анализа'}
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setBusy(true)
            setError('')
            try {
              const buf = await file.arrayBuffer()
              const next = analyzeExcelWorkbook(buf, store.settings)
              setAnalysis(next)
              setBuffer(buf)
              setFileName(file.name)
              store.log(`Анализ Excel ${file.name}`, 'report')
            } catch (err) {
              setAnalysis(null)
              setBuffer(null)
              setError(err instanceof Error ? err.message : 'Не удалось прочитать Excel')
            } finally {
              setBusy(false)
            }
          }}
        />
      </div>
      {error && <p className="text-sm text-[#8a2f1e]">{error}</p>}
      {analysis && (
        <div className="space-y-4">
          <p className="text-sm text-[#4a4336]">
            <b>{fileName}</b>
            {' · '}
            {analysis.sheets.length} лист.
            {' · '}
            {analysis.sheets.reduce((s, sh) => s + sh.rows, 0)} строк
            {' · '}
            узнано: {analysis.imported.counts.orders} рейсов, {analysis.imported.counts.parties} контрагентов,{' '}
            {analysis.imported.counts.vehicles} ТС, {analysis.imported.counts.drivers} водителей
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.sheets.map((sh) => (
              <span key={sh.name} className="rounded-full bg-[#f4ead6] px-3 py-1 text-xs text-[#4a4336]">
                {sh.name} · {sh.rows}
              </span>
            ))}
          </div>
          {analysis.imported.warnings.length > 0 && (
            <ul className="rounded-xl bg-[#fdf4f0] px-4 py-3 text-xs text-[#8a2f1e]">
              {analysis.imported.warnings.slice(0, 6).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {analysis.totals.trips > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Рейсов" value={analysis.totals.trips.toLocaleString('ru-RU')} />
                <Stat label="Км" value={analysis.totals.km.toLocaleString('ru-RU')} />
                <Stat label="Выручка" value={formatMoney(analysis.totals.revenueKop)} />
                <Stat
                  label="Маржа"
                  value={formatMoney(analysis.totals.marginKop)}
                  hint={`себестоимость ${formatMoney(analysis.totals.costKop)}`}
                />
              </div>
              {(analysis.totals.withoutKm > 0 || analysis.totals.withoutRate > 0) && (
                <p className="text-xs text-[#6d614c]">
                  Без км: {analysis.totals.withoutKm}. Без ставки клиенту: {analysis.totals.withoutRate}.
                </p>
              )}
              {analysis.byClient.length > 0 && (
                <div className="overflow-auto">
                  <div className="mb-2 text-sm font-semibold">По клиентам</div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f4ead6] text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">
                      <tr>
                        <th className="px-3 py-2">Клиент</th>
                        <th>Рейсов</th>
                        <th>Км</th>
                        <th>Выручка</th>
                        <th>Маржа</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.byClient.map((r) => (
                        <tr key={r.name} className="border-t border-[#efe3c8]">
                          <td className="px-3 py-2 font-semibold">{r.name}</td>
                          <td>{r.n}</td>
                          <td>{r.km.toLocaleString('ru-RU')}</td>
                          <td>{formatMoney(r.revenueKop)}</td>
                          <td>{formatMoney(r.marginKop)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {analysis.byRoute.length > 0 && (
                <div className="overflow-auto">
                  <div className="mb-2 text-sm font-semibold">По маршрутам</div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f4ead6] text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">
                      <tr>
                        <th className="px-3 py-2">Маршрут</th>
                        <th>Рейсов</th>
                        <th>Км</th>
                        <th>Выручка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.byRoute.map((r) => (
                        <tr key={r.name} className="border-t border-[#efe3c8]">
                          <td className="px-3 py-2 font-semibold">{r.name}</td>
                          <td>{r.n}</td>
                          <td>{r.km.toLocaleString('ru-RU')}</td>
                          <td>{formatMoney(r.revenueKop)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Btn
                type="button"
                tone="ghost"
                onClick={() => {
                  if (!buffer) return
                  const imported = parseExcelWorkbook(buffer, store)
                  store.applyImport(imported)
                  store.addExchange({
                    direction: 'import',
                    kind: 'documents',
                    fileName,
                    rows: imported.counts.orders + imported.counts.parties,
                    status: 'ok',
                    message: `Из анализа: +${imported.counts.orders} рейсов, +${imported.counts.parties} контрагентов`,
                  })
                  store.log(`В базу из анализа ${fileName}`, 'db')
                  setError('')
                  setFileName((n) => `${n.replace(/ · внесено в базу$/, '')} · внесено в базу`)
                }}
              >
                Внести распознанное в базу
              </Btn>
            </>
          )}
          {analysis.sheets[0] && analysis.sheets[0].preview.length > 0 && (
            <div className="overflow-auto">
              <div className="mb-2 text-sm font-semibold">Первые строки «{analysis.sheets[0].name}»</div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4ead6] text-[#6d614c]">
                  <tr>
                    {analysis.sheets[0].columns.slice(0, 8).map((c) => (
                      <th key={c} className="px-2 py-1 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.sheets[0].preview.map((row, i) => (
                    <tr key={i} className="border-t border-[#efe3c8]">
                      {analysis.sheets[0]!.columns.slice(0, 8).map((c) => (
                        <td key={c} className="max-w-40 truncate px-2 py-1">
                          {row[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
