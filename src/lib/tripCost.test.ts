import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calcTripCost, estimateRoadKm, DEFAULT_FUEL_L_PER_100 } from './tripCost.ts'
import { rubToKop } from './money.ts'

describe('tripCost', () => {
  it('uses 35 L/100 km × liter price + salary and Platon per km', () => {
    const c = calcTripCost({
      distanceKm: 1000,
      driverPayPerKmKop: rubToKop(16.5),
      platonPerKmKop: rubToKop(2.92),
      fuelLitersPer100: DEFAULT_FUEL_L_PER_100,
      fuelPricePerLiterKop: rubToKop(68),
    })
    assert.equal(c.liters, 350)
    assert.equal(c.salaryKop, 1_650_000)
    assert.equal(c.platonKop, 292_000)
    assert.equal(c.fuelKop, 2_380_000)
    assert.equal(c.totalKop, 1_650_000 + 292_000 + 2_380_000)
  })

  it('stays at zero without distance', () => {
    const c = calcTripCost({
      distanceKm: 0,
      driverPayPerKmKop: 1650,
      platonPerKmKop: 292,
      fuelLitersPer100: 35,
      fuelPricePerLiterKop: 6800,
    })
    assert.equal(c.totalKop, 0)
  })

  it('estimates Moscow–Kazan road km', () => {
    const km = estimateRoadKm('Москва', 'Казань')
    assert.ok(km > 700 && km < 1000, String(km))
  })
})
