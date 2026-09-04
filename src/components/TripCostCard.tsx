import { useEffect, useRef, useState } from 'react'
import { calcTripCost, formatLiters } from '../lib/tripCost'
import { lookupDrivingKm, type DrivingKmResult } from '../lib/roadKm'
import { formatMoney, kopToRub } from '../lib/money'
import { Card, Field, Input } from './ui'
import type { Order } from '../types'

function kopRateValue(kop: number): string {
  const rub = kopToRub(kop)
  return Number.isInteger(rub) ? String(rub) : String(rub)
}

function routeKey(order: Pick<Order, 'fromCity' | 'toCity' | 'fromAddress' | 'toAddress'>): string {
  return [order.fromCity, order.fromAddress, order.toCity, order.toAddress]
    .map((s) => s.trim().toLowerCase())
    .join('|')
}

function formatDuration(min?: number): string {
  if (!min || min < 1) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h} ч ${m} мин`
  if (h) return `${h} ч`
  return `${m} мин`
}

function sourceLabel(r: DrivingKmResult): string {
  if (r.source === 'osrm' || r.source === 'cache') {
    const drive = formatDuration(r.durationMin)
    return drive ? `OSM / OSRM · ${r.km} км · ${drive}` : `OSM / OSRM · ${r.km} км`
  }
  return `По прямой × 1,25 · ${r.km} км`
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
  const key = routeKey(order)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')
  const [last, setLast] = useState<DrivingKmResult | null>(null)
  const kmLockedFor = useRef<string | null>(null)
  const openedOn = useRef(key)
  const openedKm = useRef(order.distanceKm)
  const onChangeRef = useRef(onChange)
  const requestGen = useRef(0)
  onChangeRef.current = onChange

  async function applyRouteKm(force: boolean) {
    if (!order.fromCity.trim() || !order.toCity.trim()) {
      setHint('Укажите города погрузки и выгрузки — подставим км по дороге')
      return
    }
    const mine = ++requestGen.current
    setBusy(true)
    setHint('Считаем километраж по дороге…')
    try {
      const result = await lookupDrivingKm(order.fromCity, order.toCity, order.fromAddress, order.toAddress)
      if (mine !== requestGen.current) return
      setLast(result)
      const sameOpen = key === openedOn.current && openedKm.current > 0
      const locked = kmLockedFor.current === key
      if (force || (!locked && !sameOpen)) {
        onChangeRef.current('distanceKm', result.km)
        openedKm.current = result.km
        openedOn.current = key
      }
      setHint(
        force || (!locked && !sameOpen)
          ? `${sourceLabel(result)}${result.error ? ` · ${result.error}` : ''}`
          : `${sourceLabel(result)} — в поле км оставлено ваше значение, нажмите «По карте», чтобы заменить`,
      )
    } catch {
      if (mine !== requestGen.current) return
      setHint('Карта недоступна. Можно ввести км вручную.')
    } finally {
      if (mine === requestGen.current) setBusy(false)
    }
  }

  useEffect(() => {
    if (!order.fromCity.trim() || !order.toCity.trim()) return
    const t = window.setTimeout(() => {
      void applyRouteKm(false)
    }, 700)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on route points only
  }, [key])

  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="font-serif text-xl">Себестоимость рейса</div>
        <p className="mt-1 text-xs text-[#6d614c]">
          Километраж подставляется с открытой карты OSM (Photon / Nominatim) и маршрута OSRM по пунктам погрузки и
          выгрузки. Формула: ЗП × км + «Платон» × км + расход 35 л / 100 км × цена литра.
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
              onChange={(e) => {
                kmLockedFor.current = key
                onChange('distanceKm', Number(e.target.value) || 0)
              }}
            />
          </div>
          <button
            type="button"
            className="mt-1 text-xs text-[#8a5a12] underline disabled:opacity-50"
            disabled={busy || !order.fromCity.trim() || !order.toCity.trim()}
            onClick={() => {
              kmLockedFor.current = null
              void applyRouteKm(true)
            }}
          >
            {busy ? 'Считаем маршрут…' : 'По карте (OSM / OSRM)'}
          </button>
          {hint && <p className="mt-1 text-xs leading-relaxed text-[#4a4336]">{hint}</p>}
          {(order.fromCity.trim() || order.toCity.trim()) && (
            <p className="mt-1 text-[11px] leading-relaxed text-[#6d614c]" title={[last?.fromLabel, last?.toLabel].filter(Boolean).join(' → ')}>
              {order.fromCity}
              {order.fromAddress.trim() ? `, ${order.fromAddress.trim()}` : ''} → {order.toCity}
              {order.toAddress.trim() ? `, ${order.toAddress.trim()}` : ''}
            </p>
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
