import apiClient from '@/lib/apiClient'

export type CalendarEntryType = 'meal' | 'workout' | 'weight'

export interface CalendarEntry {
  id: string
  date: string
  type: CalendarEntryType
}

export function getCalendar(month: string) {
  return apiClient.get<CalendarEntry[]>('/calendar', { params: { month } })
}
