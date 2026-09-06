import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSeed } from '../data/seed.ts'
import { mergePersisted } from '../store.tsx'

describe('mergePersisted', () => {
  it('keeps an empty journal after a wipe instead of restoring the demo seed', () => {
    const seed = createSeed()
    const merged = mergePersisted(seed, {
      session: { userId: seed.users[0]!.id },
      parties: seed.parties.filter((p) => p.kind === 'own'),
      vehicles: [],
      drivers: [],
      orders: [],
      settings: seed.settings,
    })
    assert.equal(merged.orders.length, 0)
    assert.equal(merged.vehicles.length, 0)
    assert.equal(merged.drivers.length, 0)
    assert.ok(merged.parties.every((p) => p.kind === 'own'))
    assert.ok(merged.parties.length >= 1)
  })

  it('still uses the seed journal when the saved blob has no orders key', () => {
    const seed = createSeed()
    const merged = mergePersisted(seed, { settings: seed.settings })
    assert.equal(merged.orders.length, seed.orders.length)
  })
})
