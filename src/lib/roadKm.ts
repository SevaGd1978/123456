import { estimateRoadKm } from './tripCost'

export type KmSource = 'truck' | 'estimate' | 'cache'

export type DrivingKmResult = {
  km: number
  source: KmSource
  durationMin?: number
  fromLabel?: string
  toLabel?: string
  error?: string
}

type LonLat = { lon: number; lat: number; label: string }

/** Typical eurotruck / фура used for HGV costing (meters, metric tons). */
export const TRUCK = {
  height: 4,
  width: 2.55,
  length: 16.5,
  weight: 20,
  axle_count: 5,
  /** Prefer OSM `hgv=designated`; still never uses the car profile. */
  use_truck_route: 1,
} as const

const geocodeCache = new Map<string, LonLat>()
const routeCache = new Map<string, DrivingKmResult>()

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const PHOTON = 'https://photon.komoot.io/api'
const VALHALLA = 'https://valhalla1.openstreetmap.de/route'

/** Public Valhalla rejects legs whose air distance is above 1500 km. */
const MAX_AIR_KM = 1450

/** Highway hubs to split long truck legs without switching to a car router. */
const HUBS: LonLat[] = [
  { label: 'Москва', lat: 55.75, lon: 37.62 },
  { label: 'Санкт-Петербург', lat: 59.93, lon: 30.32 },
  { label: 'Казань', lat: 55.79, lon: 49.12 },
  { label: 'Нижний Новгород', lat: 56.33, lon: 44.01 },
  { label: 'Екатеринбург', lat: 56.84, lon: 60.61 },
  { label: 'Самара', lat: 53.2, lon: 50.15 },
  { label: 'Ростов-на-Дону', lat: 47.23, lon: 39.7 },
  { label: 'Новосибирск', lat: 55.03, lon: 82.92 },
  { label: 'Краснодар', lat: 45.04, lon: 38.98 },
  { label: 'Воронеж', lat: 51.66, lon: 39.2 },
  { label: 'Пермь', lat: 58.01, lon: 56.23 },
  { label: 'Уфа', lat: 54.73, lon: 55.97 },
  { label: 'Тула', lat: 54.2, lon: 37.62 },
  { label: 'Ярославль', lat: 57.63, lon: 39.89 },
  { label: 'Тверь', lat: 56.86, lon: 35.92 },
  { label: 'Вологда', lat: 59.22, lon: 39.89 },
  { label: 'Киров', lat: 58.6, lon: 49.66 },
  { label: 'Череповец', lat: 59.13, lon: 37.91 },
  { label: 'Кострома', lat: 57.77, lon: 40.93 },
  { label: 'Ижевск', lat: 56.85, lon: 53.2 },
  { label: 'Чебоксары', lat: 56.14, lon: 47.25 },
  { label: 'Челябинск', lat: 55.16, lon: 61.4 },
  { label: 'Владимир', lat: 56.13, lon: 40.41 },
  { label: 'Рязань', lat: 54.63, lon: 39.74 },
  { label: 'Пенза', lat: 53.2, lon: 45.0 },
  { label: 'Омск', lat: 54.99, lon: 73.37 },
  { label: 'Тюмень', lat: 57.15, lon: 65.53 },
  { label: 'Саратов', lat: 51.53, lon: 46.03 },
  { label: 'Волгоград', lat: 48.71, lon: 44.51 },
  { label: 'Оренбург', lat: 51.77, lon: 55.1 },
]

let lastNominatimAt = 0

function roundKm(n: number): number {
  return Math.max(1, Math.round(n))
}

function queryKey(city: string, address: string): string {
  return `${city.trim().toLowerCase()}|${address.trim().toLowerCase()}`
}

function routeKey(from: LonLat, to: LonLat): string {
  const r = (n: number) => n.toFixed(5)
  return `truck:${r(from.lon)},${r(from.lat)}->${r(to.lon)},${r(to.lat)}`
}

