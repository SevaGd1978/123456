import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Btn, Card, Field, Input, Select } from '../components/ui'
import { isValidInn } from '../lib/inn'
import type { Party, PartyKind } from '../types'

const KINDS: { id: PartyKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'client', label: 'Клиенты' },
  { id: 'carrier', label: 'Перевозчики' },
  { id: 'shipper', label: 'Грузоотправители' },
  { id: 'consignee', label: 'Грузополучатели' },
  { id: 'own', label: 'Наша фирма' },
]

const empty = (): Party => ({
  id: `p-${Date.now()}`,
  kind: 'client',
  name: '',
  inn: '',
  kpp: '',
  legalForm: 'ooo',
  phone: '',
  email: '',
  city: '',
  address: '',
  contact: '',
  bankBik: '',
  bankAccount: '',
  edoId: '',
  epdId: '',
  notes: '',
})

export function PartiesPage() {
  const { parties, saveParty, log } = useStore()
  const [kind, setKind] = useState<PartyKind | 'all'>('client')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Party | null>(null)
  const [err, setErr] = useState('')

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return parties.filter((p) => {
      if (kind !== 'all' && p.kind !== kind) return false
      if (!query) return true
      return `${p.name} ${p.inn} ${p.city}`.toLowerCase().includes(query)
    })
  }, [parties, kind, q])

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d614c]">Справочники</div>
          <h1 className="stamp text-3xl">Контрагенты</h1>
        </div>
        <Btn onClick={() => setEdit(empty())}>Новая карточка</Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            className={`rounded-full px-3 py-1.5 text-sm ${kind === k.id ? 'bg-[#14221c] text-[#f7f1e4]' : 'bg-[#fffaf0] border border-[#d7c7a2]'}`}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      <Input placeholder="Название, город или ИНН" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-lg" />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#f4ead6] text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">
              <tr>
                <th className="px-4 py-2">Наименование</th>
                <th>ИНН</th>
                <th>Город</th>
                <th>ЭПД id</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-t border-[#efe3c8] hover:bg-[#f7f1e4]"
                  onClick={() => {
                    setEdit(p)
                    setErr('')
                  }}
                >
                  <td className="px-4 py-2 font-semibold">{p.name}</td>
                  <td className="font-mono text-xs">{p.inn}</td>
                  <td>{p.city}</td>
                  <td className="text-xs">{p.epdId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {edit && (
          <Card className="space-y-3 p-5">
            <div className="font-serif text-xl">{edit.name || 'Карточка'}</div>
            <Field label="Вид">
              <Select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as PartyKind })}>
                {KINDS.filter((k) => k.id !== 'all').map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Наименование">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="ИНН (проверка контрольной суммы)">
              <Input value={edit.inn} onChange={(e) => setEdit({ ...edit, inn: e.target.value.replace(/\D/g, '') })} />
              <div className={`mt-1 text-xs ${isValidInn(edit.inn) ? 'text-[#215c28]' : 'text-[#a33b24]'}`}>
                {edit.inn ? (isValidInn(edit.inn) ? 'ИНН корректный' : 'ИНН с ошибкой в контрольной сумме') : 'укажите ИНН'}
              </div>
            </Field>
            <Field label="КПП">
              <Input value={edit.kpp} onChange={(e) => setEdit({ ...edit, kpp: e.target.value })} />
            </Field>
            <Field label="Город">
              <Input value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
            </Field>
            <Field label="Телефон">
              <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="Ид. ЭДО / ЭПД">
              <div className="grid grid-cols-2 gap-2">
                <Input value={edit.edoId} onChange={(e) => setEdit({ ...edit, edoId: e.target.value })} placeholder="ЭДО" />
                <Input value={edit.epdId} onChange={(e) => setEdit({ ...edit, epdId: e.target.value })} placeholder="ЭПД" />
              </div>
            </Field>
            {err && <div className="text-sm text-[#a33b24]">{err}</div>}
            <Btn
              className="w-full"
              onClick={() => {
                const res = saveParty(edit)
                if (!res.ok) setErr(res.error)
                else {
                  setErr('')
                  log(`Карточка ${edit.name}`, 'party')
                }
              }}
            >
              Сохранить карточку
            </Btn>
          </Card>
        )}
      </div>
    </div>
  )
}
