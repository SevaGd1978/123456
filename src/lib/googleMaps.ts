/** Build a Google Maps driving-directions URL for a trip. */

export function mapsPlace(city: string, address = ''): string {
  const parts = [city.trim(), address.trim()].filter(Boolean)
  if (!parts.length) return ''
  const joined = parts.join(', ')
  if (/росси|russia/i.test(joined)) return joined
  return `${joined}, Россия`
}

export function googleMapsDirectionsUrl(
  fromCity: string,
  toCity: string,
  fromAddress = '',
  toAddress = '',
): string | null {
  const origin = mapsPlace(fromCity, fromAddress)
  const destination = mapsPlace(toCity, toAddress)
  if (!origin || !destination) return null
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('travelmode', 'driving')
  return url.toString()
}

export function openGoogleMapsRoute(
  fromCity: string,
  toCity: string,
  fromAddress = '',
  toAddress = '',
): boolean {
  const url = googleMapsDirectionsUrl(fromCity, toCity, fromAddress, toAddress)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