function haversineKm(a: LonLat, b: LonLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)))
}

function projectT(a: LonLat, b: LonLat, p: LonLat): number {
  const vx = b.lon - a.lon
  const vy = b.lat - a.lat
  const den = vx * vx + vy * vy
  if (den < 1e-12) return 0
  return ((p.lon - a.lon) * vx + (p.lat - a.lat) * vy) / den
}

function interpolate(a: LonLat, b: LonLat, t: number): LonLat {
  return {
    lon: a.lon + (b.lon - a.lon) * t,
    lat: a.lat + (b.lat - a.lat) * t,
    label: 'via',
  }
}

export function truckViaPoints(from: LonLat, to: LonLat): LonLat[] {
  if (haversineKm(from, to) <= MAX_AIR_KM) return [from, to]
  const direct = haversineKm(from, to)
  const hubs = HUBS.filter((h) => {
    const t = projectT(from, to, h)
    if (t <= 0.12 || t >= 0.88) return false
    const extra = haversineKm(from, h) + haversineKm(h, to) - direct
    return extra < 200
  }).sort((x, y) => projectT(from, to, x) - projectT(from, to, y))

  const path: LonLat[] = [from]
  const dest = to
  let guard = 0
  while (haversineKm(path[path.length - 1], dest) > MAX_AIR_KM && guard++ < 8) {
    const last = path[path.length - 1]
    const tLast = projectT(from, dest, last)
    const candidates = hubs.filter((h) => {
      const t = projectT(from, dest, h)
      return t > tLast + 0.04 && haversineKm(last, h) <= MAX_AIR_KM && haversineKm(h, dest) < haversineKm(last, dest) - 30
    })
    if (candidates.length) {
      path.push(candidates.reduce((best, h) => (projectT(from, dest, h) > projectT(from, dest, best) ? h : best)))
    } else {
      const hop = haversineKm(last, dest)
      path.push(interpolate(last, dest, Math.min(0.92, MAX_AIR_KM / hop)))
    }
  }
  path.push(dest)
  return path
}

async function nominatimPause() {
  const wait = 1100 - (Date.now() - lastNominatimAt)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastNominatimAt = Date.now()
}

async function geocodePhoton(q: string): Promise<LonLat | null> {
  const url = `${PHOTON}/?q=${encodeURIComponent(q)}&limit=1`
  const res = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'ru' } })
  if (!res.ok) return null
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: number[] }
      properties?: { name?: string; city?: string; street?: string; country?: string }
    }>
  }
  const f = data.features?.[0]
  const coords = f?.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lon, lat] = coords
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  const p = f.properties ?? {}
  const label = [p.street, p.name, p.city, p.country].filter(Boolean).join(', ') || q
  return { lon, lat, label }
}

