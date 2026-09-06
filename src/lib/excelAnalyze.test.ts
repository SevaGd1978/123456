import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeExcelWorkbook } from './excelAnalyze.ts'
import { buildExcelWorkbook, workbookToArrayBuffer } from './excelIo.ts'
import { TRIP_COST_DEFAULTS } from './tripCost.ts'
import type { AppState, Party } from '../types.ts'

const settings: AppState['settings'] = {
  companyId: 'own-1',
  exchangePrefix: 'TT',
  defaultVat: 22,
  defaultDriverPayPerKmKop: TRIP_COST_DEFAULTS.driverPayPerKmKop,
  defaultPlatonPerKmKop: TRIP_COST_DEFAULTS.platonPerKmKop,
  defaultFuelLitersPer100: TRIP_COST_DEFAULTS.fuelLitersPer100,
  defaultFuelPricePerLiterKop: TRIP_COST_DEFAULTS.fuelPricePerLiterKop,
  dadataToken: '',
}

describe('excelAnalyze', () => {
  it('summarizes trips and clients from a workbook without needing the live store', () => {
    const client: Party = {
      id: 'cl-1',
      kind: 'client',
      name: 'ООО Анализ',
      inn: '7707083893',
      kpp: '',
      legalForm: 'ooo',
      phone: '',
      email: '',
      city: 'Москва',
      address: '',
      contact: '',
      bankBik: '',
      bankAccount: '',
      edoId: '',
      epdId: '',
      notes: '',
    }
    const wb = buildExcelWorkbook({
      parties: [client],
      vehicles: [],
      drivers: [],
      orders: [
        {
          id: 'ord-1',
          number: 'РО-А-1',
          createdAt: '2026-09-01',
          loadingDate: '2026-09-02',
          deliveryDate: '2026-09-03',
          paymentDueDate: '2026-09-12',
          status: 'confirmed',
          clientId: 'cl-1',
          carrierId: '',
          shipperId: '',
          consigneeId: '',
          vehicleId: '',
          driverId: '',
          cargo: 'Паллеты',
          packingCode: '',
          weightValue: 10,
          weightUnit: 't',
          volumeM3: 40,
          fromCity: 'Москва',
          fromAddress: '',
          fromContactFirstName: '',
          fromContactLastName: '',
          fromContactPhone: '',
          toCity: 'Казань',
          toAddress: '',
          toContactFirstName: '',
          toContactLastName: '',
          toContactPhone: '',
          distanceKm: 845,
          driverPayPerKmKop: 1650,
          platonPerKmKop: 292,
          fuelLitersPer100: 35,
          fuelPricePerLiterKop: 6800,
          clientRateKop: 10_000_000,
          carrierRateKop: 8_000_000,
          extraExpenseKop: 0,
          vatRate: 22,
          source: 'excel',
          notes: '',
        },
      ],
    })
    const analysis = analyzeExcelWorkbook(workbookToArrayBuffer(wb), settings)
    assert.ok(analysis.sheets.some((s) => s.name === 'Рейсы' && s.rows === 1))
    assert.equal(analysis.totals.trips, 1)
    assert.equal(analysis.totals.km, 845)
    assert.equal(analysis.totals.revenueKop, 10_000_000)
    assert.equal(analysis.totals.marginKop, 2_000_000)
    assert.equal(analysis.byClient[0]?.name, 'ООО Анализ')
    assert.equal(analysis.byRoute[0]?.name, 'Москва → Казань')
  })
})
