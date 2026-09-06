import type { VatRate } from '../types'

/** Integer kopecks — no floating money math. */
export function rubToKop(rub: number): number {
  return Math.round(rub * 100)
}

export function kopToRub(kop: number): number {
  return kop / 100
}

export function formatMoney(kop: number): string {
  const sign = kop < 0 ? '−' : ''
  const abs = Math.abs(kop)
  const rub = Math.floor(abs / 100)
  const k = abs % 100
  return `${sign}${rub.toLocaleString('ru-RU')},${String(k).padStart(2, '0')} ₽`
}

export function vatAmount(netKop: number, rate: VatRate): number {
  return Math.round((netKop * rate) / 100)
}

export function grossAmount(netKop: number, rate: VatRate): number {
  return netKop + vatAmount(netKop, rate)
}

export function marginKop(clientKop: number, carrierKop: number, extraKop: number): number {
  return clientKop - carrierKop - extraKop
}

export function parseRubInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return 0
  return rubToKop(n)
}

export const VAT_RATES: VatRate[] = [0, 5, 7, 10, 20, 22]
