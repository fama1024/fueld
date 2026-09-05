import apiClient from '@/lib/apiClient'

export type AssistantScope = 'today' | 'week'

export interface AssistantAnswer {
  answer: string
  scope: AssistantScope
  periodDate: string
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/**
 * Stellt eine Freitext-Frage ans Dashboard-Modell. Frage + Antwort werden serverseitig
 * als Chatverlauf gespeichert (gruppiert nach scope + Tag/Woche); Folgefragen im selben
 * Thread bekommen den bisherigen Verlauf als Kontext mit. `date` ist nur bei scope="today"
 * relevant (z.B. bei Dashboard Tage-Navigation auf einen vergangenen Tag) und markiert,
 * für welchen Tag gefragt wird – Default ist heute.
 */
export function askAssistant(question: string, scope: AssistantScope, date?: string) {
  return apiClient.post<AssistantAnswer>('/assistant/ask', { question, scope, date })
}

/** Bisheriger Chatverlauf für scope (+ optional date bei "today"). */
export function getAssistantMessages(scope: AssistantScope, date?: string) {
  return apiClient.get<AssistantMessage[]>('/assistant/messages', { params: { scope, date } })
}
