import type { FocusItem } from '@/components/FocusHint'
import type { GridDay, MacroKey, MacroRow } from '@/components/MacroGrid'
import type { DayTotal } from '@/features/meals/mealApi'
import type { GoalsData } from '@/features/profile/profileApi'
import { localDateKey } from '@/lib/date'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MACROS: MacroKey[] = ['calories', 'protein', 'carbs', 'fat']

const CALORIES_IN_TARGET = { min: 0.8, max: 1.15 }
const PROTEIN_IN_TARGET_MIN = 0.8
const FOCUS_CALORIES = { low: 0.85, high: 1.1 }
const FOCUS_PROTEIN = { low: 0.9, high: 1.3 }

function isLogged(day: DayTotal) {
  return day.calories > 0 || day.protein > 0 || day.carbs > 0 || day.fat > 0
}

function percent(value: number, goal: number) {
  return goal > 0 ? Math.round((value / goal) * 100) : null
}

export function isInTarget(day: DayTotal, goals: GoalsData) {
  if (goals.calories <= 0 || goals.protein <= 0) return false
  const calories = day.calories / goals.calories
  return calories >= CALORIES_IN_TARGET.min
    && calories <= CALORIES_IN_TARGET.max
    && day.protein / goals.protein >= PROTEIN_IN_TARGET_MIN
}

export function daysInTarget(trend: DayTotal[], goals: GoalsData) {
  return trend.filter(day => isInTarget(day, goals)).length
}

/** Ø der abgeschlossenen Tage mit Einträgen. Heute zählt nicht mit, weil der Tag noch läuft. */
export function averageOfLoggedDays(trend: DayTotal[], now = new Date()) {
  const today = localDateKey(now)
  const logged = trend.filter(day => day.date !== today && isLogged(day))
  if (logged.length === 0) return null
  const average = (macro: MacroKey) => logged.reduce((sum, day) => sum + day[macro], 0) / logged.length
  return {
    calories: average('calories'),
    protein: average('protein'),
    carbs: average('carbs'),
    fat: average('fat'),
  }
}

/** Letzte 7 Tage als Prozent vom Tagesziel, heute steht rechts. Tage ohne Einträge sind null. */
export function buildMacroGrid(trend: DayTotal[], goals: GoalsData, now = new Date()) {
  const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date))
  const today = localDateKey(now)
  const average = averageOfLoggedDays(sorted, now)

  const days: GridDay[] = sorted.map(day => ({
    label: WEEKDAYS[new Date(day.date + 'T00:00:00').getDay()],
    today: day.date === today,
  }))
  const rows: MacroRow[] = MACROS.map(macro => ({
    macro,
    values: sorted.map(day => (isLogged(day) ? percent(day[macro], goals[macro]) : null)),
    average: average ? percent(average[macro], goals[macro]) : null,
  }))
  return { days, rows }
}

/** Richtung für die nächsten Tage. Formulierungen bleiben einladend und bewerten nichts Vergangenes. */
export function buildFocus(trend: DayTotal[], goals: GoalsData, now = new Date()): FocusItem[] {
  const average = averageOfLoggedDays(trend, now)
  if (!average || goals.calories <= 0 || goals.protein <= 0) {
    return [{ direction: 'ok', text: 'Trag ein paar Tage ein, dann siehst du hier, worauf du achten kannst.' }]
  }

  const items: FocusItem[] = []
  const calories = average.calories / goals.calories
  const protein = average.protein / goals.protein
  const share = (ratio: number) => `im Schnitt ${Math.round(ratio * 100)} % vom Ziel`

  if (calories < FOCUS_CALORIES.low) {
    items.push({ direction: 'more', text: `Bei den Kalorien ist noch Luft: ${share(calories)}.` })
  } else if (calories > FOCUS_CALORIES.high) {
    items.push({ direction: 'less', text: `Bei den Kalorien darf es etwas leichter werden: ${share(calories)}.` })
  }

  if (protein < FOCUS_PROTEIN.low) {
    items.push({ direction: 'more', text: `Etwas mehr Protein bietet sich an: ${share(protein)}.` })
  } else if (protein > FOCUS_PROTEIN.high) {
    items.push({ direction: 'less', text: `Beim Protein reicht gerade auch etwas weniger: ${share(protein)}.` })
  }

  return items.length > 0
    ? items
    : [{ direction: 'ok', text: 'Kalorien und Protein passen gerade gut. Weiter so.' }]
}
