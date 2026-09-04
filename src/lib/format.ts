import type { OrderStatus, Role } from '../types'

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!d) return iso
  return `${d}.${m}.${y}`
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const dt = new Date(`${iso}T12:00:00`)
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().slice(0, 10)
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждён',
  loading: 'Погрузка',
  in_transit: 'В пути',
  unloading: 'Выгрузка',
  delivered: 'Доставлен',
  invoiced: 'Выставлен счёт',
  paid: 'Оплачен',
  cancelled: 'Отменён',
}

export const ROLE_LABEL: Record<Role, string> = {
  director: 'Директор',
  dispatcher: 'Диспетчер',
  accountant: 'Бухгалтер',
}

export function nextNumber(existing: string[]): string {
  const year = new Date().getFullYear()
  let max = 0
  for (const n of existing) {
    const m = n.match(/(\d+)$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `РО-${year}-${String(max + 1).padStart(4, '0')}`
}
