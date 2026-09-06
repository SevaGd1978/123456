import { innKind, isValidInn } from './inn'
import type { Party } from '../types'

export type PartyDraft = Pick<
  Party,
  'name' | 'inn' | 'kpp' | 'legalForm' | 'phone' | 'email' | 'city' | 'address' | 'contact' | 'notes'
>

export type InnLookupResult = {
  draft: PartyDraft
  source: string
  sourceUrl: string
}

type Json = Record<string, unknown>

function asObj(v: unknown): Json | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null
}

function firstObj(v: unknown): Json | null {
  if (Array.isArray(v)) return asObj(v[0])
  return asObj(v)
}

function attrs(node: unknown): Record<string, string> {
  const obj = asObj(node)
  if (!obj) return {}
  const a = asObj(obj['@attributes'])
  if (a) {
    const out: Record<string, string> = {}
    for (const [k, val] of Object.entries(a)) if (typeof val === 'string') out[k] = val
    return out
  }
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(obj)) if (typeof val === 'string') out[k] = val
  return out
}

function attr(node: unknown, key: string): string {
  return attrs(node)[key] ?? ''
}

function prettyCaps(s: string): string {
  const raw = s.replaceAll('\\"', '"').trim()
  if (!raw) return ''
  const quoted = raw.replace(/"([^"]+)"/g, '«$1»')
  if (quoted !== quoted.toUpperCase()) return quoted
  const keep = new Set(['ПАО', 'АО', 'ООО', 'ЗАО', 'ОАО', 'НАО', 'ИП', 'ПАО', 'ГУП', 'МУП'])
  return quoted
    .split(/(\s+|«|»)/)
    .map((w) => {
      if (!w || keep.has(w) || w === '«' || w === '»' || !/[А-ЯA-Z]/.test(w[0] ?? '')) return w
      return w[0] + w.slice(1).toLowerCase()
    })
    .join('')
}

function parseAddress(svAddr: unknown): { city: string; address: string } {
  const root = asObj(svAddr)
  const rf = firstObj(root?.АдресРФ) ?? root
  const a = attrs(rf)
  const region = prettyCaps(attr(asObj(rf)?.Регион, 'НаимРегион').replace(/^Г\.\s*/i, ''))
  const cityRaw =
    attr(asObj(rf)?.Город, 'НаимГород') ||
    attr(asObj(rf)?.НаселПункт, 'НаимНаселПункт') ||
    attr(asObj(rf)?.Регион, 'НаимРегион')
  const city = prettyCaps(cityRaw.replace(/^Г\.\s*/i, ''))
  const streetType = attr(asObj(rf)?.Улица, 'ТипУлица')
  const street = prettyCaps(attr(asObj(rf)?.Улица, 'НаимУлица'))
  const house = (a.Дом || '').replace(/^Д\.\s*/i, 'д. ')
  const parts = [a.Индекс, region && region !== city ? region : '', city, [streetType, street].filter(Boolean).join(' '), house].filter(
    Boolean,
  )
  return { city, address: parts.join(', ') }
}

function parseBoss(sv: unknown): string {
  const node = firstObj(sv)
  const fl = attrs(asObj(node)?.СвФЛ)
  const job = attr(asObj(node)?.СвДолжн, 'НаимДолжн')
  const fio = [fl.Фамилия, fl.Имя, fl.Отчество].filter(Boolean).map(prettyCaps).join(' ')
  if (!fio) return ''
  return job ? `${prettyCaps(job)} ${fio}` : fio
}

function legalFromOpf(code: string, name: string): Party['legalForm'] {
  const n = `${code} ${name}`.toLowerCase()
  if (n.includes('индивидуальн') || code.startsWith('5')) return 'ip'
  if (n.includes('акционер') || code.startsWith('122')) return 'ao'
  return 'ooo'
}

/** Parse a free EGRUL.org extract (ЕГРЮЛ / ЕГРИП as JSON). */
export function parseEgrulExtract(data: unknown): PartyDraft | null {
  const root = asObj(data)
  if (!root) return null
  if (root.СвЮЛ) {
    const ul = asObj(root.СвЮЛ)!
    const head = attrs(ul)
    const nameNode = asObj(ul.СвНаимЮЛ)
    const full = prettyCaps(attr(nameNode, 'НаимЮЛПолн'))
    const short = prettyCaps(attr(asObj(nameNode)?.СвНаимЮЛСокр, 'НаимСокр'))
    const addr = parseAddress(ul.СвАдресЮЛ)
    return {
      name: short || full,
      inn: head.ИНН ?? '',
      kpp: head.КПП ?? '',
      legalForm: legalFromOpf(head.КодОПФ ?? '', head.ПолнНаимОПФ ?? ''),
      phone: '',
      email: '',
      city: addr.city,
      address: addr.address,
      contact: parseBoss(ul.СведДолжнФЛ),
      notes: [head.ОГРН ? `ОГРН ${head.ОГРН}` : '', full && full !== short ? full : ''].filter(Boolean).join('. '),
    }
  }
  if (root.СвИП) {
    const ip = asObj(root.СвИП)!
    const head = attrs(ip)
    const fl = attrs(asObj(ip.СвФЛ) ?? asObj(ip.СвФИО))
    const fio = ['ИП', fl.Фамилия, fl.Имя, fl.Отчество].filter(Boolean).map(prettyCaps).join(' ')
    const addr = parseAddress(ip.СвАдрМЖ ?? ip.СвАдресЭл ?? ip.АдресМЖ)
    return {
      name: fio || `ИП ${head.ИНН ?? ''}`.trim(),
      inn: head.ИНН ?? '',
      kpp: '',
      legalForm: 'ip',
      phone: '',
      email: '',
      city: addr.city,
      address: addr.address,
      contact: fio,
      notes: head.ОГРНИП ? `ОГРНИП ${head.ОГРНИП}` : '',
    }
  }
  return null
}

