import { useMemo } from 'react'
import { useStore } from '../store'
import { Card } from '../components/ui'
import { formatMoney, marginKop, vatAmount } from '../lib/money'

export function ReportsPage() {
  const { orders, parties } = useStore()
  const live = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'draft')

  const byClient = useMemo(() => {
    const map = new Map<string, { name: string; n: number; revenue: number; margin: number; vat: number }>()
    for (const o of live) {
      const p = parties.find((x) => x.id === o.clientId)
      const cur = map.get(o.clientId) ?? { name: p?.name ?? '—', n: 0, revenue: 0, margin: 0, vat: 0 }
      cur.n += 1
      cur.revenue += o.clientRateKop
      cur.margin += marginKop(o.clientRateKop, o.carrierRateKop, o.extraExpenseKop)
      cur.vat += vatAmount(o.clientRateKop, o.vatRate)
      map.set(o.clientId, cur)
    }
    return [...map.values()].sort((a, b) => b.margin - a.margin).slice(0, 12)
  }, [live, parties])

  const vat22 = live.filter((o) => o.vatRate === 22)
  const vat22sum = vat22.reduce((s, o) => s + vatAmount(o.clientRateKop, 22), 0)

  return (
    <div className="space-y-4 p-6">
      <h1 className="stamp text-3xl">Отчёты</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#6d614c]">Рейсов</div>
          <div className="font-serif text-3xl">{live.length.toLocaleString('ru-RU')}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#6d614c]">НДС 22% (сумма налога)</div>
          <div className="font-serif text-3xl">{formatMoney(vat22sum)}</div>
          <div className="text-xs text-[#6d614c]">{vat22.length} документов по ставке 2026 года</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#6d614c]">Маржа топ-клиентов</div>
          <div className="font-serif text-3xl">{formatMoney(byClient.reduce((s, r) => s + r.margin, 0))}</div>
        </Card>
      </div>
      <Card className="overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f4ead6] text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">
            <tr>
              <th className="px-4 py-2">Клиент</th>
              <th>Рейсов</th>
              <th>Выручка</th>
              <th>НДС</th>
              <th>Маржа</th>
            </tr>
          </thead>
          <tbody>
            {byClient.map((r, i) => (
              <tr key={`${r.name}-${i}`} className="border-t border-[#efe3c8]">
                <td className="px-4 py-2 font-semibold">{r.name}</td>
                <td>{r.n}</td>
                <td>{formatMoney(r.revenue)}</td>
                <td>{formatMoney(r.vat)}</td>
                <td>{formatMoney(r.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
