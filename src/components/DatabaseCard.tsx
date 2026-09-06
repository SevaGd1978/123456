import { useRef, useState } from 'react'
import { useStore } from '../store'
import { Btn, Card, Field, Input } from './ui'
import { buildExcelWorkbook, downloadExcel, parseExcelWorkbook } from '../lib/excelIo'

export function DatabaseCard() {
  const store = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)

  const isDirector = store.currentUser?.role === 'director'

  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="font-serif text-xl">База на этом компьютере</div>
        <p className="mt-1 text-xs leading-relaxed text-[#6d614c]">
          Журнал и справочники лежат в браузере. Можно выгрузить в Excel, загрузить файл (.xlsx / .xls / .csv) или
          полностью очистить рейсы и карточки — для очистки нужен пароль директора.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn
          tone="ghost"
          type="button"
          onClick={() => {
            downloadExcel(
              'reisoffice-shablon.xlsx',
              buildExcelWorkbook({ parties: [], vehicles: [], drivers: [], orders: [] }),
            )
            store.log('Скачан шаблон Excel', 'db')
          }}
        >
          Скачать шаблон Excel
        </Btn>
        <Btn
          tone="ghost"
          type="button"
          onClick={() => {
            downloadExcel('reisoffice-baza.xlsx', buildExcelWorkbook(store))
            store.log('Выгружена база в Excel', 'db')
            setHint(`Скачан файл с ${store.orders.length} рейсами и ${store.parties.length} контрагентами`)
          }}
        >
          Выгрузить текущую базу
        </Btn>
        <Btn type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Читаем файл…' : 'Импорт из Excel'}
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
            setHint('')
            try {
              const buf = await file.arrayBuffer()
              const imported = parseExcelWorkbook(buf, store)
              store.applyImport(imported)
              store.addExchange({
                direction: 'import',
                kind: 'documents',
                fileName: file.name,
                rows: imported.counts.orders + imported.counts.parties,
                status: imported.counts.orders + imported.counts.parties + imported.counts.vehicles + imported.counts.drivers ? 'ok' : 'error',
                message: `+${imported.counts.parties} контрагентов, +${imported.counts.vehicles} ТС, +${imported.counts.drivers} водителей, +${imported.counts.orders} рейсов`,
              })
              store.log(`Импорт Excel ${file.name}`, 'db')
              const extra = imported.warnings.length ? ` · ${imported.warnings.slice(0, 3).join('; ')}` : ''
              setHint(
                `Добавлено: ${imported.counts.parties} контрагентов, ${imported.counts.vehicles} ТС, ${imported.counts.drivers} водителей, ${imported.counts.orders} рейсов${extra}`,
              )
            } catch (err) {
              setHint(err instanceof Error ? err.message : 'Не удалось прочитать Excel')
            } finally {
              setBusy(false)
            }
          }}
        />
      </div>
      {hint && <p className="text-xs leading-relaxed text-[#4a4336]">{hint}</p>}
      <div className="rounded-xl border border-[#e4c4b8] bg-[#fdf4f0] p-4">
        <div className="text-sm font-semibold text-[#8a2f1e]">Очистить базу</div>
        <p className="mt-1 text-xs text-[#6d614c]">
          Удалит все рейсы, контрагентов (кроме своей фирмы), ТС и водителей. Пользователи и настройки останутся. Нужен
          пароль директора{isDirector ? ` (${store.currentUser?.login})` : ''}.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Пароль директора">
            <Input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isDirector ? 'пароль входа' : 'войдите как директор'}
              disabled={!isDirector}
            />
          </Field>
          <Btn
            tone="danger"
            type="button"
            disabled={!isDirector || !password}
            onClick={() => {
              if (!window.confirm('Удалить все рейсы, ТС, водителей и чужих контрагентов? Это нельзя отменить.')) {
                return
              }
              const res = store.wipeDatabase(password)
              setPassword('')
              setHint(res.ok ? 'База очищена. Своя фирма и пользователи на месте.' : res.error)
            }}
          >
            Очистить базу
          </Btn>
        </div>
      </div>
    </Card>
  )
}
