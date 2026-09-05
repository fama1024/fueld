import apiClient from '@/lib/apiClient'

export type AssistantScope = 'today' | 'range7'

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
 * als Chatverlauf gespeichert (Thread-Schlüssel: scope + Tag); Folgefragen im selben
 * Thread bekommen den bisherigen Verlauf als Kontext mit. `date` ist der gewählte Tag
 * (Dashboard Tage-Navigation, Default heute) – bei scope="range7" das Ende des
 * 7-Tage-Fensters, bei scope="today" der einzelne gefragte Tag.
 */
export function askAssistant(question: string, scope: AssistantScope, date?: string) {
  return apiClient.post<AssistantAnswer>('/assistant/ask', { question, scope, date })
}

/** Bisheriger Chatverlauf für einen scope+date-Thread. */
export function getAssistantMessages(scope: AssistantScope, date?: string) {
  return apiClient.get<AssistantMessage[]>('/assistant/messages', { params: { scope, date } })
}
