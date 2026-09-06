import { rubToKop } from './money'

/** Default diesel burn for a loaded truck, as requested. */
export const DEFAULT_FUEL_L_PER_100 = 35

/** Typical own-fleet driver pay, ₽/km (from the trip-cost calculator). */
export const DEFAULT_DRIVER_PAY_RUB_KM = 16.5

/** Platon tariff placeholder, ₽/km — editable per trip. */
export const DEFAULT_PLATON_RUB_KM = 2.92

/** Diesel price placeholder, ₽/L. */
export const DEFAULT_FUEL_RUB_L = 68

export type TripCostInput = {
  distanceKm: number
  driverPayPerKmKop: number
  platonPerKmKop: number
  fuelLitersPer100: number
  fuelPricePerLiterKop: number
}

export type TripCost = {
  liters: number
  salaryKop: number
  platonKop: number
  fuelKop: number
  totalKop: number
}

export function calcTripCost(input: TripCostInput): TripCost {
  const km = Number.isFinite(input.distanceKm) ? Math.max(0, input.distanceKm) : 0
  const burn = Number.isFinite(input.fuelLitersPer100) ? Math.max(0, input.fuelLitersPer100) : 0
  const liters = (km / 100) * burn
  const salaryKop = Math.round(km * (input.driverPayPerKmKop || 0))
  const platonKop = Math.round(km * (input.platonPerKmKop || 0))
  const fuelKop = Math.round(liters * (input.fuelPricePerLiterKop || 0))
  return {
    liters,
    salaryKop,
    platonKop,
    fuelKop,
    totalKop: salaryKop + platonKop + fuelKop,
  }
}

export const TRIP_COST_DEFAULTS = {
  driverPayPerKmKop: rubToKop(DEFAULT_DRIVER_PAY_RUB_KM),
  platonPerKmKop: rubToKop(DEFAULT_PLATON_RUB_KM),
  fuelLitersPer100: DEFAULT_FUEL_L_PER_100,
  fuelPricePerLiterKop: rubToKop(DEFAULT_FUEL_RUB_L),
}

/** Approximate city coordinates for road-km estimate (×1.25 vs great-circle). */
const CITY_LL: Record<string, [number, number]> = {
  Москва: [55.75, 37.62],
  'Санкт-Петербург': [59.93, 30.32],
  Казань: [55.79, 49.12],
  'Нижний Новгород': [56.33, 44.01],
  Екатеринбург: [56.84, 60.61],
  Самара: [53.2, 50.15],
  'Ростов-на-Дону': [47.23, 39.7],
  Новосибирск: [55.03, 82.92],
  Краснодар: [45.04, 38.98],
  Воронеж: [51.66, 39.2],
  Пермь: [58.01, 56.23],
  Уфа: [54.73, 55.97],
  Тула: [54.2, 37.62],
  Ярославль: [57.63, 39.89],
  Тверь: [56.86, 35.92],
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)))
}

export function estimateRoadKm(fromCity: string, toCity: string): number {
  const a = CITY_LL[fromCity.trim()]
  const b = CITY_LL[toCity.trim()]
  if (!a || !b || fromCity.trim() === toCity.trim()) return 0
  return Math.round(haversineKm(a, b) * 1.25)
}

export function formatLiters(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 л'
  const rounded = Math.round(n * 10) / 10
  return `${String(rounded).replace('.', ',')} л`
}
