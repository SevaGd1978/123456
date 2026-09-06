import { MapPinned } from 'lucide-react'
import { googleMapsDirectionsUrl, openGoogleMapsRoute } from '../lib/googleMaps'
import { Btn } from './ui'

export function GoogleMapButton({
  fromCity,
  toCity,
  fromAddress = '',
  toAddress = '',
  tone = 'moss',
  label = 'Карта',
}: {
  fromCity: string
  toCity: string
  fromAddress?: string
  toAddress?: string
  tone?: 'gold' | 'moss' | 'ghost'
  label?: string
}) {
  const url = googleMapsDirectionsUrl(fromCity, toCity, fromAddress, toAddress)
  return (
    <Btn
      type="button"
      tone={tone}
      disabled={!url}
      title={url ? 'Открыть маршрут в Google Картах' : 'Сначала укажите города погрузки и выгрузки'}
      onClick={() => openGoogleMapsRoute(fromCity, toCity, fromAddress, toAddress)}
    >
      <MapPinned size={16} />
      {label}
    </Btn>
  )
}
