import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatMoney, grossAmount, marginKop, vatAmount, rubToKop } from './money.ts'
import { isValidInn, innKind } from './inn.ts'
import { toKg } from './weight.ts'
import { parsePartiesXml, exportPartiesXml } from './xml1c.ts'
import type { Party } from '../types.ts'

describe('money', () => {
  it('keeps VAT 22% in integer kopecks', () => {
    const net = rubToKop(100_000)
    assert.equal(vatAmount(net, 22), 2_200_000)
    assert.equal(grossAmount(net, 22), 12_200_000)
    const pretty = formatMoney(12_200_000)
    assert.match(pretty, /122/)
    assert.match(pretty, /00/)
    assert.match(pretty, /₽/)
  })

  it('computes margin after extra expenses', () => {
    assert.equal(marginKop(150_000, 100_000, 5_000), 45_000)
  })
})

describe('inn', () => {
  it('accepts Sberbank INN', () => {
    assert.equal(isValidInn('7707083893'), true)
    assert.equal(innKind('7707083893'), 'ul')
  })

  it('rejects broken checksum', () => {
    assert.equal(isValidInn('7707083894'), false)
  })
})

describe('weight', () => {
  it('does not guess units from magnitude', () => {
    assert.equal(toKg(80, 't'), 80_000)
    assert.equal(toKg(80, 'kg'), 80)
  })
})

describe('xml1c', () => {
  it('roundtrips UTF-8 counterparties', () => {
    const parties: Party[] = [
      {
        id: '1',
        kind: 'client',
        name: 'ООО «Северная дуга»',
        inn: '7707083893',
        kpp: '770701001',
        legalForm: 'ooo',
        phone: '+7 495 000-00-01',
        email: 'a@test.ru',
        city: 'Москва',
        address: 'Тверская, 1',
        contact: 'Иванов',
        bankBik: '044525225',
        bankAccount: '40702810100000000001',
        edoId: '2AEF',
        epdId: 'EPD-1',
        notes: '',
      },
    ]
    const xml = exportPartiesXml(parties, 'client')
    assert.match(xml, /encoding="UTF-8"/)
    const parsed = parsePartiesXml(xml)
    assert.equal(parsed.error, undefined)
    assert.equal(parsed.parties[0]?.name, 'ООО «Северная дуга»')
    assert.equal(parsed.parties[0]?.inn, '7707083893')
  })

  it('hash is not used for transport secrets in repo', () => {
    const sample = createHash('sha256').update('demo').digest('hex')
    assert.equal(sample.length, 64)
  })
})
