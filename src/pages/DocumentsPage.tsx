import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Btn, Card } from '../components/ui'
import { formatDate } from '../lib/format'
import { formatMoney, grossAmount, vatAmount } from '../lib/money'
import { formatWeight } from '../lib/weight'

export function DocumentsPage() {
  const { orders, parties, settings } = useStore()
  const company = parties.find((p) => p.id === settings.companyId)
  const docs = useMemo(
    () => orders.filter((o) => o.status === 'invoiced' || o.status === 'paid' || o.status === 'delivered').slice(0, 80),
    [orders],
  )
  const [id, setId] = useState(docs[0]?.id ?? '')
  const order = orders.find((o) => o.id === id) ?? docs[0]
  const client = parties.find((p) => p.id === order?.clientId)
  const carrier = parties.find((p) => p.id === order?.carrierId)

  if (!order) {
    return (
      <div className="p-6">
        <h1 className="stamp text-3xl">Документы</h1>
        <p className="mt-3 text-[#6d614c]">Нет доставленных или выставленных рейсов.</p>
      </div>
    )
  }

  const vat = vatAmount(order.clientRateKop, order.vatRate)
  const gross = grossAmount(order.clientRateKop, order.vatRate)

  return (
    <div className="space-y-4 p-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="stamp text-3xl">Счёт / заявка</h1>
          <p className="text-sm text-[#6d614c]">Печать в браузере — без отдельного Windows-клиента.</p>
        </div>
        <Btn onClick={() => window.print()}>Печать</Btn>
      </div>
      <div className="no-print">
        <select
          className="rounded-xl border border-[#d7c7a2] bg-white px-3 py-2 text-sm"
          value={order.id}
          onChange={(e) => setId(e.target.value)}
        >
          {docs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.number} · {o.fromCity}–{o.toCity}
            </option>
          ))}
        </select>
      </div>

      <Card className="mx-auto max-w-3xl p-8">
        <div className="flex justify-between gap-4">
          <div>
            <div className="font-serif text-2xl">{company?.name}</div>
            <div className="text-sm text-[#6d614c]">
              ИНН {company?.inn} КПП {company?.kpp}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-serif text-xl">Счёт-заявка {order.number}</div>
            <div>от {formatDate(order.loadingDate)}</div>
            <div>оплатить до {formatDate(order.paymentDueDate)}</div>
          </div>
        </div>
        <div className="mt-6 grid gap-2 text-sm">
          <div>
            <b>Заказчик:</b> {client?.name} (ИНН {client?.inn})
          </div>
          <div>
            <b>Исполнитель по перевозке:</b> {carrier?.name}
          </div>
          <div>
            <b>Маршрут:</b> {order.fromCity}, {order.fromAddress} → {order.toCity}, {order.toAddress}
          </div>
          <div>
            <b>Груз:</b> {order.cargo}, {formatWeight(order.weightValue, order.weightUnit)}, {order.volumeM3} м³, тара{' '}
            {order.packingCode || '—'}
          </div>
        </div>
        <table className="mt-6 w-full text-sm">
          <thead className="bg-[#f4ead6] text-left">
            <tr>
              <th className="px-2 py-2">Услуга</th>
              <th>Нетто</th>
              <th>НДС {order.vatRate}%</th>
              <th>Всего</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#efe3c8]">
              <td className="px-2 py-2">ТЭУ по заявке {order.number}</td>
              <td>{formatMoney(order.clientRateKop)}</td>
              <td>{formatMoney(vat)}</td>
              <td>{formatMoney(gross)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-6 font-serif text-2xl">К оплате: {formatMoney(gross)}</div>
      </Card>
    </div>
  )
}
