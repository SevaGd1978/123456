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
import { nextNumber, todayIso } from './lib/format'

const KEY = 'reisoffice:v2'

type Store = AppState & {
  login: (login: string, password: string) => string | null
  logout: () => void
  currentUser: AppState['users'][number] | null
  saveOrder: (order: Order) => { ok: true } | { ok: false; error: string }
  deleteOrder: (id: string) => void
  saveParty: (party: Party) => { ok: true } | { ok: false; error: string }
  log: (action: string, entity: string) => void
  addExchange: (job: Omit<ExchangeJob, 'id' | 'at'>) => void
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

function load(): AppState {
  const seed = createSeed()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed
    const saved = JSON.parse(raw) as Partial<AppState>
    return {
      ...seed,
      ...saved,
      users: seed.users,
      orders: saved.orders?.length ? saved.orders : seed.orders,
      parties: saved.parties?.length ? saved.parties : seed.parties,
      vehicles: saved.vehicles?.length ? saved.vehicles : seed.vehicles,
      drivers: saved.drivers?.length ? saved.drivers : seed.drivers,
    }
  } catch {
    return seed
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
      resetDemo: () => {
        localStorage.removeItem(KEY)
        setState(createSeed())
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

export function blankOrder(defaultVat: 0 | 5 | 7 | 10 | 20 | 22, companyClientHint = ''): Order {
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
    toCity: '',
    toAddress: '',
    clientRateKop: 0,
    carrierRateKop: 0,
    extraExpenseKop: 0,
    vatRate: defaultVat,
    source: 'вручную',
    notes: '',
  }
}
