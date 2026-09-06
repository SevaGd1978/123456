/** INN checksum for 10-digit (legal entity) and 12-digit (person / IP). */
export function isValidInn(inn: string): boolean {
  const d = inn.replace(/\D/g, '')
  if (d.length === 10) {
    const k = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    const sum = k.reduce((s, w, i) => s + w * Number(d[i]), 0)
    return (sum % 11) % 10 === Number(d[9])
  }
  if (d.length === 12) {
    const k1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
    const k2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
    const n11 = (k1.reduce((s, w, i) => s + w * Number(d[i]), 0) % 11) % 10
    const n12 = (k2.reduce((s, w, i) => s + w * Number(d[i]), 0) % 11) % 10
    return n11 === Number(d[10]) && n12 === Number(d[11])
  }
  return false
}

export function innKind(inn: string): 'ul' | 'fl' | 'invalid' {
  const d = inn.replace(/\D/g, '')
  if (d.length === 10 && isValidInn(d)) return 'ul'
  if (d.length === 12 && isValidInn(d)) return 'fl'
  return 'invalid'
}

export function formatInn(inn: string): string {
  return inn.replace(/\D/g, '')
}
