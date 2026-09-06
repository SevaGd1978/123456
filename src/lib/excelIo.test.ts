import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as XLSX from 'xlsx'
import { buildExcelWorkbook, parseExcelWorkbook, workbookToArrayBuffer } from './excelIo.ts'
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

const empty = {
  parties: [] as Party[],
  vehicles: [],
  drivers: [],
  orders: [],
  settings,
}

describe('excelIo', () => {
  it('roundtrips counterparties and trips through xlsx', () => {
    const wb = buildExcelWorkbook({
      parties: [
        {
          id: 'cl-1',
          kind: 'client',
          name: 'ООО Тест',
          inn: '7707083893',
          kpp: '773601001',
          legalForm: 'ooo',
          phone: '+7 495 000-00-00',
          email: 'a@b.ru',
          city: 'Москва',
          address: 'ул. Тестовая, 1',
          contact: 'Иванов',
          bankBik: '044525225',
          bankAccount: '40702810900000000001',
          edoId: '2BM-1',
          epdId: 'EPD-1',
          notes: '',
        },
      ],
      vehicles: [],
      drivers: [],
      orders: [
        {
          id: 'ord-1',
          number: 'РО-100',
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
          packingCode: '4A',
          weightValue: 12,
          weightUnit: 't',
          volumeM3: 40,
          fromCity: 'Москва',
          fromAddress: 'терминал А',
          fromContactFirstName: 'Иван',
          fromContactLastName: 'Иванов',
          fromContactPhone: '+7 900 111-22-33',
          toCity: 'Казань',
          toAddress: 'склад B',
          toContactFirstName: 'Ольга',
          toContactLastName: 'Петрова',
          toContactPhone: '+7 900 444-55-66',
          distanceKm: 845,
          driverPayPerKmKop: 1650,
          platonPerKmKop: 292,
          fuelLitersPer100: 35,
          fuelPricePerLiterKop: 6800,
          clientRateKop: 10000000,
          carrierRateKop: 8000000,
          extraExpenseKop: 0,
          vatRate: 22,
          source: 'вручную',
          notes: 'срочно',
        },
      ],
    })
    const buf = workbookToArrayBuffer(wb)
    const parsed = parseExcelWorkbook(buf, empty)
    assert.equal(parsed.counts.parties, 1)
    assert.equal(parsed.counts.orders, 1)
    assert.equal(parsed.parties[0]?.name, 'ООО Тест')
    assert.equal(parsed.parties[0]?.inn, '7707083893')
    const order = parsed.orders[0]
    assert.equal(order?.number, 'РО-100')
    assert.equal(order?.fromCity, 'Москва')
    assert.equal(order?.toCity, 'Казань')
    assert.equal(order?.fromContactFirstName, 'Иван')
    assert.equal(order?.fromContactLastName, 'Иванов')
    assert.equal(order?.fromContactPhone, '+7 900 111-22-33')
    assert.equal(order?.toContactFirstName, 'Ольга')
    assert.equal(order?.toContactLastName, 'Петрова')
    assert.equal(order?.toContactPhone, '+7 900 444-55-66')
    assert.equal(order?.distanceKm, 845)
    assert.equal(order?.clientRateKop, 10_000_000)
    assert.equal(order?.status, 'confirmed')
    assert.equal(order?.clientId, parsed.parties[0]?.id)
  })

  it('updates an existing party by INN instead of duplicating', () => {
    const existing: Party = {
      id: 'keep',
      kind: 'client',
      name: 'Старое имя',
      inn: '7707083893',
      kpp: '',
      legalForm: 'ooo',
      phone: '',
      email: '',
      city: 'Тверь',
      address: '',
      contact: '',
      bankBik: '',
      bankAccount: '',
      edoId: '',
      epdId: '',
      notes: '',
    }
    const wb = buildExcelWorkbook({
      parties: [{ ...existing, name: 'Новое имя', city: 'Казань' }],
      vehicles: [],
      drivers: [],
      orders: [],
    })
    const parsed = parseExcelWorkbook(workbookToArrayBuffer(wb), { ...empty, parties: [existing] })
    assert.equal(parsed.counts.parties, 0)
    assert.equal(parsed.parties.length, 1)
    assert.equal(parsed.parties[0]?.id, 'keep')
    assert.equal(parsed.parties[0]?.name, 'Новое имя')
    assert.equal(parsed.parties[0]?.city, 'Казань')
  })

  it('writes column headers on an empty template', () => {
    const wb = buildExcelWorkbook({ parties: [], vehicles: [], drivers: [], orders: [] })
    assert.deepEqual(wb.SheetNames, ['Контрагенты', 'ТС', 'Водители', 'Рейсы'])
    const header = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Контрагенты']!, { header: 1 })[0]
    assert.ok(header?.includes('Наименование'))
    assert.ok(header?.includes('ИНН'))
    const trips = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Рейсы']!, { header: 1 })[0]
    assert.ok(trips?.includes('Откуда'))
    assert.ok(trips?.includes('Куда'))
  })
})
