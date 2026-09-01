import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  res => res,
  err => {
    const isAuthEndpoint = err.config?.url?.startsWith('/auth/')
    // 401 = kein/ungültiger Token. 403 kann bei abgelaufenem Token ebenfalls
    // auftreten (Spring Security Default), daher hier gleich behandeln.
    const status = err.response?.status
    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default apiClient
