import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { VirtualTable } from '../components/VirtualTable'
import { Btn, Input, Select, StatusPill } from '../components/ui'
import { formatMoney } from '../lib/money'
import { formatDate, STATUS_LABEL } from '../lib/format'
import { calcTripCost } from '../lib/tripCost'

export function OrdersPage() {
  const { orders, parties } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

  const partyById = useMemo(() => new Map(parties.map((p) => [p.id, p])), [parties])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false
      if (!query) return true
      const client = partyById.get(o.clientId)
      const carrier = partyById.get(o.carrierId)
      const hay = [
        o.number,
        o.cargo,
        o.fromCity,
        o.toCity,
        client?.name,
        client?.inn,
        carrier?.name,
        carrier?.inn,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(query)
    })
  }, [orders, status, q, partyById])

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d614c]">Журнал</div>
          <h1 className="stamp text-3xl">Рейсы · {filtered.length.toLocaleString('ru-RU')}</h1>
        </div>
        <Link to="/app/orders/new">
          <Btn>Новый рейс</Btn>
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Номер, груз, город, ИНН клиента или перевозчика"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xl"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-52">
          <option value="all">Все статусы</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <VirtualTable
        rowCount={filtered.length}
        header={
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-2">Заявка</div>
            <div className="col-span-2">Клиент</div>
            <div className="col-span-3">Маршрут</div>
            <div className="col-span-1">Км</div>
            <div className="col-span-2">Себестоимость</div>
            <div className="col-span-2">Статус</div>
          </div>
        }
        renderRow={(i) => {
          const o = filtered[i]
          if (!o) return null
          const client = partyById.get(o.clientId)
          const cost = calcTripCost(o)
          return (
            <Link
              key={o.id}
              to={`/app/orders/${o.id}`}
              className="grid grid-cols-12 gap-2 border-b border-[#efe3c8] px-3 py-3 text-sm hover:bg-[#f7f1e4]"
            >
              <div className="col-span-2">
                <div className="font-semibold">{o.number}</div>
                <div className="text-xs text-[#6d614c]">{formatDate(o.loadingDate)}</div>
              </div>
              <div className="col-span-2">
                <div className="truncate">{client?.name ?? '—'}</div>
                <div className="font-mono text-[11px] text-[#6d614c]">{client?.inn}</div>
              </div>
              <div className="col-span-3">
                <div>
                  {o.fromCity} → {o.toCity}
                </div>
                <div className="truncate text-xs text-[#6d614c]">{o.cargo}</div>
              </div>
              <div className="col-span-1">{o.distanceKm ? `${o.distanceKm}` : '—'}</div>
              <div className="col-span-2">
                <div>{formatMoney(cost.totalKop)}</div>
                <div className="text-[11px] text-[#6d614c]">ЗП + Платон + топливо</div>
              </div>
              <div className="col-span-2">
                <StatusPill status={o.status} label={STATUS_LABEL[o.status]} />
              </div>
            </Link>
          )
        }}
      />
    </div>
  )
}
