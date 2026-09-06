import * as XLSX from 'xlsx'
import type { AppState, Order } from '../types'
import { calcTripCost } from './tripCost'
import { marginKop, vatAmount } from './money'
import { parseExcelWorkbook, type ExcelImportResult } from './excelIo'

export type ExcelSheetPreview = {
  name: string
  rows: number
  columns: string[]
  preview: Record<string, string>[]
}

export type ExcelGroupRow = {
  name: string
  n: number
  km: number
  revenueKop: number
  costKop: number
  marginKop: number
}

export type ExcelAnalysis = {
  sheets: ExcelSheetPreview[]
  imported: ExcelImportResult
  totals: {
    trips: number
    km: number
    revenueKop: number
    carrierKop: number
    extraKop: number
    costKop: number
    vatKop: number
    marginKop: number
    withoutKm: number
    withoutRate: number
  }
  byClient: ExcelGroupRow[]
  byRoute: ExcelGroupRow[]
}

function cellText(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return String(v).trim()
}

export function previewWorkbookSheets(data: ArrayBuffer): ExcelSheetPreview[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: false })
  return wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name]
    if (!sheet) return { name, rows: 0, columns: [], preview: [] }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })
    const columns = rows[0] ? Object.keys(rows[0]) : []
    return {
      name,
      rows: rows.length,
      columns,
      preview: rows.slice(0, 8).map((row) => {
        const out: Record<string, string> = {}
        for (const col of columns.slice(0, 8)) out[col] = cellText(row[col])
        return out
      }),
    }
  })
}

function groupOrders(
  orders: Order[],
  keyOf: (o: Order) => string,
): ExcelGroupRow[] {
  const map = new Map<string, ExcelGroupRow>()
  for (const o of orders) {
    const name = keyOf(o) || '—'
    const cur = map.get(name) ?? { name, n: 0, km: 0, revenueKop: 0, costKop: 0, marginKop: 0 }
    cur.n += 1
    cur.km += o.distanceKm || 0
    cur.revenueKop += o.clientRateKop
    cur.costKop += calcTripCost(o).totalKop
    cur.marginKop += marginKop(o.clientRateKop, o.carrierRateKop, o.extraExpenseKop)
    map.set(name, cur)
  }
  return [...map.values()].sort((a, b) => b.revenueKop - a.revenueKop).slice(0, 15)
}

export function analyzeExcelWorkbook(data: ArrayBuffer, settings: AppState['settings']): ExcelAnalysis {
  const sheets = previewWorkbookSheets(data)
  const imported = parseExcelWorkbook(data, {
    parties: [],
    vehicles: [],
    drivers: [],
    orders: [],
    settings,
  })
  const orders = imported.orders
  const parties = imported.parties
  const partyById = new Map(parties.map((p) => [p.id, p]))

  let km = 0
  let revenueKop = 0
  let carrierKop = 0
  let extraKop = 0
  let costKop = 0
  let vatKop = 0
  let withoutKm = 0
  let withoutRate = 0
  for (const o of orders) {
    km += o.distanceKm || 0
    revenueKop += o.clientRateKop
    carrierKop += o.carrierRateKop
    extraKop += o.extraExpenseKop
    costKop += calcTripCost(o).totalKop
    vatKop += vatAmount(o.clientRateKop, o.vatRate)
    if (!o.distanceKm) withoutKm += 1
    if (!o.clientRateKop) withoutRate += 1
  }

  return {
    sheets,
    imported,
    totals: {
      trips: orders.length,
      km,
      revenueKop,
      carrierKop,
      extraKop,
      costKop,
      vatKop,
      marginKop: marginKop(revenueKop, carrierKop, extraKop),
      withoutKm,
      withoutRate,
    },
    byClient: groupOrders(orders, (o) => partyById.get(o.clientId)?.name ?? ''),
    byRoute: groupOrders(orders, (o) =>
      o.fromCity || o.toCity ? `${o.fromCity || '—'} → ${o.toCity || '—'}` : '',
    ),
  }
}
