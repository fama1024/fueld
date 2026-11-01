/** Lokales Datum eines Date-Objekts – .toISOString() würde die UTC-Kalenderdaten liefern, die kurz nach Mitternacht (Europe/Berlin ist UTC voraus) noch auf den Vortag zeigen. */
export function localDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayIso() {
  return localDateKey(new Date())
}

export function dateKeyOf(timestamp: string) {
  return localDateKey(new Date(timestamp))
}

export function dateLabel(isoDate: string) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (isoDate === todayIso()) return 'Heute'
  if (isoDate === localDateKey(yesterday)) return 'Gestern'
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}
