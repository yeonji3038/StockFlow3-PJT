import axios from 'axios'
import { API_BASE_URL } from './apiBase'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (!original || original._retry) {
      return Promise.reject(error)
    }
    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }
    const url = String(original.url ?? '')
    if (url.includes('/api/auth/refresh') || url.includes('/api/auth/login')) {
      return Promise.reject(error)
    }

    try {
      await api.post('/api/auth/refresh')
      original._retry = true
      return api(original)
    } catch {
      return Promise.reject(error)
    }
  },
)
