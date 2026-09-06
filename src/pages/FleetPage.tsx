import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Card, Input, StatusPill } from '../components/ui'

export function FleetPage() {
  const { vehicles, drivers, parties } = useStore()
  const [q, setQ] = useState('')
  const carrierName = (id: string) => parties.find((p) => p.id === id)?.name ?? '—'
  const list = useMemo(() => {
    const query = q.toLowerCase()
    return vehicles.filter((v) =>
      `${v.plate} ${v.trailerPlate} ${v.brand} ${carrierName(v.carrierId)}`.toLowerCase().includes(query),
    )
  }, [vehicles, q, parties])

  return (
    <div className="space-y-4 p-6">
      <h1 className="stamp text-3xl">Парк и водители</h1>
      <Input placeholder="Госномер, прицеп, перевозчик" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#f4ead6] text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">
              <tr>
                <th className="px-4 py-2">ТС</th>
                <th>Прицеп</th>
                <th>Грузоподъёмность</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id} className="border-t border-[#efe3c8]">
                  <td className="px-4 py-2">
                    <div className="font-semibold">{v.plate}</div>
                    <div className="text-xs text-[#6d614c]">
                      {v.brand} · {carrierName(v.carrierId)}
                    </div>
                  </td>
                  <td>{v.trailerPlate}</td>
                  <td>{(v.capacityKg / 1000).toFixed(0)} т / {v.volumeM3} м³</td>
                  <td>
                    <StatusPill
                      status={v.status}
                      label={v.status === 'free' ? 'свободен' : v.status === 'busy' ? 'в рейсе' : 'ремонт'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="max-h-[70vh] overflow-auto p-4">
          <div className="font-serif text-xl">Водители</div>
          <p className="mb-3 text-xs text-[#6d614c]">ИНН водителя необязателен — как в актуальном ЭТрН.</p>
          <ul className="space-y-2 text-sm">
            {drivers.slice(0, 40).map((d) => (
              <li key={d.id} className="flex justify-between border-b border-[#efe3c8] py-2">
                <span>{d.name}</span>
                <span className="text-[#6d614c]">{d.license}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
