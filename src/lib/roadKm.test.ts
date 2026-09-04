import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { clearRoadKmCache, lookupDrivingKm } from './roadKm.ts'

const MOSCOW = { features: [{ geometry: { coordinates: [37.6173, 55.7558] }, properties: { name: 'Москва', city: 'Москва' } }] }
const KAZAN = { features: [{ geometry: { coordinates: [49.1221, 55.7879] }, properties: { name: 'Казань', city: 'Казань' } }] }
const OSRM = { code: 'Ok', routes: [{ distance: 834_450, duration: 28_800 }] }

afterEach(() => {
  clearRoadKmCache()
})

describe('lookupDrivingKm', () => {
  it('routes Moscow–Kazan via Photon + OSRM', async () => {
    const calls: string[] = []
    const prev = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('photon.komoot.io') && url.includes(encodeURIComponent('Москва'))) {
        return new Response(JSON.stringify(MOSCOW), { status: 200 })
      }
      if (url.includes('photon.komoot.io') && url.includes(encodeURIComponent('Казань'))) {
        return new Response(JSON.stringify(KAZAN), { status: 200 })
      }
      if (url.includes('router.project-osrm.org')) {
        return new Response(JSON.stringify(OSRM), { status: 200 })
      }
      return new Response('unexpected', { status: 500 })
    }) as typeof fetch

    try {
      const r = await lookupDrivingKm('Москва', 'Казань', 'терминал А', 'склад B')
      assert.equal(r.km, 834)
      assert.equal(r.source, 'osrm')
      assert.equal(r.durationMin, 480)
      assert.ok(calls.some((u) => u.includes('photon.komoot.io')))
      assert.ok(calls.some((u) => u.includes('router.project-osrm.org')))
      assert.ok(!calls.some((u) => u.includes('nominatim')))
    } finally {
      globalThis.fetch = prev
    }
  })

  it('falls back to haversine estimate when geocoders fail', async () => {
    const prev = globalThis.fetch
    globalThis.fetch = (async () => new Response('no', { status: 503 })) as typeof fetch
    try {
      const r = await lookupDrivingKm('Москва', 'Казань')
      assert.equal(r.source, 'estimate')
      assert.ok(r.km > 700 && r.km < 1000, String(r.km))
      assert.match(r.error ?? '', /не нашли|прямой/i)
    } finally {
      globalThis.fetch = prev
    }
  })

  it('falls back to Nominatim when Photon is empty', async () => {
    const prev = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('photon.komoot.io')) {
        return new Response(JSON.stringify({ features: [] }), { status: 200 })
      }
      if (url.includes('nominatim.openstreetmap.org') && url.includes(encodeURIComponent('Москва'))) {
        return new Response(JSON.stringify([{ lat: '55.7558', lon: '37.6173', display_name: 'Москва' }]), {
          status: 200,
        })
      }
      if (url.includes('nominatim.openstreetmap.org') && url.includes(encodeURIComponent('Казань'))) {
        return new Response(JSON.stringify([{ lat: '55.7879', lon: '49.1221', display_name: 'Казань' }]), {
          status: 200,
        })
      }
      if (url.includes('router.project-osrm.org')) {
        return new Response(JSON.stringify(OSRM), { status: 200 })
      }
      return new Response('no', { status: 404 })
    }) as typeof fetch
    try {
      const r = await lookupDrivingKm('Москва', 'Казань')
      assert.equal(r.km, 834)
      assert.equal(r.source, 'osrm')
    } finally {
      globalThis.fetch = prev
    }
  })

  it('asks for both cities', async () => {
    const r = await lookupDrivingKm('', 'Казань')
    assert.equal(r.source, 'estimate')
    assert.match(r.error ?? '', /Укажите города/)
  })

  it('reuses cached geocode and route', async () => {
    let photon = 0
    let osrm = 0
    const prev = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('photon.komoot.io')) {
        photon += 1
        const body = url.includes(encodeURIComponent('Казань')) ? KAZAN : MOSCOW
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (url.includes('router.project-osrm.org')) {
        osrm += 1
        return new Response(JSON.stringify(OSRM), { status: 200 })
      }
      return new Response('no', { status: 404 })
    }) as typeof fetch
    try {
      const a = await lookupDrivingKm('Москва', 'Казань')
      const b = await lookupDrivingKm('Москва', 'Казань')
      assert.equal(a.km, 834)
      assert.equal(b.source, 'cache')
      assert.equal(b.km, 834)
      assert.equal(photon, 2)
      assert.equal(osrm, 1)
    } finally {
      globalThis.fetch = prev
    }
  })
})
