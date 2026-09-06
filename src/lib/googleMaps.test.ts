import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { googleMapsDirectionsUrl, mapsPlace } from './googleMaps.ts'

describe('googleMaps', () => {
  it('builds a driving directions URL with city and street', () => {
    const url = googleMapsDirectionsUrl('Москва', 'Казань', 'терминал А', 'склад B')
    assert.ok(url)
    const parsed = new URL(url!)
    assert.equal(parsed.origin + parsed.pathname, 'https://www.google.com/maps/dir/')
    assert.equal(parsed.searchParams.get('api'), '1')
    assert.equal(parsed.searchParams.get('travelmode'), 'driving')
    assert.equal(parsed.searchParams.get('origin'), 'Москва, терминал А, Россия')
    assert.equal(parsed.searchParams.get('destination'), 'Казань, склад B, Россия')
  })

  it('returns null without both ends of the trip', () => {
    assert.equal(googleMapsDirectionsUrl('', 'Казань'), null)
    assert.equal(googleMapsDirectionsUrl('Москва', ''), null)
  })

  it('does not duplicate the country suffix', () => {
    assert.equal(mapsPlace('Москва, Россия', ''), 'Москва, Россия')
  })
})
