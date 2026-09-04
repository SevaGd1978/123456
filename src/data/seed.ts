import type { AppState, Driver, Order, Party, Vehicle } from '../types'
import { rubToKop } from '../lib/money'
import { addDays, todayIso } from '../lib/format'
import { TRIP_COST_DEFAULTS, estimateRoadKm } from '../lib/tripCost'

function fnv(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16)
}

export const DEMO_PASSWORDS: Record<string, string> = {
  director: 'office',
  dispatcher: 'route',
  accountant: 'ledger',
}

export function passwordFingerprint(login: string, password: string): string {
  return fnv(`${login}:${password}:reisoffice`)
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function inn10(rand: () => number): string {
  const k = [2, 4, 10, 3, 5, 9, 4, 6, 8]
  const d: number[] = []
  for (let i = 0; i < 9; i++) d.push(Math.floor(rand() * 10))
  if (d[0] === 0) d[0] = 7
  const sum = k.reduce((s, w, i) => s + w * d[i], 0)
  d.push((sum % 11) % 10)
  return d.join('')
}

const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Нижний Новгород',
  'Екатеринбург',
  'Самара',
  'Ростов-на-Дону',
  'Новосибирск',
  'Краснодар',
  'Воронеж',
  'Пермь',
  'Уфа',
  'Тула',
  'Ярославль',
  'Тверь',
]

const CARGO = [
  'Сборный груз',
  'Паллеты с запчастями',
  'Продукты питания',
  'Стройматериалы',
  'Металлопрокат',
  'Бытовая техника',
  'Упаковка',
  'Химия неопасная',
  'Мебель',
  'Автокомпоненты',
]

const PACK = ['4A', '33', '1A2', '4G', '3H1']

