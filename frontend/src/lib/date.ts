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

/** Montag der Woche von `d` um 00:00 Uhr lokaler Zeit. */
export function mondayOf(d: Date) {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export function dateLabel(isoDate: string) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (isoDate === todayIso()) return 'Heute'
  if (isoDate === localDateKey(yesterday)) return 'Gestern'
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}
