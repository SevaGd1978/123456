export type Role = 'director' | 'dispatcher' | 'accountant'

export type User = {
  id: string
  login: string
  name: string
  role: Role
  passwordHash: string
}

export type PartyKind = 'client' | 'carrier' | 'shipper' | 'consignee' | 'own'

export type Party = {
  id: string
  kind: PartyKind
  name: string
  inn: string
  kpp: string
  legalForm: 'ooo' | 'ip' | 'ao'
  phone: string
  email: string
  city: string
  address: string
  contact: string
  bankBik: string
  bankAccount: string
  edoId: string
  epdId: string
  notes: string
}

export type Vehicle = {
  id: string
  plate: string
  brand: string
  type: string
  capacityKg: number
  volumeM3: number
  sts: string
  year: number
  ownerName: string
  ownerPhone: string
  trailerPlate: string
  status: 'free' | 'busy' | 'repair'
  carrierId: string
}

export type Driver = {
  id: string
  name: string
  inn: string
  license: string
  phone: string
  carrierId: string
}

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'loading'
  | 'in_transit'
  | 'unloading'
  | 'delivered'
  | 'invoiced'
  | 'paid'
  | 'cancelled'

export type WeightUnit = 'kg' | 't'

export type VatRate = 0 | 5 | 7 | 10 | 20 | 22

export type Order = {
  id: string
  number: string
  createdAt: string
  loadingDate: string
  deliveryDate: string
  paymentDueDate: string
  status: OrderStatus
  clientId: string
  carrierId: string
  shipperId: string
  consigneeId: string
  vehicleId: string
  driverId: string
  cargo: string
  packingCode: string
  weightValue: number
  weightUnit: WeightUnit
  volumeM3: number
  fromCity: string
  fromAddress: string
  toCity: string
  toAddress: string
  distanceKm: number
  driverPayPerKmKop: number
  platonPerKmKop: number
  fuelLitersPer100: number
  fuelPricePerLiterKop: number
  clientRateKop: number
  carrierRateKop: number
  extraExpenseKop: number
  vatRate: VatRate
  source: string
  notes: string
}

export type AuditEvent = {
  id: string
  at: string
  user: string
  action: string
  entity: string
}

export type ExchangeJob = {
  id: string
  at: string
  direction: 'export' | 'import'
  kind: 'clients' | 'documents' | 'carriers' | 'preorders'
  fileName: string
  rows: number
  status: 'ok' | 'error'
  message: string
}

export type AppState = {
  users: User[]
  session: { userId: string } | null
  parties: Party[]
  vehicles: Vehicle[]
  drivers: Driver[]
  orders: Order[]
  audit: AuditEvent[]
  exchange: ExchangeJob[]
  settings: {
    companyId: string
    exchangePrefix: string
    defaultVat: VatRate
    defaultDriverPayPerKmKop: number
    defaultPlatonPerKmKop: number
    defaultFuelLitersPer100: number
    defaultFuelPricePerLiterKop: number
  }
}
