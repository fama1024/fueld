import type { WeekBarDay } from '@/components/WeekBars'
import type { FocusItem } from '@/components/FocusHint'
import type { DayTotal } from '@/features/meals/mealApi'
import type { GoalsData } from '@/features/profile/profileApi'
import { localDateKey, mondayOf } from '@/lib/date'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const CALORIES_IN_TARGET = { min: 0.8, max: 1.15 }
const PROTEIN_IN_TARGET_MIN = 0.8
const FOCUS_CALORIES = { low: 0.85, high: 1.1 }
const FOCUS_PROTEIN = { low: 0.9, high: 1.3 }

export function isInTarget(day: DayTotal, goals: GoalsData) {
  if (goals.calories <= 0 || goals.protein <= 0) return false
  const calories = day.calories / goals.calories
  return calories >= CALORIES_IN_TARGET.min
    && calories <= CALORIES_IN_TARGET.max
    && day.protein / goals.protein >= PROTEIN_IN_TARGET_MIN
}

/** Laufende Woche Mo–So aus den Tageswerten. Ein Balken ist voll, sobald der Tag die Obergrenze erreicht. */
export function buildWeek(trend: DayTotal[], goals: GoalsData, now = new Date()): WeekBarDay[] {
  const today = localDateKey(now)
  const monday = mondayOf(now)
  return WEEKDAYS.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const key = localDateKey(date)
    const day = trend.find(d => d.date === key)
    const ratio = day && goals.calories > 0 ? day.calories / goals.calories / CALORIES_IN_TARGET.max : 0
    return {
      label,
      value: Math.min(100, Math.round(ratio * 100)),
      inTarget: !!day && isInTarget(day, goals),
      today: key === today,
    }
  })
}

/** Ø der abgeschlossenen Tage mit Einträgen. Heute zählt nicht mit, weil der Tag noch läuft. */
export function averageOfLoggedDays(trend: DayTotal[], now = new Date()) {
  const today = localDateKey(now)
  const logged = trend.filter(d => d.date !== today && d.calories > 0)
  if (logged.length === 0) return null
  return {
    calories: logged.reduce((sum, d) => sum + d.calories, 0) / logged.length,
    protein: logged.reduce((sum, d) => sum + d.protein, 0) / logged.length,
  }
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

  if (calories < FOCUS_CALORIES.low) {
    items.push({ direction: 'more', text: 'Bei den Kalorien ist noch Luft, etwas mehr bietet sich an.' })
  } else if (calories > FOCUS_CALORIES.high) {
    items.push({ direction: 'less', text: 'Bei den Kalorien darf es diese Woche etwas leichter werden.' })
  }

  if (protein < FOCUS_PROTEIN.low) {
    items.push({ direction: 'more', text: 'Etwas mehr Protein bietet sich an.' })
  } else if (protein > FOCUS_PROTEIN.high) {
    items.push({ direction: 'less', text: 'Beim Protein reicht gerade auch etwas weniger.' })
  }

  return items.length > 0
    ? items
    : [{ direction: 'ok', text: 'Kalorien und Protein passen gerade gut. Weiter so.' }]
}

export function proteinTendency(trend: DayTotal[], goals: GoalsData, now = new Date()) {
  const average = averageOfLoggedDays(trend, now)
  if (!average || goals.protein <= 0) return 'offen'
  const protein = average.protein / goals.protein
  if (protein < FOCUS_PROTEIN.low) return 'ausbaufähig'
  return protein > FOCUS_PROTEIN.high ? 'reichlich' : 'gut'
}
