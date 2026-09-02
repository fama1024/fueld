import apiClient from '@/lib/apiClient'

export interface VapidKeyResponse {
  publicKey: string
  enabled: boolean
}

export interface PushSubscriptionRequest {
  endpoint: string
  p256dh: string
  auth: string
}

export function getVapidKey() {
  return apiClient.get<VapidKeyResponse>('/push/vapid-key')
}

export function savePushSubscription(data: PushSubscriptionRequest) {
  return apiClient.post<void>('/push/subscribe', data)
}

export function removePushSubscription(endpoint: string) {
  return apiClient.post<void>('/push/unsubscribe', { endpoint })
}

export function sendTestPush() {
  return apiClient.post<void>('/push/test')
}
