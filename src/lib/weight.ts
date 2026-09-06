import type { WeightUnit } from '../types'

/** Explicit units — never guess tons vs kilograms from magnitude. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 't' ? Math.round(value * 1000) : Math.round(value)
}

export function formatWeight(value: number, unit: WeightUnit): string {
  const n = Number.isFinite(value) ? value : 0
  const pretty = Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `${pretty} ${unit === 't' ? 'т' : 'кг'}`
}

export function formatKg(kg: number): string {
  if (kg >= 1000 && kg % 1000 === 0) return `${kg / 1000} т`
  return `${kg} кг`
}
