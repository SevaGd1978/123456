import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createSeed, passwordFingerprint } from './data/seed'
import type { AppState, AuditEvent, ExchangeJob, Order, Party } from './types'
import type { ExcelImportResult } from './lib/excelIo'
import { nextNumber, todayIso } from './lib/format'
import { estimateRoadKm } from './lib/tripCost'

const KEY = 'reisoffice:v3'

type Store = AppState & {
  login: (login: string, password: string) => string | null
  logout: () => void
  currentUser: AppState['users'][number] | null
  saveOrder: (order: Order) => { ok: true } | { ok: false; error: string }
  deleteOrder: (id: string) => void
  saveParty: (party: Party) => { ok: true } | { ok: false; error: string }
  log: (action: string, entity: string) => void
  addExchange: (job: Omit<ExchangeJob, 'id' | 'at'>) => void
  updateSettings: (patch: Partial<AppState['settings']>) => void
  resetDemo: () => void
  wipeDatabase: (password: string) => { ok: true } | { ok: false; error: string }
  applyImport: (imported: ExcelImportResult) => void
}

const Ctx = createContext<Store | null>(null)

function hydrateOrder(order: Order, settings: AppState['settings']): Order {
  const distanceKm =
    typeof order.distanceKm === 'number' && order.distanceKm > 0
      ? order.distanceKm
      : estimateRoadKm(order.fromCity ?? '', order.toCity ?? '')
  return {
    ...order,
    distanceKm,
    fromContactFirstName: order.fromContactFirstName ?? '',
    fromContactLastName: order.fromContactLastName ?? '',
    fromContactPhone: order.fromContactPhone ?? '',
    toContactFirstName: order.toContactFirstName ?? '',
    toContactLastName: order.toContactLastName ?? '',
    toContactPhone: order.toContactPhone ?? '',
    driverPayPerKmKop: order.driverPayPerKmKop ?? settings.defaultDriverPayPerKmKop,
    platonPerKmKop: order.platonPerKmKop ?? settings.defaultPlatonPerKmKop,
    fuelLitersPer100: order.fuelLitersPer100 ?? settings.defaultFuelLitersPer100,
    fuelPricePerLiterKop: order.fuelPricePerLiterKop ?? settings.defaultFuelPricePerLiterKop,
  }
}

function load(): AppState {
  const seed = createSeed()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed
    return mergePersisted(seed, JSON.parse(raw) as Partial<AppState>)
  } catch {
    return seed
  }
}

/** Empty arrays after a wipe must not fall back to the demo seed. */
export function mergePersisted(seed: AppState, saved: Partial<AppState>): AppState {
  const settings = { ...seed.settings, ...saved.settings, dadataToken: saved.settings?.dadataToken ?? seed.settings.dadataToken }
  const orders = (Array.isArray(saved.orders) ? saved.orders : seed.orders).map((o) => hydrateOrder(o, settings))
  return {
    ...seed,
    ...saved,
    users: seed.users,
    settings,
    orders,
    parties: Array.isArray(saved.parties) ? saved.parties : seed.parties,
    vehicles: Array.isArray(saved.vehicles) ? saved.vehicles : seed.vehicles,
    drivers: Array.isArray(saved.drivers) ? saved.drivers : seed.drivers,
  }
}

