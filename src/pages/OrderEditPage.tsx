import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { blankOrder, useStore } from '../store'
import { Btn, Card, Field, Input, Select, Textarea } from '../components/ui'
import { STATUS_LABEL, addDays } from '../lib/format'
import { VAT_RATES, formatMoney, marginKop, parseRubInput } from '../lib/money'
import { epdReadiness, orderSaveIssues } from '../lib/validation'
import { formatWeight } from '../lib/weight'
import type { Order, Party, WeightUnit } from '../types'

function rubField(kop: number, onKop: (n: number) => void) {
  return (
    <Input
      defaultValue={(kop / 100).toString().replace('.', ',')}
      onBlur={(e) => onKop(parseRubInput(e.target.value))}
    />
  )
}

export function OrderEditPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const store = useStore()
  const existing = store.orders.find((o) => o.id === id)
  const [order, setOrder] = useState<Order>(() => existing ?? blankOrder(store.settings.defaultVat))
  const [msg, setMsg] = useState('')
  const [innQuery, setInnQuery] = useState('')
  const [loadedId, setLoadedId] = useState(id)

  if (id !== loadedId) {
    setLoadedId(id)
    setOrder(existing ?? blankOrder(store.settings.defaultVat))
    setMsg('')
  }

  const set = <K extends keyof Order>(key: K, value: Order[K]) => setOrder((o) => ({ ...o, [key]: value }))

  const clients = store.parties.filter((p) => p.kind === 'client')
  const carriers = store.parties.filter((p) => p.kind === 'carrier')
  const shippers = store.parties.filter((p) => p.kind === 'shipper' || p.kind === 'client')
  const consignees = store.parties.filter((p) => p.kind === 'consignee' || p.kind === 'client')
  const vehicles = store.vehicles.filter((v) => !order.carrierId || v.carrierId === order.carrierId)
  const drivers = store.drivers.filter((d) => !order.carrierId || d.carrierId === order.carrierId)

  const innHits = useMemo(() => {
    const q = innQuery.replace(/\D/g, '')
    if (q.length < 3) return []
    return store.parties.filter((p) => p.inn.includes(q)).slice(0, 8)
  }, [innQuery, store.parties])

  const issues = epdReadiness(order, store.parties, store.vehicles, store.drivers)
  const margin = marginKop(order.clientRateKop, order.carrierRateKop, order.extraExpenseKop)
  const partyLabel = (p: Party) => `${p.name} · ${p.inn}`

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/app/orders" className="text-sm text-[#6d614c]">
            ← Журнал
          </Link>
          <h1 className="stamp text-3xl">{order.number || 'Новый рейс'}</h1>
        </div>
        <div className="flex gap-2">
          <Btn
            onClick={() => {
              const save = orderSaveIssues(order)
              if (save.length) {
                setMsg(save.map((i) => `${i.label}: ${i.message}`).join('; '))
                return
              }
              store.saveOrder(order)
              store.log(`Сохранён рейс ${order.number || order.id}`, 'order')
              nav('/app/orders')
            }}
          >
            Сохранить
          </Btn>
          <Btn tone="ghost" onClick={() => nav('/app/documents')}>
            К документам
          </Btn>
        </div>
      </div>
      {msg && <div className="rounded-xl bg-[#f3d6d0] px-4 py-2 text-sm text-[#8a2f1e]">{msg}</div>}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="grid gap-4 p-5 md:grid-cols-3">
            <Field label="Номер">
              <Input value={order.number} onChange={(e) => set('number', e.target.value)} placeholder="назначится сам" />
            </Field>
            <Field label="Статус">
              <Select value={order.status} onChange={(e) => set('status', e.target.value as Order['status'])}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Источник">
              <Input value={order.source} onChange={(e) => set('source', e.target.value)} />
            </Field>
            <Field label="Погрузка">
              <Input type="date" value={order.loadingDate} onChange={(e) => set('loadingDate', e.target.value)} />
            </Field>
            <Field label="Выгрузка">
              <Input type="date" value={order.deliveryDate} onChange={(e) => set('deliveryDate', e.target.value)} />
            </Field>
            <Field label="Срок оплаты счёта">
              <Input type="date" value={order.paymentDueDate} onChange={(e) => set('paymentDueDate', e.target.value)} />
            </Field>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="font-serif text-xl">Участники</div>
            <Field label="Быстрый поиск по ИНН (большие справочники)">
              <Input
                value={innQuery}
                onChange={(e) => setInnQuery(e.target.value)}
                placeholder="Начните вводить ИНН — без полной загрузки списка"
              />
            </Field>
            {innHits.length > 0 && (
              <ul className="rounded-xl border border-[#e6d7b4] bg-white text-sm">
                {innHits.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full justify-between px-3 py-2 hover:bg-[#f7f1e4]"
                      onClick={() => {
                        if (p.kind === 'carrier') set('carrierId', p.id)
                        else if (p.kind === 'shipper') set('shipperId', p.id)
                        else if (p.kind === 'consignee') set('consigneeId', p.id)
                        else set('clientId', p.id)
                        setInnQuery('')
                      }}
                    >
                      <span>{p.name}</span>
                      <span className="font-mono text-[#6d614c]">
                        {p.inn} · {p.kind}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Клиент">
                <Select value={order.clientId} onChange={(e) => set('clientId', e.target.value)}>
                  <option value="">—</option>
                  {clients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {partyLabel(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Перевозчик">
                <Select
                  value={order.carrierId}
                  onChange={(e) => {
                    set('carrierId', e.target.value)
                    set('vehicleId', '')
                    set('driverId', '')
                  }}
                >
                  <option value="">—</option>
                  {carriers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {partyLabel(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Грузоотправитель">
                <Select value={order.shipperId} onChange={(e) => set('shipperId', e.target.value)}>
                  <option value="">—</option>
                  {shippers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {partyLabel(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Грузополучатель">
                <Select value={order.consigneeId} onChange={(e) => set('consigneeId', e.target.value)}>
                  <option value="">—</option>
                  {consignees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {partyLabel(p)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Груз">
              <Input value={order.cargo} onChange={(e) => set('cargo', e.target.value)} />
            </Field>
            <Field label="Код вида тары">
              <Input value={order.packingCode} onChange={(e) => set('packingCode', e.target.value)} />
            </Field>
            <Field label="Вес (единица явно, без догадок)">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.001"
                  value={order.weightValue || ''}
                  onChange={(e) => set('weightValue', Number(e.target.value))}
                />
                <Select
                  value={order.weightUnit}
                  onChange={(e) => set('weightUnit', e.target.value as WeightUnit)}
                  className="w-28"
                >
                  <option value="t">тонны</option>
                  <option value="kg">кг</option>
                </Select>
              </div>
              <div className="mt-1 text-xs text-[#6d614c]">{formatWeight(order.weightValue, order.weightUnit)}</div>
            </Field>
            <Field label="Объём, м³">
              <Input
                type="number"
                step="0.1"
                value={order.volumeM3 || ''}
                onChange={(e) => set('volumeM3', Number(e.target.value))}
              />
            </Field>
            <Field label="Откуда">
              <Input value={order.fromCity} onChange={(e) => set('fromCity', e.target.value)} />
            </Field>
            <Field label="Куда">
              <Input value={order.toCity} onChange={(e) => set('toCity', e.target.value)} />
            </Field>
            <Field label="Адрес погрузки">
              <Input value={order.fromAddress} onChange={(e) => set('fromAddress', e.target.value)} />
            </Field>
            <Field label="Адрес выгрузки">
              <Input value={order.toAddress} onChange={(e) => set('toAddress', e.target.value)} />
            </Field>
            <Field label="ТС">
              <Select value={order.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
                <option value="">—</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} · {v.brand} · прицеп {v.trailerPlate}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Водитель (ИНН не обязателен)">
              <Select value={order.driverId} onChange={(e) => set('driverId', e.target.value)}>
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.license}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>

          <Card className="grid gap-4 p-5 md:grid-cols-4">
            <Field label="Ставка клиенту, ₽">{rubField(order.clientRateKop, (n) => set('clientRateKop', n))}</Field>
            <Field label="Ставка перевозчику, ₽">{rubField(order.carrierRateKop, (n) => set('carrierRateKop', n))}</Field>
            <Field label="Доп. расходы, ₽">{rubField(order.extraExpenseKop, (n) => set('extraExpenseKop', n))}</Field>
            <Field label="НДС">
              <Select value={String(order.vatRate)} onChange={(e) => set('vatRate', Number(e.target.value) as Order['vatRate'])}>
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? 'Без НДС' : `${r}%`}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-4">
              <Field label="Комментарий">
                <Textarea value={order.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#6d614c]">Маржа</div>
            <div className={`mt-1 font-serif text-3xl ${margin < 0 ? 'text-[#a33b24]' : ''}`}>{formatMoney(margin)}</div>
            <button
              type="button"
              className="mt-3 text-xs text-[#8a5a12] underline"
              onClick={() => set('paymentDueDate', addDays(order.loadingDate, 10))}
            >
              Срок оплаты = погрузка + 10 дней
            </button>
          </Card>
          <Card className="p-5">
            <div className="font-serif text-xl">Готовность ЭПД</div>
            <p className="mt-1 text-xs text-[#6d614c]">
              Недостающие поля названы сразу — не после отказа оператора.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee0c4]">
              <div
                className="h-full bg-[#2f6f55]"
                style={{ width: `${Math.max(8, 100 - issues.length * 8)}%` }}
              />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {issues.length === 0 && <li className="text-[#215c28]">Все обязательные поля заполнены</li>}
              {issues.map((i) => (
                <li key={i.field} className="text-[#8a2f1e]">
                  {i.label}: {i.message}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
