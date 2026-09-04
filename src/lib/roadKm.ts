import { estimateRoadKm } from './tripCost'

export type KmSource = 'osrm' | 'estimate' | 'cache'

export type DrivingKmResult = {
  km: number
  source: KmSource
  durationMin?: number
  fromLabel?: string
  toLabel?: string
  error?: string
}

type LonLat = { lon: number; lat: number; label: string }

const geocodeCache = new Map<string, LonLat>()
const routeCache = new Map<string, DrivingKmResult>()

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const PHOTON = 'https://photon.komoot.io/api'
const OSRM = 'https://router.project-osrm.org/route/v1/driving'

let lastNominatimAt = 0

function roundKm(meters: number): number {
  return Math.max(1, Math.round(meters / 1000))
}

function queryKey(city: string, address: string): string {
  return `${city.trim().toLowerCase()}|${address.trim().toLowerCase()}`
}

function routeKey(from: LonLat, to: LonLat): string {
  const r = (n: number) => n.toFixed(5)
  return `${r(from.lon)},${r(from.lat)}->${r(to.lon)},${r(to.lat)}`
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

export async function osrmDrivingKm(from: LonLat, to: LonLat): Promise<{ km: number; durationMin: number } | null> {
  const url = `${OSRM}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false&alternatives=false`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    code?: string
    routes?: Array<{ distance: number; duration: number }>
  }
  if (data.code && data.code !== 'Ok') return null
  const route = data.routes?.[0]
  if (!route || !Number.isFinite(route.distance)) return null
  return { km: roundKm(route.distance), durationMin: Math.round(route.duration / 60) }
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

  try {
    const routed = await osrmDrivingKm(from, to)
    if (routed) {
      const result: DrivingKmResult = {
        km: routed.km,
        source: 'osrm',
        durationMin: routed.durationMin,
        fromLabel: from.label,
        toLabel: to.label,
      }
      routeCache.set(rk, result)
      return result
    }
  } catch {
    /* сеть OSRM */
  }

  return {
    km: estimate,
    source: 'estimate',
    fromLabel: from.label,
    toLabel: to.label,
    error: 'Маршрутизатор недоступен — км по прямой × 1,25',
  }
}

export function clearRoadKmCache() {
  geocodeCache.clear()
  routeCache.clear()
}
