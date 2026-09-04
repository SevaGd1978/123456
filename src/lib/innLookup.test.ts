import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseDadataParty, parseEgrulExtract } from './innLookup.ts'

describe('innLookup parsers', () => {
  it('reads a legal entity from an EGRUL.org extract', () => {
    const draft = parseEgrulExtract({
      СвЮЛ: {
        '@attributes': {
          ОГРН: '1027700132195',
          ИНН: '7707083893',
          КПП: '773601001',
          КодОПФ: '12247',
          ПолнНаимОПФ: 'Публичные акционерные общества',
        },
        СвНаимЮЛ: {
          '@attributes': { НаимЮЛПолн: 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО "СБЕРБАНК РОССИИ"' },
          СвНаимЮЛСокр: { '@attributes': { НаимСокр: 'ПАО СБЕРБАНК' } },
        },
        СвАдресЮЛ: {
          АдресРФ: {
            '@attributes': { Индекс: '117312', Дом: 'Д.19' },
            Регион: { '@attributes': { НаимРегион: 'Г.МОСКВА' } },
            Улица: { '@attributes': { ТипУлица: 'УЛ.', НаимУлица: 'ВАВИЛОВА' } },
          },
        },
        СведДолжнФЛ: {
          СвФЛ: { '@attributes': { Фамилия: 'ГРЕФ', Имя: 'ГЕРМАН', Отчество: 'ОСКАРОВИЧ' } },
          СвДолжн: { '@attributes': { НаимДолжн: 'ПРЕЗИДЕНТ, ПРЕДСЕДАТЕЛЬ ПРАВЛЕНИЯ' } },
        },
      },
    })
    assert.equal(draft?.inn, '7707083893')
    assert.equal(draft?.kpp, '773601001')
    assert.equal(draft?.name, 'ПАО Сбербанк')
    assert.equal(draft?.legalForm, 'ao')
    assert.match(draft?.city ?? '', /Москва/)
    assert.match(draft?.address ?? '', /Вавилова/)
    assert.match(draft?.contact ?? '', /Греф/)
    assert.match(draft?.notes ?? '', /1027700132195/)
  })

  it('reads DaData findById payload', () => {
    const draft = parseDadataParty({
      value: 'ПАО Сбербанк',
      data: {
        inn: '7707083893',
        kpp: '773601001',
        type: 'LEGAL',
        ogrn: '1027700132195',
        name: { short_with_opf: 'ПАО Сбербанк', full_with_opf: 'ПАО Сбербанк' },
        address: { value: 'г Москва, ул Вавилова, д 19', data: { city: 'Москва', region: 'Москва' } },
        management: { name: 'Греф Герман Оскарович', post: 'Президент' },
        opf: { short: 'ПАО' },
        phones: [{ value: '+74955005550' }],
      },
    })
    assert.equal(draft?.name, 'ПАО Сбербанк')
    assert.equal(draft?.city, 'Москва')
    assert.equal(draft?.contact, 'Президент Греф Герман Оскарович')
    assert.equal(draft?.phone, '+74955005550')
  })
})
