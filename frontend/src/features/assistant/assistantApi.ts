import apiClient from '@/lib/apiClient'

export type AssistantScope = 'today' | 'week'

export interface AssistantAnswer {
  answer: string
  scope: AssistantScope
}

/**
 * Stellt eine Freitext-Frage ans Dashboard-Modell. One-Shot – die Antwort wird
 * nicht gespeichert, es gibt keinen Gesprächsverlauf. `scope` legt fest, ob die
 * Log-Einträge von heute oder der laufenden Woche als Kontext mitgeschickt werden.
 */
export function askAssistant(question: string, scope: AssistantScope) {
  return apiClient.post<AssistantAnswer>('/assistant/ask', { question, scope })
}
