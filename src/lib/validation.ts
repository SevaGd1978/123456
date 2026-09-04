import type { Order, Party, Vehicle, Driver } from '../types'
import { isValidInn } from './inn'
import { toKg } from './weight'

export type FieldIssue = { field: string; label: string; message: string }

export function partyIssues(p: Partial<Party>): FieldIssue[] {
  const out: FieldIssue[] = []
  if (!p.name?.trim()) out.push({ field: 'name', label: 'Наименование', message: 'обязательно' })
  if (!p.inn || !isValidInn(p.inn)) {
    out.push({ field: 'inn', label: 'ИНН', message: 'нужен корректный ИНН 10 или 12 цифр' })
  }
  return out
}

/** Fields needed to form an electronic consignment note (ЭТрН). */
export function epdReadiness(
  order: Order,
  parties: Party[],
  vehicles: Vehicle[],
  drivers: Driver[],
): FieldIssue[] {
  const issues: FieldIssue[] = []
  const need = (ok: boolean, field: string, label: string, message: string) => {
    if (!ok) issues.push({ field, label, message })
  }

  const client = parties.find((p) => p.id === order.clientId)
  const carrier = parties.find((p) => p.id === order.carrierId)
  const shipper = parties.find((p) => p.id === order.shipperId)
  const consignee = parties.find((p) => p.id === order.consigneeId)
  const vehicle = vehicles.find((v) => v.id === order.vehicleId)
  const driver = drivers.find((d) => d.id === order.driverId)

  need(Boolean(client), 'clientId', 'Клиент', 'не выбран')
  need(Boolean(carrier), 'carrierId', 'Перевозчик', 'не выбран')
  need(Boolean(shipper), 'shipperId', 'Грузоотправитель', 'не выбран')
  need(Boolean(consignee), 'consigneeId', 'Грузополучатель', 'не выбран')
  need(Boolean(order.cargo.trim()), 'cargo', 'Груз', 'не указан')
  need(order.volumeM3 > 0, 'volumeM3', 'Объём', 'обязательное поле для заявки ЭПД')
  need(order.weightValue > 0, 'weightValue', 'Вес', 'не указан')
  need(Boolean(order.fromCity.trim()), 'fromCity', 'Город погрузки', 'не указан')
  need(Boolean(order.toCity.trim()), 'toCity', 'Город выгрузки', 'не указан')
  need(Boolean(order.fromAddress.trim()), 'fromAddress', 'Адрес погрузки', 'не указан')
  need(Boolean(order.toAddress.trim()), 'toAddress', 'Адрес выгрузки', 'не указан')
  need(Boolean(vehicle), 'vehicleId', 'Транспорт', 'не выбран')
  need(Boolean(driver), 'driverId', 'Водитель', 'не выбран')

  if (vehicle) {
    need(Boolean(vehicle.plate), 'plate', 'Госномер ТС', 'пустой')
    // СТС и ИНН водителя — необязательны (как в актуальном ЭТрН), но полезны
  }
  if (shipper && !isValidInn(shipper.inn)) {
    issues.push({ field: 'shipperInn', label: 'ИНН грузоотправителя', message: 'некорректный' })
  }
  if (consignee && !isValidInn(consignee.inn)) {
    issues.push({ field: 'consigneeInn', label: 'ИНН грузополучателя', message: 'некорректный' })
  }

  const kg = toKg(order.weightValue, order.weightUnit)
  if (vehicle && kg > vehicle.capacityKg) {
    issues.push({
      field: 'weightValue',
      label: 'Вес груза',
      message: `превышает грузоподъёмность ТС (${vehicle.capacityKg} кг)`,
    })
  }

  return issues
}

export function orderSaveIssues(order: Order): FieldIssue[] {
  const issues: FieldIssue[] = []
  if (!order.clientId) issues.push({ field: 'clientId', label: 'Клиент', message: 'выберите клиента' })
  if (!order.cargo.trim()) issues.push({ field: 'cargo', label: 'Груз', message: 'укажите груз' })
  if (!order.fromCity.trim() || !order.toCity.trim()) {
    issues.push({ field: 'route', label: 'Маршрут', message: 'укажите города погрузки и выгрузки' })
  }
  return issues
}
