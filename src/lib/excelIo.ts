import * as XLSX from 'xlsx'
import type { AppState, Driver, Order, OrderStatus, Party, PartyKind, Vehicle, VatRate, WeightUnit } from '../types'
import { STATUS_LABEL } from './format'
import { parseRubInput } from './money'
import { blankParty } from './innLookup'
import { TRIP_COST_DEFAULTS } from './tripCost'
import { todayIso } from './format'

export type ExcelImportResult = {
  parties: Party[]
  vehicles: Vehicle[]
  drivers: Driver[]
  orders: Order[]
  warnings: string[]
  counts: { parties: number; vehicles: number; drivers: number; orders: number }
}

const PARTY_KIND: Record<string, PartyKind> = {
  клиент: 'client',
  client: 'client',
  заказчик: 'client',
  перевозчик: 'carrier',
  carrier: 'carrier',
  грузоотправитель: 'shipper',
  отправитель: 'shipper',
  shipper: 'shipper',
  грузополучатель: 'consignee',
  получатель: 'consignee',
  consignee: 'consignee',
  фирма: 'own',
  своя: 'own',
  own: 'own',
}

const STATUS_FROM: Record<string, OrderStatus> = Object.fromEntries([
  ...Object.entries(STATUS_LABEL).map(([k, v]) => [norm(v), k as OrderStatus]),
  ...Object.keys(STATUS_LABEL).map((k) => [norm(k), k as OrderStatus]),
])

function norm(s: string): string {
  return s.toLowerCase().replaceAll('ё', 'е').replace(/[^a-zа-я0-9]+/gi, '')
}

function sheetRows(wb: XLSX.WorkBook, names: string[]): Record<string, unknown>[] {
  const hit = wb.SheetNames.find((n) => names.some((want) => norm(n) === norm(want) || norm(n).includes(norm(want))))
  if (!hit) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[hit]!, { defval: '', raw: true })
}

function rawCell(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const map = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) map.set(norm(k), v)
  for (const a of aliases) {
    const v = map.get(norm(a))
    if (v != null && v !== '') return v
  }
  return ''
}

