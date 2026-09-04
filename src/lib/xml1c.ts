import type { Order, Party, VatRate } from '../types'
import { formatMoney, vatAmount, grossAmount } from './money'
import { formatWeight } from './weight'

function xmlEscape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function vatCode(rate: VatRate): string {
  if (rate === 0) return 'БезНДС'
  return `НДС${rate}`
}

export function exportDocumentsXml(
  orders: Order[],
  parties: Party[],
  company: Party,
): string {
  const rows = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'draft')
    .map((o) => {
      const client = parties.find((p) => p.id === o.clientId)
      const carrier = parties.find((p) => p.id === o.carrierId)
      const vat = vatAmount(o.clientRateKop, o.vatRate)
      const gross = grossAmount(o.clientRateKop, o.vatRate)
      return `    <Документ тип="Реализация" номер="${xmlEscape(o.number)}" дата="${o.loadingDate}" срокОплаты="${o.paymentDueDate}">
      <Контрагент инн="${xmlEscape(client?.inn ?? '')}" кпп="${xmlEscape(client?.kpp ?? '')}" наименование="${xmlEscape(client?.name ?? '')}"/>
      <Исполнитель инн="${xmlEscape(carrier?.inn ?? '')}" наименование="${xmlEscape(carrier?.name ?? '')}"/>
      <Маршрут погрузка="${xmlEscape(o.fromCity)}" выгрузка="${xmlEscape(o.toCity)}"/>
      <Груз наименование="${xmlEscape(o.cargo)}" вес="${xmlEscape(formatWeight(o.weightValue, o.weightUnit))}" объем="${o.volumeM3}" тара="${xmlEscape(o.packingCode)}"/>
      <Суммы нетто="${formatMoney(o.clientRateKop)}" ндс="${formatMoney(vat)}" ставка="${vatCode(o.vatRate)}" всего="${formatMoney(gross)}"/>
      <Услуги>
        <Строка ном="1" наименование="Транспортно-экспедиционные услуги, заявка ${xmlEscape(o.number)}" кол="1" ед="шт" цена="${formatMoney(o.clientRateKop)}" сумма="${formatMoney(o.clientRateKop)}"/>
      </Услуги>
    </Документ>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Обмен источник="ReisOffice" версия="1.0" фирмаИНН="${xmlEscape(company.inn)}" фирма="${xmlEscape(company.name)}" создан="${new Date().toISOString()}">
  <Документы>
${rows || '    <!-- нет документов для выгрузки -->'}
  </Документы>
</Обмен>
`
}

export function exportPartiesXml(parties: Party[], kind: Party['kind'] | 'all'): string {
  const list = kind === 'all' ? parties : parties.filter((p) => p.kind === kind)
  const rows = list
    .map(
      (p) =>
        `    <Контрагент вид="${p.kind}" инн="${xmlEscape(p.inn)}" кпп="${xmlEscape(p.kpp)}" наименование="${xmlEscape(p.name)}" город="${xmlEscape(p.city)}" телефон="${xmlEscape(p.phone)}" эдо="${xmlEscape(p.edoId)}" эпд="${xmlEscape(p.epdId)}"/>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<Обмен источник="ReisOffice" версия="1.0" создан="${new Date().toISOString()}">
  <Контрагенты>
${rows}
  </Контрагенты>
</Обмен>
`
}

export type ParsedParty = { inn: string; name: string; kpp: string; city: string; phone: string }

export function parsePartiesXml(xml: string): { parties: ParsedParty[]; error?: string } {
  if (!xml.includes('<') || xml.includes('\uFFFD')) {
    return { parties: [], error: 'Файл не похож на XML или открыт в неверной кодировке. Нужен UTF-8.' }
  }
  const parties: ParsedParty[] = []
  const re = /<Контрагент([^>]*)\/?>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const attrs = m[1]
    const get = (name: string) => {
      const a = attrs.match(new RegExp(`${name}="([^"]*)"`))
      return a ? a[1] : ''
    }
    const inn = get('инн') || get('inn')
    const name = get('наименование') || get('name')
    if (!inn && !name) continue
    parties.push({
      inn,
      name,
      kpp: get('кпп') || get('kpp'),
      city: get('город') || get('city'),
      phone: get('телефон') || get('phone'),
    })
  }
  if (!parties.length) {
    return { parties: [], error: 'В файле нет узлов «Контрагент». Проверьте формат выгрузки.' }
  }
  return { parties }
}

export function downloadTextFile(filename: string, content: string, mime = 'application/xml;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