type DadataParty = {
  value?: string
  data?: {
    inn?: string
    kpp?: string
    type?: string
    name?: { short_with_opf?: string; full_with_opf?: string }
    address?: { value?: string; data?: { city?: string; settlement?: string; region?: string } }
    management?: { name?: string; post?: string }
    opf?: { short?: string; type?: string }
    emails?: { value?: string }[]
    phones?: { value?: string }[]
    ogrn?: string
  }
}

export function parseDadataParty(suggestion: DadataParty): PartyDraft | null {
  const d = suggestion.data
  if (!d) return null
  const name = d.name?.short_with_opf || d.name?.full_with_opf || suggestion.value || ''
  const city = d.address?.data?.city || d.address?.data?.settlement || d.address?.data?.region || ''
  const contact = [d.management?.post, d.management?.name].filter(Boolean).join(' ')
  const legalForm: Party['legalForm'] =
    d.type === 'INDIVIDUAL' || d.opf?.type === 'INDIVIDUAL' ? 'ip' : d.opf?.short?.includes('АО') ? 'ao' : 'ooo'
  return {
    name,
    inn: d.inn ?? '',
    kpp: d.kpp ?? '',
    legalForm,
    phone: d.phones?.[0]?.value ?? '',
    email: d.emails?.[0]?.value ?? '',
    city,
    address: d.address?.value ?? '',
    contact,
    notes: d.ogrn ? `ОГРН ${d.ogrn}` : '',
  }
}

async function lookupEgrulOrg(inn: string): Promise<InnLookupResult | null> {
  const res = await fetch(`https://egrul.org/${inn}.json`, {
    headers: { Accept: 'application/json' },
  })
  const text = await res.text()
  if (!res.ok || text.startsWith('Контент доступен') || text.startsWith('<')) return null
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  const draft = parseEgrulExtract(data)
  if (!draft?.name) return null
  return {
    draft,
    source: 'ЕГРЮЛ.org (открытая выписка ФНС)',
    sourceUrl: `https://egrul.org/${inn}.json`,
  }
}

async function lookupDadata(inn: string, token: string): Promise<InnLookupResult | null> {
  const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${token.trim()}`,
    },
    body: JSON.stringify({ query: inn, branch_type: 'MAIN' }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as { suggestions?: DadataParty[] }
  const first = json.suggestions?.[0]
  if (!first) return null
  const draft = parseDadataParty(first)
  if (!draft?.name) return null
  return {
    draft,
    source: 'Дадата (бесплатно до 10 000 запросов/сутки, данные ФНС)',
    sourceUrl: 'https://dadata.ru/api/find-party/',
  }
}

export async function lookupPartyByInn(
  innRaw: string,
  options: { dadataToken?: string } = {},
): Promise<InnLookupResult> {
  const inn = innRaw.replace(/\D/g, '')
  if (!isValidInn(inn)) {
    throw new Error(innKind(inn) === 'invalid' ? 'Сначала укажите корректный ИНН (10 или 12 цифр)' : 'ИНН не проходит проверку')
  }

  const errors: string[] = []

  try {
    const free = await lookupEgrulOrg(inn)
    if (free) return free
    errors.push('ЕГРЮЛ.org не отдал открытую выписку по этому ИНН')
  } catch (e) {
    errors.push(`ЕГРЮЛ.org: ${e instanceof Error ? e.message : 'сеть'}`)
  }

  const token = options.dadataToken?.trim()
  if (token) {
    try {
      const paid = await lookupDadata(inn, token)
      if (paid) return paid
      errors.push('Дадата не нашла организацию')
    } catch (e) {
      errors.push(`Дадата: ${e instanceof Error ? e.message : 'сеть'}`)
    }
  } else {
    errors.push(
      'Для любого ИНН добавьте бесплатный токен Дадаты в настройках (dadata.ru, 10 000 запросов/сутки)',
    )
  }

  throw new Error(errors.join('. '))
}

export function blankParty(kind: Party['kind'] = 'client'): Party {
  return {
    id: `p-${Date.now()}`,
    kind,
    name: '',
    inn: '',
    kpp: '',
    legalForm: 'ooo',
    phone: '',
    email: '',
    city: '',
    address: '',
    contact: '',
    bankBik: '',
    bankAccount: '',
    edoId: '',
    epdId: '',
    notes: '',
  }
}

export function applyDraft(party: Party, draft: PartyDraft): Party {
  return {
    ...party,
    name: draft.name || party.name,
    inn: draft.inn || party.inn,
    kpp: draft.kpp || party.kpp,
    legalForm: draft.legalForm,
    phone: draft.phone || party.phone,
    email: draft.email || party.email,
    city: draft.city || party.city,
    address: draft.address || party.address,
    contact: draft.contact || party.contact,
    notes: [party.notes, draft.notes].filter(Boolean).join(party.notes && draft.notes ? '\n' : ''),
  }
}
