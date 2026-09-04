import { useState } from 'react'
import { useStore } from '../store'
import { Btn, Card, Field, Input } from '../components/ui'
import { downloadTextFile, exportDocumentsXml, exportPartiesXml, parsePartiesXml } from '../lib/xml1c'
import { formatDate } from '../lib/format'

export function ExchangePage() {
  const store = useStore()
  const company = store.parties.find((p) => p.id === store.settings.companyId)
  const [fileName, setFileName] = useState('TT_DOC_1C.xml')
  const [preview, setPreview] = useState('')
  const [info, setInfo] = useState('')

  if (!company) return null

  const exportDocs = () => {
    const xml = exportDocumentsXml(store.orders, store.parties, company)
    setPreview(xml)
    downloadTextFile(fileName || 'TT_DOC_1C.xml', xml)
    const rows = store.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'draft').length
    store.addExchange({
      direction: 'export',
      kind: 'documents',
      fileName: fileName || 'TT_DOC_1C.xml',
      rows,
      status: 'ok',
      message: 'UTF-8, срок оплаты и НДС 22% включены',
    })
    store.log(`Выгрузка документов ${fileName}`, '1c')
    setInfo(`Скачан файл ${fileName || 'TT_DOC_1C.xml'} — сохраните его сами, путь C:\\ больше не зашит.`)
  }

  const exportClients = () => {
    const xml = exportPartiesXml(store.parties, 'client')
    setPreview(xml)
    downloadTextFile('TT_CLT_1C.xml', xml)
    store.addExchange({
      direction: 'export',
      kind: 'clients',
      fileName: 'TT_CLT_1C.xml',
      rows: store.parties.filter((p) => p.kind === 'client').length,
      status: 'ok',
      message: 'Контрагенты, UTF-8',
    })
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="stamp text-3xl">Обмен с 1С</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#4a4336]">
          В старой схеме пути были прописаны как C:/1C_CLT_TT.xml и C:/TT_DOC_1C.xml. Здесь имя файла задаёте вы, кодировка
          только UTF-8, перед скачиванием виден XML, в документах есть срок оплаты счёта.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <Field label="Имя файла выгрузки документов">
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={exportDocs}>Выгрузить документы</Btn>
            <Btn tone="ghost" onClick={exportClients}>
              Выгрузить клиентов
            </Btn>
          </div>
          <Field label="Загрузить справочник (XML UTF-8)">
            <input
              type="file"
              accept=".xml,text/xml"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const text = await file.text()
                const parsed = parsePartiesXml(text)
                if (parsed.error) {
                  store.addExchange({
                    direction: 'import',
                    kind: 'clients',
                    fileName: file.name,
                    rows: 0,
                    status: 'error',
                    message: parsed.error,
                  })
                  setInfo(parsed.error)
                  return
                }
                store.addExchange({
                  direction: 'import',
                  kind: 'clients',
                  fileName: file.name,
                  rows: parsed.parties.length,
                  status: 'ok',
                  message: `Прочитано ${parsed.parties.length} контрагентов, дубликаты ИНН не навязываются`,
                })
                setInfo(`Файл «${file.name}»: ${parsed.parties.length} контрагентов. Импорт в демо только показывает разбор, без записи чужих ИНН.`)
                setPreview(text.slice(0, 4000))
              }}
            />
          </Field>
          {info && <div className="rounded-xl bg-[#f4ead6] p-3 text-sm">{info}</div>}
        </Card>
        <Card className="p-5">
          <div className="font-serif text-xl">Журнал обмена</div>
          <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
            {store.exchange.map((j) => (
              <li key={j.id} className="border-b border-[#efe3c8] py-2">
                <div className="font-semibold">
                  {j.direction === 'export' ? '↑' : '↓'} {j.fileName} · {j.rows} стр.
                </div>
                <div className="text-xs text-[#6d614c]">
                  {formatDate(j.at.slice(0, 10))} · {j.message}
                </div>
              </li>
            ))}
            {!store.exchange.length && <li className="text-[#6d614c]">Пока пусто — сделайте выгрузку</li>}
          </ul>
        </Card>
      </div>
      {preview && (
        <Card className="p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.14em] text-[#6d614c]">Предпросмотр UTF-8</div>
          <pre className="max-h-80 overflow-auto font-mono text-xs whitespace-pre-wrap">{preview}</pre>
        </Card>
      )}
    </div>
  )
}
