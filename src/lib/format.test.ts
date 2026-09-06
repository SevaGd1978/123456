import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatPersonName, formatSiteContact } from './format.ts'

describe('site contact', () => {
  it('joins first name, last name and phone', () => {
    assert.equal(formatPersonName('Иван', 'Иванов'), 'Иван Иванов')
    assert.equal(formatSiteContact('Иван', 'Иванов', '+7 900 111-22-33'), 'Иван Иванов, +7 900 111-22-33')
  })

  it('falls back to whatever is filled', () => {
    assert.equal(formatSiteContact('', '', '+7 900 000-00-00'), '+7 900 000-00-00')
    assert.equal(formatSiteContact('Ольга', '', ''), 'Ольга')
    assert.equal(formatSiteContact('', '', ''), '—')
  })
})