function cell(row: Record<string, unknown>, ...aliases: string[]): string {
  const v = rawCell(row, ...aliases)
  if (v == null || v === '') return ''
  return String(v).trim()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function excelDate(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = XLSX.SSF.parse_date_code(raw)
    if (d?.y) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`
  }
  const s = String(raw ?? '').trim()
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dot) return `${dot[3]}-${pad2(Number(dot[2]))}-${pad2(Number(dot[1]))}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

function moneyKop(raw: string): number {
  if (!raw) return 0
  return parseRubInput(raw)
}

function findParty(list: Party[], inn: string, name: string): Party | undefined {
  const innD = inn.replace(/\D/g, '')
  if (innD) {
    const byInn = list.find((p) => p.inn.replace(/\D/g, '') === innD)
    if (byInn) return byInn
  }
  const n = name.trim().toLowerCase()
  if (n) return list.find((p) => p.name.trim().toLowerCase() === n)
  return undefined
}

function uid(prefix: string, i: number): string {
  return `${prefix}-${Date.now().toString(36)}-${i}`
}

export function parseExcelWorkbook(data: ArrayBuffer, existing: Pick<AppState, 'parties' | 'vehicles' | 'drivers' | 'orders' | 'settings'>): ExcelImportResult {
  const wb = XLSX.read(data, { type: 'array', cellDates: false })
  const warnings: string[] = []
  const parties = [...existing.parties]
  const vehicles = [...existing.vehicles]
  const drivers = [...existing.drivers]
  const orders = [...existing.orders]
  let addedP = 0
  let addedV = 0
  let addedD = 0
  let addedO = 0

  const partyRows = sheetRows(wb, ['контрагенты', 'клиенты', 'parties', 'справочник'])
  partyRows.forEach((row, i) => {
    const name = cell(row, 'наименование', 'название', 'имя', 'name')
    const inn = cell(row, 'инн', 'inn').replace(/\D/g, '')
    if (!name && !inn) return
    const kindRaw = cell(row, 'вид', 'тип', 'роль', 'kind')
    const kind = PARTY_KIND[norm(kindRaw)] ?? 'client'
    const found = findParty(parties, inn, name)
    const base = found ?? { ...blankParty(kind), id: uid('p', i) }
    const next: Party = {
      ...base,
      kind: found?.kind === 'own' ? 'own' : kind,
      name: name || base.name,
      inn: inn || base.inn,
      kpp: cell(row, 'кпп', 'kpp') || base.kpp,
      legalForm: /ип|ip/.test(norm(cell(row, 'опф', 'форма', 'legalform'))) ? 'ip' : /ао|ao|пао/.test(norm(cell(row, 'опф', 'форма'))) ? 'ao' : 'ooo',
      phone: cell(row, 'телефон', 'phone', 'тел') || base.phone,
      email: cell(row, 'email', 'почта', 'элпочта') || base.email,
      city: cell(row, 'город', 'city') || base.city,
      address: cell(row, 'адрес', 'address') || base.address,
      contact: cell(row, 'контакт', 'контактноелицо') || base.contact,
      bankBik: cell(row, 'бик', 'bik') || base.bankBik,
      bankAccount: cell(row, 'счет', 'расчетныйсчет', 'account') || base.bankAccount,
      edoId: cell(row, 'эдо', 'edoid') || base.edoId,
      epdId: cell(row, 'эпд', 'epdid') || base.epdId,
      notes: cell(row, 'примечание', 'notes', 'комментарий') || base.notes,
    }
    if (found) {
      const idx = parties.findIndex((p) => p.id === found.id)
      parties[idx] = next
    } else {
      parties.unshift(next)
      addedP += 1
    }
  })

  const vehicleRows = sheetRows(wb, ['тс', 'транспорт', 'машины', 'vehicles'])
  vehicleRows.forEach((row, i) => {
    const plate = cell(row, 'номер', 'госномер', 'plate', 'тс').toUpperCase()
    if (!plate) return
    const carrierInn = cell(row, 'иннперевозчика', 'инн')
    const carrierName = cell(row, 'перевозчик', 'владелецперевозчик')
    const carrier = findParty(parties, carrierInn, carrierName)
    const found = vehicles.find((v) => v.plate.replace(/\s/g, '').toUpperCase() === plate.replace(/\s/g, ''))
    const next: Vehicle = {
      id: found?.id ?? uid('v', i),
      plate,
      brand: cell(row, 'марка', 'brand') || found?.brand || '',
      type: cell(row, 'тип', 'type') || found?.type || 'тент',
      capacityKg: Number(cell(row, 'грузоподъемностькг', 'кг', 'capacitykg')) || found?.capacityKg || 20000,
      volumeM3: Number(cell(row, 'объем', 'м3', 'volumem3').replace(',', '.')) || found?.volumeM3 || 82,
      sts: cell(row, 'стс', 'sts') || found?.sts || '',
      year: Number(cell(row, 'год', 'year')) || found?.year || new Date().getFullYear(),
      ownerName: cell(row, 'владелец', 'owner') || found?.ownerName || '',
      ownerPhone: cell(row, 'телефонвладельца', 'телефон') || found?.ownerPhone || '',
      trailerPlate: cell(row, 'прицеп', 'trailer') || found?.trailerPlate || '',
      status: /ремонт|repair/.test(norm(cell(row, 'статус'))) ? 'repair' : /занят|busy/.test(norm(cell(row, 'статус'))) ? 'busy' : 'free',
      carrierId: carrier?.id || found?.carrierId || '',
    }
    if (found) {
      const idx = vehicles.findIndex((v) => v.id === found.id)
      vehicles[idx] = next
    } else {
      vehicles.unshift(next)
      addedV += 1
    }
  })

  const driverRows = sheetRows(wb, ['водители', 'drivers'])
  driverRows.forEach((row, i) => {
    const name = cell(row, 'фио', 'имя', 'водитель', 'name')
    if (!name) return
    const license = cell(row, 'ву', 'права', 'удостоверение', 'license')
    const phone = cell(row, 'телефон', 'phone')
    const carrier = findParty(parties, cell(row, 'иннперевозчика'), cell(row, 'перевозчик'))
    const found = drivers.find(
      (d) => (license && d.license === license) || (d.name === name && (!phone || d.phone === phone)),
    )
    const next: Driver = {
      id: found?.id ?? uid('d', i),
      name,
      inn: cell(row, 'инн', 'inn') || found?.inn || '',
      license: license || found?.license || '',
      phone: phone || found?.phone || '',
      carrierId: carrier?.id || found?.carrierId || '',
    }
    if (found) {
      const idx = drivers.findIndex((d) => d.id === found.id)
      drivers[idx] = next
    } else {
      drivers.unshift(next)
      addedD += 1
    }
  })

  const orderRows = sheetRows(wb, ['рейсы', 'заказы', 'заявки', 'orders', 'журнал'])
  if (!partyRows.length && !vehicleRows.length && !driverRows.length && !orderRows.length && wb.SheetNames[0]) {
    const first = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]!, { defval: '', raw: true })
    if (first.length) warnings.push(`Лист «${wb.SheetNames[0]}» не узнали по имени — пробуем как рейсы`)
    orderRows.push(...first)
  }

  orderRows.forEach((row, i) => {
    const number = cell(row, 'номер', 'заявка', 'рейс', 'number')
    const fromCity = cell(row, 'откуда', 'городпогрузки', 'погрузкагород', 'from')
    const toCity = cell(row, 'куда', 'городвыгрузки', 'выгрузкагород', 'to')
    const cargo = cell(row, 'груз', 'наименованиегруза', 'cargo')
    if (!number && !fromCity && !toCity && !cargo) return

    const client = findParty(parties, cell(row, 'иннклиента', 'иннзаказчика'), cell(row, 'клиент', 'заказчик'))
    const carrier = findParty(parties, cell(row, 'иннперевозчика'), cell(row, 'перевозчик'))
    const shipper = findParty(parties, cell(row, 'иннотправителя'), cell(row, 'грузоотправитель', 'отправитель'))
    const consignee = findParty(parties, cell(row, 'иннполучателя'), cell(row, 'грузополучатель', 'получатель'))
    if (!client && cell(row, 'клиент', 'заказчик', 'иннклиента')) {
      warnings.push(`Строка ${i + 2}: клиент не найден — рейс ${number || 'без номера'}`)
    }

    const statusRaw = cell(row, 'статус', 'status')
    const status = STATUS_FROM[norm(statusRaw)] ?? 'draft'
    const weightUnit: WeightUnit = /кг|kg/.test(norm(cell(row, 'ед', 'единица', 'весединица'))) ? 'kg' : 't'
    const vatN = Number(cell(row, 'ндс', 'vat').replace('%', '').replace(',', '.'))
    const vatRate = ([0, 5, 7, 10, 20, 22] as VatRate[]).includes(vatN as VatRate) ? (vatN as VatRate) : existing.settings.defaultVat

    const plate = cell(row, 'тс', 'машина', 'госномер').replace(/\s/g, '').toUpperCase()
    const vehicle = vehicles.find((v) => v.plate.replace(/\s/g, '').toUpperCase() === plate)
    const driverName = cell(row, 'водитель', 'фиоводителя')
    const driver = drivers.find((d) => d.name === driverName)

    const found = number ? orders.find((o) => o.number === number) : undefined
    const base: Order =
      found ??
      ({
        id: uid('ord', i),
        number: '',
        createdAt: todayIso(),
        loadingDate: todayIso(),
        deliveryDate: todayIso(),
        paymentDueDate: todayIso(),
        status: 'draft',
        clientId: '',
        carrierId: '',
        shipperId: '',
        consigneeId: '',
        vehicleId: '',
        driverId: '',
        cargo: '',
        packingCode: '',
        weightValue: 0,
        weightUnit: 't',
        volumeM3: 0,
        fromCity: '',
        fromAddress: '',
        fromContactFirstName: '',
        fromContactLastName: '',
        fromContactPhone: '',
        toCity: '',
        toAddress: '',
        toContactFirstName: '',
        toContactLastName: '',
        toContactPhone: '',
        distanceKm: 0,
        driverPayPerKmKop: existing.settings.defaultDriverPayPerKmKop ?? TRIP_COST_DEFAULTS.driverPayPerKmKop,
        platonPerKmKop: existing.settings.defaultPlatonPerKmKop ?? TRIP_COST_DEFAULTS.platonPerKmKop,
        fuelLitersPer100: existing.settings.defaultFuelLitersPer100 ?? TRIP_COST_DEFAULTS.fuelLitersPer100,
        fuelPricePerLiterKop: existing.settings.defaultFuelPricePerLiterKop ?? TRIP_COST_DEFAULTS.fuelPricePerLiterKop,
        clientRateKop: 0,
        carrierRateKop: 0,
        extraExpenseKop: 0,
        vatRate: existing.settings.defaultVat,
        source: 'excel',
        notes: '',
      } satisfies Order)
    const next: Order = {
      ...base,
      id: found?.id ?? uid('ord', i),
      number: number || base.number,
      createdAt: excelDate(rawCell(row, 'создан', 'датасоздания')) || base.createdAt,
      loadingDate: excelDate(rawCell(row, 'погрузка', 'датапогрузки', 'loading')) || base.loadingDate,
      deliveryDate: excelDate(rawCell(row, 'выгрузка', 'доставка', 'датавыгрузки')) || base.deliveryDate,
      paymentDueDate: excelDate(rawCell(row, 'срокоплаты', 'оплата')) || base.paymentDueDate,
      status,
      clientId: client?.id || base.clientId,
      carrierId: carrier?.id || base.carrierId,
      shipperId: shipper?.id || client?.id || base.shipperId,
      consigneeId: consignee?.id || base.consigneeId,
      vehicleId: vehicle?.id || base.vehicleId,
      driverId: driver?.id || base.driverId,
      cargo: cargo || base.cargo,
      packingCode: cell(row, 'тара', 'кодтары') || base.packingCode,
      weightValue: Number(cell(row, 'вес', 'весзначение').replace(',', '.')) || base.weightValue,
      weightUnit,
      volumeM3: Number(cell(row, 'объем', 'м3').replace(',', '.')) || base.volumeM3,
      fromCity: fromCity || base.fromCity,
      fromAddress: cell(row, 'адреспогрузки', 'погрузкаадрес') || base.fromAddress,
      fromContactFirstName: cell(row, 'имяпогрузка', 'контактпогрузкаимя') || base.fromContactFirstName,
      fromContactLastName: cell(row, 'фамилияпогрузка', 'контактпогрузкафамилия') || base.fromContactLastName,
      fromContactPhone: cell(row, 'телефонпогрузка', 'контактпогрузка', 'телпогрузка') || base.fromContactPhone,
      toCity: toCity || base.toCity,
      toAddress: cell(row, 'адресвыгрузки', 'выгрузкаадрес') || base.toAddress,
      toContactFirstName: cell(row, 'имявыгрузка', 'контактвыгрузкаимя') || base.toContactFirstName,
      toContactLastName: cell(row, 'фамилиявыгрузка', 'контактвыгрузкафамилия') || base.toContactLastName,
      toContactPhone: cell(row, 'телефонвыгрузка', 'контактвыгрузка', 'телвыгрузка') || base.toContactPhone,
      distanceKm: Number(cell(row, 'км', 'плечо', 'километраж').replace(',', '.')) || base.distanceKm,
      clientRateKop: moneyKop(cell(row, 'ставкаклиенту', 'ставка', 'сумма')) || base.clientRateKop,
      carrierRateKop: moneyKop(cell(row, 'ставкаперевозчику', 'перевозчику')) || base.carrierRateKop,
      extraExpenseKop: moneyKop(cell(row, 'доп', 'допрасходы')) || base.extraExpenseKop,
      vatRate,
      source: 'excel',
      notes: cell(row, 'примечание', 'комментарий', 'notes') || base.notes,
    }
    if (found) {
      const idx = orders.findIndex((o) => o.id === found.id)
      orders[idx] = next
    } else {
      orders.unshift(next)
      addedO += 1
    }
  })

  if (!addedP && !addedV && !addedD && !addedO && !warnings.length) {
    warnings.push('В файле нет узнаваемых строк. Нужны листы «Контрагенты», «ТС», «Водители», «Рейсы» или скачайте шаблон.')
  }

  return {
    parties,
    vehicles,
    drivers,
    orders,
    warnings,
    counts: { parties: addedP, vehicles: addedV, drivers: addedD, orders: addedO },
  }
}