export function createSeed(): AppState {
  const rand = mulberry32(20260904)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!

  const company: Party = {
    id: 'own-1',
    kind: 'own',
    name: 'ООО «РейсОфис Логистика»',
    inn: inn10(rand),
    kpp: '770701001',
    legalForm: 'ooo',
    phone: '+7 495 120-40-18',
    email: 'hello@reisoffice.local',
    city: 'Москва',
    address: 'ул. Лесная, 5',
    contact: 'Севостьянов П.А.',
    bankBik: '044525225',
    bankAccount: '40702810900000001234',
    edoId: '2BM-REIS-001',
    epdId: 'EPD-REIS-001',
    notes: 'Наша фирма',
  }

  const namedClients: Party[] = [
    ['cl-1', 'ООО «Северная дуга»', 'Москва', false],
    ['cl-2', 'АО «Волга Трейд»', 'Самара', false],
    ['cl-3', 'ООО «Кубань Снаб»', 'Краснодар', false],
    ['cl-4', 'ИП Козлов А.В.', 'Казань', true],
    ['cl-5', 'ООО «УралПром»', 'Екатеринбург', false],
  ].map(([id, name, city, ip]) => {
    const inn = inn10(rand)
    return {
      id: String(id),
      kind: 'client' as const,
      name: String(name),
      inn,
      kpp: ip ? '' : `${inn.slice(0, 4)}01001`,
      legalForm: ip ? ('ip' as const) : ('ooo' as const),
      phone: `+7 9${Math.floor(100000000 + rand() * 899999999)}`,
      email: `sales@${id}.ru`,
      city: String(city),
      address: 'офис 12',
      contact: 'отдел логистики',
      bankBik: '044525225',
      bankAccount: '40702810100000000001',
      edoId: `2BM-${id}`,
      epdId: `EPD-${id}`,
      notes: '',
    }
  })

  const clients: Party[] = [...namedClients]
  for (let i = 0; i < 24; i++) {
    const inn = inn10(rand)
    clients.push({
      id: `cl-g-${i}`,
      kind: 'client',
      name: `ООО «Клиент ${i + 6}»`,
      inn,
      kpp: `${inn.slice(0, 4)}01001`,
      legalForm: 'ooo',
      phone: '+7 495 000-00-00',
      email: `c${i}@mail.ru`,
      city: pick(CITIES),
      address: 'склад 1',
      contact: 'логист',
      bankBik: '044525225',
      bankAccount: '40702810100000000002',
      edoId: '',
      epdId: '',
      notes: '',
    })
  }

  const carriers: Party[] = []
  for (let i = 0; i < 40; i++) {
    const inn = inn10(rand)
    carriers.push({
      id: `cr-${i}`,
      kind: 'carrier',
      name: i % 7 === 0 ? `ИП Перевозчик ${i + 1}` : `ООО «Автолайн ${i + 1}»`,
      inn,
      kpp: i % 7 === 0 ? '' : `${inn.slice(0, 4)}01001`,
      legalForm: i % 7 === 0 ? 'ip' : 'ooo',
      phone: '+7 900 111-22-33',
      email: `fleet${i}@mail.ru`,
      city: pick(CITIES),
      address: 'база',
      contact: 'диспетчер',
      bankBik: '044525225',
      bankAccount: '40802810100000000003',
      edoId: '',
      epdId: '',
      notes: '',
    })
  }

  const shippers: Party[] = []
  const consignees: Party[] = []
  for (let i = 0; i < 18; i++) {
    const innS = inn10(rand)
    const innC = inn10(rand)
    shippers.push({
      id: `sh-${i}`,
      kind: 'shipper',
      name: `ООО «Склад отгрузки ${i + 1}»`,
      inn: innS,
      kpp: `${innS.slice(0, 4)}01001`,
      legalForm: 'ooo',
      phone: '+7 495 200-00-00',
      email: '',
      city: pick(CITIES),
      address: `терминал, ворота ${i + 1}`,
      contact: 'кладовщик',
      bankBik: '',
      bankAccount: '',
      edoId: '',
      epdId: '',
      notes: '',
    })
    consignees.push({
      id: `cs-${i}`,
      kind: 'consignee',
      name: `ООО «Склад приёмки ${i + 1}»`,
      inn: innC,
      kpp: `${innC.slice(0, 4)}01001`,
      legalForm: 'ooo',
      phone: '+7 812 200-00-00',
      email: '',
      city: pick(CITIES),
      address: `промзона, док ${i + 1}`,
      contact: 'приёмка',
      bankBik: '',
      bankAccount: '',
      edoId: '',
      epdId: '',
      notes: '',
    })
  }

  const vehicles: Vehicle[] = []
  const drivers: Driver[] = []
  carriers.forEach((c, i) => {
    const n = 1 + (i % 3)
    for (let v = 0; v < n; v++) {
      const id = `vh-${i}-${v}`
      vehicles.push({
        id,
        plate: `А${String(100 + i).slice(-3)}БВ${77 + (v % 3)}`,
        brand: pick(['КАМАЗ 5490', 'Volvo FH', 'МАЗ 5440', 'Scania R', 'Mercedes Actros']),
        type: pick(['тент', 'реф', 'борт', 'изотерм']),
        capacityKg: pick([10_000, 15_000, 20_000, 22_000]),
        volumeM3: pick([82, 90, 96, 110]),
        sts: `${77 + v} 14 ${100000 + i}`,
        year: 2018 + (i % 7),
        ownerName: c.legalForm === 'ip' ? c.name : 'ООО «ЛизингТранс»',
        ownerPhone: c.phone,
        trailerPlate: `В${String(200 + i).slice(-3)}ЕЕ${77}`,
        status: pick(['free', 'busy', 'repair']),
        carrierId: c.id,
      })
      drivers.push({
        id: `dr-${i}-${v}`,
        name: pick(['Петров И.С.', 'Сидоров А.Н.', 'Кузнецов В.П.', 'Морозов Д.И.', 'Павлов К.Е.']),
        inn: '',
        license: `77 АА ${100000 + i * 10 + v}`,
        phone: '+7 900 555-00-00',
        carrierId: c.id,
      })
    }
  })

  const statuses: Order['status'][] = [
    'draft',
    'confirmed',
    'loading',
    'in_transit',
    'unloading',
    'delivered',
    'invoiced',
    'paid',
    'cancelled',
  ]

  const today = todayIso()
  const orders: Order[] = []
  const TOTAL = 1800
  for (let i = 0; i < TOTAL; i++) {
    const client = pick(clients)
    const carrier = pick(carriers)
    const vehicle = pick(vehicles.filter((v) => v.carrierId === carrier.id)) ?? pick(vehicles)
    const driver = pick(drivers.filter((d) => d.carrierId === carrier.id)) ?? pick(drivers)
    const from = pick(CITIES)
    let to = pick(CITIES)
    if (to === from) to = pick(CITIES)
    const loading = addDays(today, Math.floor(rand() * 40) - 20)
    const clientRate = 40_000 + Math.floor(rand() * 180_000)
    const carrierRate = Math.round(clientRate * (0.62 + rand() * 0.25))
    const unit: Order['weightUnit'] = rand() > 0.45 ? 't' : 'kg'
    const weightValue = unit === 't' ? 2 + Math.round(rand() * 18 * 10) / 10 : 80 + Math.floor(rand() * 900)
    orders.push({
      id: `ord-${i}`,
      number: `РО-2026-${String(i + 1).padStart(4, '0')}`,
      createdAt: addDays(today, -Math.floor(rand() * 45)),
      loadingDate: loading,
      deliveryDate: addDays(loading, 1 + Math.floor(rand() * 4)),
      paymentDueDate: addDays(loading, 7 + Math.floor(rand() * 14)),
      status: pick(statuses),
      clientId: client.id,
      carrierId: carrier.id,
      shipperId: pick(shippers).id,
      consigneeId: pick(consignees).id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      cargo: pick(CARGO),
      packingCode: pick(PACK),
      weightValue,
      weightUnit: unit,
      volumeM3: 8 + Math.round(rand() * 70),
      fromCity: from,
      fromAddress: 'терминал А, ворота 3',
      toCity: to,
      toAddress: 'склад B, док 2',
      clientRateKop: rubToKop(clientRate),
      carrierRateKop: rubToKop(carrierRate),
      extraExpenseKop: rubToKop(Math.floor(rand() * 4000)),
      vatRate: rand() > 0.12 ? 22 : 0,
      source: pick(['телефон', 'ATI', 'email', 'повтор']),
      notes: i % 17 === 0 ? 'Хрупкий груз, нужна гидроборт' : '',
      distanceKm: estimateRoadKm(from, to) || 250 + Math.floor(rand() * 1400),
      driverPayPerKmKop: TRIP_COST_DEFAULTS.driverPayPerKmKop,
      platonPerKmKop: TRIP_COST_DEFAULTS.platonPerKmKop,
      fuelLitersPer100: TRIP_COST_DEFAULTS.fuelLitersPer100,
      fuelPricePerLiterKop: TRIP_COST_DEFAULTS.fuelPricePerLiterKop,
    })
  }

  return {
    users: [
      {
        id: 'u-dir',
        login: 'director',
        name: 'Павел Севостьянов',
        role: 'director',
        passwordHash: passwordFingerprint('director', DEMO_PASSWORDS.director),
      },
      {
        id: 'u-disp',
        login: 'dispatcher',
        name: 'Анна Логинова',
        role: 'dispatcher',
        passwordHash: passwordFingerprint('dispatcher', DEMO_PASSWORDS.dispatcher),
      },
      {
        id: 'u-acc',
        login: 'accountant',
        name: 'Мария Счетовская',
        role: 'accountant',
        passwordHash: passwordFingerprint('accountant', DEMO_PASSWORDS.accountant),
      },
    ],
    session: null,
    parties: [company, ...clients, ...carriers, ...shippers, ...consignees],
    vehicles,
    drivers,
    orders,
    audit: [
      {
        id: 'a-1',
        at: new Date().toISOString(),
        user: 'система',
        action: 'Загружена демонстрационная база (1800 заказов)',
        entity: 'orders',
      },
    ],
    exchange: [],
    settings: {
      companyId: company.id,
      exchangePrefix: 'ReisOffice',
      defaultVat: 22,
      defaultDriverPayPerKmKop: TRIP_COST_DEFAULTS.driverPayPerKmKop,
      defaultPlatonPerKmKop: TRIP_COST_DEFAULTS.platonPerKmKop,
      defaultFuelLitersPer100: TRIP_COST_DEFAULTS.fuelLitersPer100,
      defaultFuelPricePerLiterKop: TRIP_COST_DEFAULTS.fuelPricePerLiterKop,
    },
  }
}
