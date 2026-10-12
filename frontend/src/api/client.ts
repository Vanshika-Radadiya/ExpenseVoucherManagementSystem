import type { AuthResponse } from './types'

const refreshStorageKey = 'voucher.refreshToken'
const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''

let accessToken: string | null = null
let refreshInFlight: Promise<AuthResponse | null> | null = null

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getStoredRefreshToken() {
  return localStorage.getItem(refreshStorageKey)
}

function saveAuth(auth: AuthResponse) {
  accessToken = auth.accessToken
  localStorage.setItem(refreshStorageKey, auth.refreshToken)
}

export function clearAuth() {
  accessToken = null
  localStorage.removeItem(refreshStorageKey)
}

async function refreshAuth(): Promise<AuthResponse | null> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return null
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) throw new Error('Session refresh failed')
      const auth = (await response.json()) as AuthResponse
      saveAuth(auth)
      return auth
    } catch {
      clearAuth()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] }
    const message = payload.message
    if (Array.isArray(message)) return message.join(' ')
    if (message) return message
  } catch {
    // Use a status-based message when the response is not JSON.
  }
  return `Request failed (${response.status})`
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  canRefresh = true,
): Promise<T> {
  const apiPath = path.startsWith('/api/') ? path.slice(4) : path
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiBase}/api${apiPath}`, { ...init, headers })
  if (response.status === 401 && canRefresh && !apiPath.startsWith('/auth/')) {
    const auth = await refreshAuth()
    if (auth) return apiRequest<T>(path, init, false)
  }
  if (response.status === 401 && !apiPath.startsWith('/auth/')) {
    clearAuth()
    window.dispatchEvent(new Event('voucher:unauthorized'))
  }
  if (!response.ok) throw new ApiError(await parseError(response), response.status)
  if (response.status === 204) return undefined as T
  if (response.headers.get('content-type')?.includes('application/json')) {
    return (await response.json()) as T
  }
  return (await response.blob()) as T
}

export async function login(email: string, password: string) {
  const auth = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false)
  saveAuth(auth)
  return auth
}

export async function restoreSession() {
  return refreshAuth()
}

export async function logout() {
  const refreshToken = getStoredRefreshToken()
  try {
    if (refreshToken) {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    }
  } catch {
    // A failed revoke must not keep the local session active.
  } finally {
    clearAuth()
  }
}

export async function fetchSignature(path: string) {
  return apiRequest<Blob>(path)
}