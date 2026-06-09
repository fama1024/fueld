import apiClient from '@/lib/apiClient'

interface AuthResponse {
  token: string
}

export function register(name: string, email: string, password: string) {
  return apiClient.post<AuthResponse>('/auth/register', { name, email, password })
}

export function login(email: string, password: string) {
  return apiClient.post<AuthResponse>('/auth/login', { email, password })
}