function persist(state: AppState) {
  const payload = {
    session: state.session,
    parties: state.parties,
    vehicles: state.vehicles,
    drivers: state.drivers,
    orders: state.orders,
    audit: state.audit,
    exchange: state.exchange,
    settings: state.settings,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          session: payload.session,
          settings: payload.settings,
          audit: payload.audit.slice(0, 40),
          exchange: payload.exchange.slice(0, 20),
        }),
      )
    } catch {
      /* quota — keep working in memory */
    }
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load())

  const commit = useCallback((patch: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = patch(prev)
      persist(next)
      return next
    })
  }, [])

  const log = useCallback(
    (action: string, entity: string) => {
      commit((prev) => {
        const user = prev.users.find((u) => u.id === prev.session?.userId)?.name ?? 'гость'
        const ev: AuditEvent = {
          id: `a-${Date.now()}`,
          at: new Date().toISOString(),
          user,
          action,
          entity,
        }
        return { ...prev, audit: [ev, ...prev.audit].slice(0, 200) }
      })
    },
    [commit],
  )

  const value = useMemo<Store>(() => {
    const currentUser = state.users.find((u) => u.id === state.session?.userId) ?? null
    return {
      ...state,
      currentUser,
      login: (login, password) => {
        const user = state.users.find((u) => u.login === login)
        if (!user || user.passwordHash !== passwordFingerprint(login, password)) {
          return 'Неверный логин или пароль'
        }
        commit((prev) => ({ ...prev, session: { userId: user.id } }))
        return null
      },
      logout: () => commit((prev) => ({ ...prev, session: null })),
      saveOrder: (order) => {
        if (!order.number.trim()) {
          order = { ...order, number: nextNumber(state.orders.map((o) => o.number)) }
        }
        commit((prev) => {
          const exists = prev.orders.some((o) => o.id === order.id)
          const orders = exists
            ? prev.orders.map((o) => (o.id === order.id ? order : o))
            : [order, ...prev.orders]
          return { ...prev, orders }
        })
        return { ok: true }
      },
      deleteOrder: (id) => {
        commit((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => (o.id === id ? { ...o, status: 'cancelled' as const } : o)),
        }))
      },
      saveParty: (party) => {
        const dup = state.parties.find((p) => p.inn === party.inn && p.id !== party.id)
        if (dup) return { ok: false, error: `ИНН уже есть у «${dup.name}»` }
        commit((prev) => {
          const exists = prev.parties.some((p) => p.id === party.id)
          const parties = exists
            ? prev.parties.map((p) => (p.id === party.id ? party : p))
            : [party, ...prev.parties]
          return { ...prev, parties }
        })
        return { ok: true }
      },
      log,
      addExchange: (job) => {
        commit((prev) => ({
          ...prev,
          exchange: [
            { ...job, id: `x-${Date.now()}`, at: new Date().toISOString() },
            ...prev.exchange,
          ].slice(0, 80),
        }))
      },
      updateSettings: (patch) => {
        commit((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
      },
      resetDemo: () => {
        localStorage.removeItem(KEY)
        setState(createSeed())
      },
      wipeDatabase: (password) => {
        if (currentUser?.role !== 'director') {
          return { ok: false, error: 'Очистить базу может только директор' }
        }
        if (currentUser.passwordHash !== passwordFingerprint(currentUser.login, password)) {
          return { ok: false, error: 'Неверный пароль' }
        }
        commit((prev) => {
          const own = prev.parties.filter((p) => p.kind === 'own' || p.id === prev.settings.companyId)
          const ev: AuditEvent = {
            id: `a-wipe-${Date.now()}`,
            at: new Date().toISOString(),
            user: currentUser.name,
            action: 'Очищена база (рейсы, справочники, парк)',
            entity: 'db',
          }
          return {
            ...prev,
            parties: own,
            vehicles: [],
            drivers: [],
            orders: [],
            exchange: [],
            audit: [ev],
          }
        })
        return { ok: true }
      },
      applyImport: (imported) => {
        commit((prev) => ({
          ...prev,
          parties: imported.parties,
          vehicles: imported.vehicles,
          drivers: imported.drivers,
          orders: imported.orders,
        }))
      },
    }
  }, [state, commit, log])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Store missing')
  return ctx
}

export function blankOrder(settings: AppState['settings'], companyClientHint = ''): Order {
  return {
    id: `ord-new-${Date.now()}`,
    number: '',
    createdAt: todayIso(),
    loadingDate: todayIso(),
    deliveryDate: todayIso(),
    paymentDueDate: todayIso(),
    status: 'draft',
    clientId: companyClientHint,
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
    driverPayPerKmKop: settings.defaultDriverPayPerKmKop,
    platonPerKmKop: settings.defaultPlatonPerKmKop,
    fuelLitersPer100: settings.defaultFuelLitersPer100,
    fuelPricePerLiterKop: settings.defaultFuelPricePerLiterKop,
    clientRateKop: 0,
    carrierRateKop: 0,
    extraExpenseKop: 0,
    vatRate: settings.defaultVat,
    source: 'вручную',
    notes: '',
  }
}
