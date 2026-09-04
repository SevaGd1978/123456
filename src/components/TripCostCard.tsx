import { calcTripCost, estimateRoadKm, formatLiters } from '../lib/tripCost'
import { formatMoney, kopToRub } from '../lib/money'
import { Card, Field, Input } from './ui'
import type { Order } from '../types'

function kopRateValue(kop: number): string {
  const rub = kopToRub(kop)
  return Number.isInteger(rub) ? String(rub) : String(rub)
}

export function TripCostCard({
  order,
  onChange,
}: {
  order: Order
  onChange: <K extends keyof Order>(key: K, value: Order[K]) => void
}) {
  const cost = calcTripCost(order)
  const ownMargin = order.clientRateKop - cost.totalKop - order.extraExpenseKop
  const suggested = estimateRoadKm(order.fromCity, order.toCity)

  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="font-serif text-xl">Себестоимость рейса</div>
        <p className="mt-1 text-xs text-[#6d614c]">
          ЗП водителя × км + «Платон» × км + расход 35 л / 100 км × цена литра. Расход можно изменить.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <Field label="Плечо, км">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step="1"
              value={order.distanceKm || ''}
              onChange={(e) => onChange('distanceKm', Number(e.target.value) || 0)}
            />
          </div>
          {suggested > 0 && suggested !== order.distanceKm && (
            <button
              type="button"
              className="mt-1 text-xs text-[#8a5a12] underline"
              onClick={() => onChange('distanceKm', suggested)}
            >
              По городам ≈ {suggested} км
            </button>
          )}
        </Field>
        <Field label="ЗП водителя, ₽/км">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={kopRateValue(order.driverPayPerKmKop)}
            onChange={(e) => onChange('driverPayPerKmKop', Math.round(Number(e.target.value.replace(',', '.')) * 100) || 0)}
          />
        </Field>
        <Field label="Платон, ₽/км">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={kopRateValue(order.platonPerKmKop)}
            onChange={(e) => onChange('platonPerKmKop', Math.round(Number(e.target.value.replace(',', '.')) * 100) || 0)}
          />
        </Field>
        <Field label="Расход, л/100 км">
          <Input
            type="number"
            min={0}
            step="0.1"
            value={order.fuelLitersPer100 || ''}
            onChange={(e) => onChange('fuelLitersPer100', Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Дизель, ₽/л">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={kopRateValue(order.fuelPricePerLiterKop)}
            onChange={(e) => onChange('fuelPricePerLiterKop', Math.round(Number(e.target.value.replace(',', '.')) * 100) || 0)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-[#f4ead6] p-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">ЗП водителя</div>
          <div className="font-serif text-lg">{formatMoney(cost.salaryKop)}</div>
          <div className="text-xs text-[#6d614c]">
            {order.distanceKm || 0} км × {kopRateValue(order.driverPayPerKmKop)} ₽
          </div>
        </div>
        <div className="rounded-xl bg-[#f4ead6] p-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">Платон</div>
          <div className="font-serif text-lg">{formatMoney(cost.platonKop)}</div>
          <div className="text-xs text-[#6d614c]">
            {order.distanceKm || 0} км × {kopRateValue(order.platonPerKmKop)} ₽
          </div>
        </div>
        <div className="rounded-xl bg-[#f4ead6] p-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#6d614c]">Топливо</div>
          <div className="font-serif text-lg">{formatMoney(cost.fuelKop)}</div>
          <div className="text-xs text-[#6d614c]">
            {formatLiters(cost.liters)} · {order.fuelLitersPer100 || 0} л/100 км
          </div>
        </div>
        <div className="rounded-xl bg-[#14221c] p-3 text-[#f7f1e4]">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#cbb892]">Итого себестоимость</div>
          <div className="font-serif text-2xl">{formatMoney(cost.totalKop)}</div>
          <div className={`text-xs ${ownMargin < 0 ? 'text-[#f3d6d0]' : 'text-[#d9f0d6]'}`}>
            к ставке клиента {ownMargin < 0 ? '−' : '+'} {formatMoney(Math.abs(ownMargin))}
          </div>
        </div>
      </div>
    </Card>
  )
}