export function buildExcelWorkbook(state: Pick<AppState, 'parties' | 'vehicles' | 'drivers' | 'orders'>): XLSX.WorkBook {
  const partyById = new Map(state.parties.map((p) => [p.id, p]))
  const vehicleById = new Map(state.vehicles.map((v) => [v.id, v]))
  const driverById = new Map(state.drivers.map((d) => [d.id, d]))

  const parties = state.parties.map((p) => ({
    Вид: p.kind,
    Наименование: p.name,
    ИНН: p.inn,
    КПП: p.kpp,
    ОПФ: p.legalForm,
    Телефон: p.phone,
    Email: p.email,
    Город: p.city,
    Адрес: p.address,
    Контакт: p.contact,
    БИК: p.bankBik,
    Счет: p.bankAccount,
    ЭДО: p.edoId,
    ЭПД: p.epdId,
    Примечание: p.notes,
  }))

  const vehicles = state.vehicles.map((v) => ({
    Номер: v.plate,
    Марка: v.brand,
    Тип: v.type,
    'Грузоподъемность кг': v.capacityKg,
    Объем: v.volumeM3,
    СТС: v.sts,
    Год: v.year,
    Владелец: v.ownerName,
    Телефон: v.ownerPhone,
    Прицеп: v.trailerPlate,
    Статус: v.status,
    Перевозчик: partyById.get(v.carrierId)?.name ?? '',
    'ИНН перевозчика': partyById.get(v.carrierId)?.inn ?? '',
  }))

  const drivers = state.drivers.map((d) => ({
    ФИО: d.name,
    ИНН: d.inn,
    ВУ: d.license,
    Телефон: d.phone,
    Перевозчик: partyById.get(d.carrierId)?.name ?? '',
    'ИНН перевозчика': partyById.get(d.carrierId)?.inn ?? '',
  }))

  const orders = state.orders.map((o) => ({
    Номер: o.number,
    Создан: o.createdAt,
    Погрузка: o.loadingDate,
    Выгрузка: o.deliveryDate,
    'Срок оплаты': o.paymentDueDate,
    Статус: STATUS_LABEL[o.status],
    Клиент: partyById.get(o.clientId)?.name ?? '',
    'ИНН клиента': partyById.get(o.clientId)?.inn ?? '',
    Перевозчик: partyById.get(o.carrierId)?.name ?? '',
    'ИНН перевозчика': partyById.get(o.carrierId)?.inn ?? '',
    Грузоотправитель: partyById.get(o.shipperId)?.name ?? '',
    Грузополучатель: partyById.get(o.consigneeId)?.name ?? '',
    Груз: o.cargo,
    Вес: o.weightValue,
    Ед: o.weightUnit,
    Объем: o.volumeM3,
    Откуда: o.fromCity,
    'Адрес погрузки': o.fromAddress,
    'Имя погрузка': o.fromContactFirstName,
    'Фамилия погрузка': o.fromContactLastName,
    'Телефон погрузка': o.fromContactPhone,
    Куда: o.toCity,
    'Адрес выгрузки': o.toAddress,
    'Имя выгрузка': o.toContactFirstName,
    'Фамилия выгрузка': o.toContactLastName,
    'Телефон выгрузка': o.toContactPhone,
    Км: o.distanceKm,
    'Ставка клиенту': o.clientRateKop / 100,
    'Ставка перевозчику': o.carrierRateKop / 100,
    Доп: o.extraExpenseKop / 100,
    НДС: o.vatRate,
    ТС: vehicleById.get(o.vehicleId)?.plate ?? '',
    Водитель: driverById.get(o.driverId)?.name ?? '',
    Примечание: o.notes,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, jsonSheet(parties, PARTY_HEADERS), 'Контрагенты')
  XLSX.utils.book_append_sheet(wb, jsonSheet(vehicles, VEHICLE_HEADERS), 'ТС')
  XLSX.utils.book_append_sheet(wb, jsonSheet(drivers, DRIVER_HEADERS), 'Водители')
  XLSX.utils.book_append_sheet(wb, jsonSheet(orders, ORDER_HEADERS), 'Рейсы')
  return wb
}

const PARTY_HEADERS = [
  'Вид',
  'Наименование',
  'ИНН',
  'КПП',
  'ОПФ',
  'Телефон',
  'Email',
  'Город',
  'Адрес',
  'Контакт',
  'БИК',
  'Счет',
  'ЭДО',
  'ЭПД',
  'Примечание',
]
const VEHICLE_HEADERS = [
  'Номер',
  'Марка',
  'Тип',
  'Грузоподъемность кг',
  'Объем',
  'СТС',
  'Год',
  'Владелец',
  'Телефон',
  'Прицеп',
  'Статус',
  'Перевозчик',
  'ИНН перевозчика',
]
const DRIVER_HEADERS = ['ФИО', 'ИНН', 'ВУ', 'Телефон', 'Перевозчик', 'ИНН перевозчика']
const ORDER_HEADERS = [
  'Номер',
  'Создан',
  'Погрузка',
  'Выгрузка',
  'Срок оплаты',
  'Статус',
  'Клиент',
  'ИНН клиента',
  'Перевозчик',
  'ИНН перевозчика',
  'Грузоотправитель',
  'Грузополучатель',
  'Груз',
  'Вес',
  'Ед',
  'Объем',
  'Откуда',
  'Адрес погрузки',
  'Имя погрузка',
  'Фамилия погрузка',
  'Телефон погрузка',
  'Куда',
  'Адрес выгрузки',
  'Имя выгрузка',
  'Фамилия выгрузка',
  'Телефон выгрузка',
  'Км',
  'Ставка клиенту',
  'Ставка перевозчику',
  'Доп',
  'НДС',
  'ТС',
  'Водитель',
  'Примечание',
]

function jsonSheet(rows: Record<string, unknown>[], headers: string[]): XLSX.WorkSheet {
  if (!rows.length) return XLSX.utils.aoa_to_sheet([headers])
  return XLSX.utils.json_to_sheet(rows, { header: headers })
}

export function workbookToArrayBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer | Uint8Array
  if (out instanceof ArrayBuffer) return out
  const bytes = out instanceof Uint8Array ? out : new Uint8Array(out as ArrayLike<number>)
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

export function downloadExcel(filename: string, wb: XLSX.WorkBook) {
  const buf = workbookToArrayBuffer(wb)
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
