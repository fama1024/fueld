import apiClient from '@/lib/apiClient'

export type InsightType = 'daily' | 'weekly'

export interface InsightResponse {
  id: string
  type: InsightType
  periodStart: string
  periodEnd: string
  content: string
  createdAt: string
}

export function generateInsight(type: InsightType = 'weekly') {
  return apiClient.post<InsightResponse>(`/insights/generate?type=${type}`, {})
}

export function regenerateInsight(id: string) {
  return apiClient.post<InsightResponse>(`/insights/${id}/regenerate`, {})
}

export function getInsightHistory(type?: InsightType) {
  const url = type ? `/insights?type=${type}` : '/insights'
  return apiClient.get<InsightResponse[]>(url)
}