async function geocodeNominatim(q: string): Promise<LonLat | null> {
  await nominatimPause()
  const url = `${NOMINATIM}?format=jsonv2&limit=1&addressdetails=0&countrycodes=ru&q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Language': 'ru' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>
  const hit = data[0]
  if (!hit) return null
  const lon = Number(hit.lon)
  const lat = Number(hit.lat)
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  return { lon, lat, label: hit.display_name ?? q }
}

export async function geocodePlace(city: string, address = ''): Promise<LonLat | null> {
  const cityTrim = city.trim()
  const addrTrim = address.trim()
  if (!cityTrim && !addrTrim) return null
  const key = queryKey(cityTrim, addrTrim)
  const cached = geocodeCache.get(key)
  if (cached) return cached

  const queries = addrTrim
    ? [`${addrTrim}, ${cityTrim}, Россия`, `${cityTrim}, Россия`]
    : [`${cityTrim}, Россия`, cityTrim]

  for (const q of queries) {
    try {
      const photon = await geocodePhoton(q)
      if (photon) {
        geocodeCache.set(key, photon)
        return photon
      }
    } catch {
      /* сеть Photon */
    }
    try {
      const nom = await geocodeNominatim(q)
      if (nom) {
        geocodeCache.set(key, nom)
        return nom
      }
    } catch {
      /* сеть Nominatim */
    }
  }
  return null
}

type TruckLeg = { km: number; durationMin: number }

function parseValhalla(data: {
  trip?: { summary?: { length?: number; time?: number } }
  error_code?: number
}): TruckLeg | { errorCode: number } | null {
  if (data.error_code) return { errorCode: data.error_code }
  const summary = data.trip?.summary
  const length = summary?.length
  if (!summary || typeof length !== 'number' || !Number.isFinite(length)) return null
  return {
    km: roundKm(length),
    durationMin: Math.round((summary.time ?? 0) / 60),
  }
}

async function valhallaTruckLeg(from: LonLat, to: LonLat, designatedOnly: boolean): Promise<TruckLeg | { errorCode: number } | null> {
  const truck = designatedOnly ? { ...TRUCK } : { ...TRUCK, use_truck_route: 0 }
  const body = {
    locations: [
      { lat: from.lat, lon: from.lon },
      { lat: to.lat, lon: to.lon },
    ],
    costing: 'truck',
    units: 'kilometers',
    directions_type: 'none',
    costing_options: { truck },
  }
  const res = await fetch(VALHALLA, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as Parameters<typeof parseValhalla>[0]
  return parseValhalla(data)
}

async function truckLeg(from: LonLat, to: LonLat): Promise<TruckLeg | null> {
  try {
    const designated = await valhallaTruckLeg(from, to, true)
    if (designated && 'km' in designated) return designated
  } catch {
    /* сеть Valhalla */
  }
  try {
    const anyHgv = await valhallaTruckLeg(from, to, false)
    if (anyHgv && 'km' in anyHgv) return anyHgv
  } catch {
    /* повтор без designated */
  }
  return null
}

export async function truckRouteKm(from: LonLat, to: LonLat): Promise<TruckLeg | null> {
  const points = truckViaPoints(from, to)
  let km = 0
  let durationMin = 0
  for (let i = 0; i < points.length - 1; i++) {
    const leg = await truckLeg(points[i], points[i + 1])
    if (!leg) return null
    km += leg.km
    durationMin += leg.durationMin
  }
  return { km: roundKm(km), durationMin }
}

export async function lookupDrivingKm(
  fromCity: string,
  toCity: string,
  fromAddress = '',
  toAddress = '',
): Promise<DrivingKmResult> {
  const estimate = estimateRoadKm(fromCity, toCity) || 1
  if (!fromCity.trim() || !toCity.trim()) {
    return { km: estimate, source: 'estimate', error: 'Укажите города погрузки и выгрузки' }
  }

  const from = await geocodePlace(fromCity, fromAddress)
  const to = await geocodePlace(toCity, toAddress)
  if (!from || !to) {
    return {
      km: estimate,
      source: 'estimate',
      fromLabel: from?.label,
      toLabel: to?.label,
      error: 'Точку не нашли на карте — км по прямой × 1,25',
    }
  }

  const rk = routeKey(from, to)
  const cached = routeCache.get(rk)
  if (cached) return { ...cached, source: 'cache' }

  const routed = await truckRouteKm(from, to)
  if (routed) {
    const result: DrivingKmResult = {
      km: routed.km,
      source: 'truck',
      durationMin: routed.durationMin,
      fromLabel: from.label,
      toLabel: to.label,
    }
    routeCache.set(rk, result)
    return result
  }

  return {
    km: estimate,
    source: 'estimate',
    fromLabel: from.label,
    toLabel: to.label,
    error: 'Грузовой маршрутизатор недоступен — км по прямой × 1,25',
  }
}

export function clearRoadKmCache() {
  geocodeCache.clear()
  routeCache.clear()
}
