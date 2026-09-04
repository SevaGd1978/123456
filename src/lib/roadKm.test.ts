import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { clearRoadKmCache, lookupDrivingKm, truckViaPoints } from './roadKm.ts'

const MOSCOW = { features: [{ geometry: { coordinates: [37.6173, 55.7558] }, properties: { name: 'Москва', city: 'Москва' } }] }
const KAZAN = { features: [{ geometry: { coordinates: [49.1221, 55.7879] }, properties: { name: 'Казань', city: 'Казань' } }] }
const TRUCK_TRIP = { trip: { summary: { length: 823.025, time: 28_800 } } }

afterEach(() => {
  clearRoadKmCache()
})

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const prev = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)) as typeof fetch
  return () => {
    globalThis.fetch = prev
  }
}

describe('lookupDrivingKm', () => {
  it('routes Moscow–Kazan as a truck, not a car', async () => {
    const bodies: unknown[] = []
    const restore = mockFetch((url, init) => {
      if (url.includes('photon.komoot.io') && url.includes(encodeURIComponent('Москва'))) {
        return new Response(JSON.stringify(MOSCOW), { status: 200 })
      }
      if (url.includes('photon.komoot.io') && url.includes(encodeURIComponent('Казань'))) {
        return new Response(JSON.stringify(KAZAN), { status: 200 })
      }
      if (url.includes('valhalla1.openstreetmap.de')) {
        bodies.push(JSON.parse(String(init?.body ?? '{}')))
        return new Response(JSON.stringify(TRUCK_TRIP), { status: 200 })
      }
      return new Response('unexpected', { status: 500 })
    })
    try {
      const r = await lookupDrivingKm('Москва', 'Казань', 'терминал А', 'склад B')
      assert.equal(r.km, 823)
      assert.equal(r.source, 'truck')
      assert.equal(r.durationMin, 480)
      assert.equal(bodies.length, 1)
      const req = bodies[0] as { costing: string; costing_options: { truck: { use_truck_route: number; height: number } } }
      assert.equal(req.costing, 'truck')
      assert.equal(req.costing_options.truck.use_truck_route, 1)
      assert.equal(req.costing_options.truck.height, 4)
    } finally {
      restore()
    }
  })

  it('falls back to haversine estimate when geocoders fail', async () => {
    const restore = mockFetch(() => new Response('no', { status: 503 }))
    try {
      const r = await lookupDrivingKm('Москва', 'Казань')
      assert.equal(r.source, 'estimate')
      assert.ok(r.km > 700 && r.km < 1000, String(r.km))
      assert.match(r.error ?? '', /не нашли|прямой/i)
    } finally {
      restore()
    }
  })

  it('falls back to Nominatim when Photon is empty, then still uses truck costing', async () => {
    const restore = mockFetch((url, init) => {
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
      if (url.includes('valhalla1.openstreetmap.de')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { costing: string }
        assert.equal(body.costing, 'truck')
        return new Response(JSON.stringify(TRUCK_TRIP), { status: 200 })
      }
      return new Response('no', { status: 404 })
    })
    try {
      const r = await lookupDrivingKm('Москва', 'Казань')
      assert.equal(r.km, 823)
      assert.equal(r.source, 'truck')
    } finally {
      restore()
    }
  })

  it('asks for both cities', async () => {
    const r = await lookupDrivingKm('', 'Казань')
    assert.equal(r.source, 'estimate')
    assert.match(r.error ?? '', /Укажите города/)
  })

  it('retries truck costing without designated-only if the first leg fails', async () => {
    let truckCalls = 0
    const restore = mockFetch((url, init) => {
      if (url.includes('photon.komoot.io')) {
        const body = url.includes(encodeURIComponent('Казань')) ? KAZAN : MOSCOW
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (url.includes('valhalla1.openstreetmap.de')) {
        truckCalls += 1
        const body = JSON.parse(String(init?.body ?? '{}')) as { costing_options: { truck: { use_truck_route: number } } }
        if (body.costing_options.truck.use_truck_route === 1) {
          return new Response(JSON.stringify({ error_code: 442, error: 'No path' }), { status: 400 })
        }
        return new Response(JSON.stringify(TRUCK_TRIP), { status: 200 })
      }
      return new Response('no', { status: 404 })
    })
    try {
      const r = await lookupDrivingKm('Москва', 'Казань')
      assert.equal(r.source, 'truck')
      assert.equal(r.km, 823)
      assert.equal(truckCalls, 2)
    } finally {
      restore()
    }
  })

  it('reuses cached truck route', async () => {
    let photon = 0
    let truck = 0
    const restore = mockFetch((url) => {
      if (url.includes('photon.komoot.io')) {
        photon += 1
        const body = url.includes(encodeURIComponent('Казань')) ? KAZAN : MOSCOW
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (url.includes('valhalla1.openstreetmap.de')) {
        truck += 1
        return new Response(JSON.stringify(TRUCK_TRIP), { status: 200 })
      }
      return new Response('no', { status: 404 })
    })
    try {
      const a = await lookupDrivingKm('Москва', 'Казань')
      const b = await lookupDrivingKm('Москва', 'Казань')
      assert.equal(a.km, 823)
      assert.equal(b.source, 'cache')
      assert.equal(b.km, 823)
      assert.equal(photon, 2)
      assert.equal(truck, 1)
    } finally {
      restore()
    }
  })

  it('does not call the car OSRM profile', async () => {
    const urls: string[] = []
    const restore = mockFetch((url) => {
      urls.push(url)
      if (url.includes('photon.komoot.io')) {
        const body = url.includes(encodeURIComponent('Казань')) ? KAZAN : MOSCOW
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (url.includes('valhalla')) return new Response(JSON.stringify(TRUCK_TRIP), { status: 200 })
      return new Response('no', { status: 404 })
    })
    try {
      await lookupDrivingKm('Москва', 'Казань')
      assert.ok(!urls.some((u) => u.includes('project-osrm') || u.includes('routed-car') || u.includes('/driving/')))
    } finally {
      restore()
    }
  })
})

describe('truckViaPoints', () => {
  it('inserts a highway hub when the air distance is above Valhalla’s cap', () => {
    const from = { lat: 59.93, lon: 30.32, label: 'СПб' }
    const to = { lat: 56.84, lon: 60.61, label: 'Екб' }
    const pts = truckViaPoints(from, to)
    assert.ok(pts.length >= 3, String(pts.map((p) => p.label)))
    assert.equal(pts[0].label, 'СПб')
    assert.equal(pts[pts.length - 1].label, 'Екб')
    const mid = pts.slice(1, -1).map((p) => p.label)
    assert.ok(
      mid.every((name) => name !== 'via' && name !== 'СПб' && name !== 'Екб'),
      String(mid),
    )
  })
})
