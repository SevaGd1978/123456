import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { formatMoney, marginKop } from '../lib/money'
import { formatDate, todayIso } from '../lib/format'
import { Card } from '../components/ui'
import { calcTripCost } from '../lib/tripCost'

export function DashboardPage() {
  const { orders, parties, vehicles } = useStore()
  const today = todayIso()
  const live = orders.filter((o) => o.status !== 'cancelled')
  const loadingToday = live.filter((o) => o.loadingDate === today)
  const overdue = live.filter((o) => o.paymentDueDate < today && o.status !== 'paid')
  const inTransit = live.filter((o) => o.status === 'in_transit' || o.status === 'loading')
  const margin = live.reduce((s, o) => s + marginKop(o.clientRateKop, o.carrierRateKop, o.extraExpenseKop), 0)
  const tripCost = live.reduce((s, o) => s + calcTripCost(o).totalKop, 0)
  const revenue = live.reduce((s, o) => s + o.clientRateKop, 0)
  const nameOf = (id: string) => parties.find((p) => p.id === id)?.name ?? '—'

  const kpis = [
    { label: 'Рейсов в базе', value: String(live.length) },
    { label: 'Погрузка сегодня', value: String(loadingToday.length) },
    { label: 'В пути', value: String(inTransit.length) },
    { label: 'Просрочена оплата', value: String(overdue.length) },
    { label: 'Выручка (все)', value: formatMoney(revenue) },
    { label: 'Себестоимость (ЗП+Платон+топливо)', value: formatMoney(tripCost) },
    { label: 'Маржа экспедитора', value: formatMoney(margin) },
    { label: 'Маржа к себестоимости', value: formatMoney(revenue - tripCost) },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d614c]">Пульт диспетчера</div>
        <h1 className="stamp mt-1 text-3xl">Смена {formatDate(today)}</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#6d614c]">{k.label}</div>
            <div className="mt-2 font-serif text-2xl">{k.value}</div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Погрузка сегодня</h2>
            <Link to="/app/orders" className="text-sm text-[#8a5a12]">
              Журнал →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-[#eee0c4]">
            {loadingToday.slice(0, 8).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link to={`/app/orders/${o.id}`} className="font-semibold hover:underline">
                  {o.number}
                </Link>
                <span className="text-[#6d614c]">
                  {o.fromCity} → {o.toCity}
                  {o.distanceKm ? ` · ${o.distanceKm} км` : ''}
                </span>
                <span className="shrink-0">{formatMoney(calcTripCost(o).totalKop)}</span>
              </li>
            ))}
            {!loadingToday.length && <li className="py-6 text-sm text-[#6d614c]">На сегодня погрузок нет</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-xl">Парк</h2>
          <p className="mt-2 text-sm text-[#4a4336]">
            Свободно {vehicles.filter((v) => v.status === 'free').length} из {vehicles.length}. Контрагентов:{' '}
            {parties.length}. Клиент в шапке заказа ищется по ИНН — это как раз то место, которое в десктопе ломалось
            на больших списках.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/app/orders/new" className="rounded-xl bg-[#c8922a] px-4 py-2 text-sm font-semibold">
              Новый рейс
            </Link>
            <Link to="/app/exchange" className="rounded-xl border border-[#d7c7a2] px-4 py-2 text-sm font-semibold">
              Выгрузить в 1С
            </Link>
            <Link to="/app/improvements" className="rounded-xl border border-[#d7c7a2] px-4 py-2 text-sm font-semibold">
              Карта улучшений
            </Link>
          </div>
          <div className="mt-5 text-xs text-[#6d614c]">
            Ближайший должник: {overdue[0] ? `${overdue[0].number} · ${nameOf(overdue[0].clientId)}` : 'нет'}
          </div>
        </Card>
      </div>
    </div>
  )
}
