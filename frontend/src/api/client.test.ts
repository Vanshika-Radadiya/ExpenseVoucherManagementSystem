import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, clearAuth, login } from './client'
import type { AuthResponse } from './types'

const user = {
  id: 'user-1',
  email: 'employee@example.com',
  fullName: 'Alex Employee',
  employeeId: 'EMP-001',
  role: 'EMPLOYEE' as const,
}

function auth(accessToken: string, refreshToken: string): AuthResponse {
  return { user, accessToken, refreshToken }
}

describe('API authentication', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    clearAuth()
    vi.unstubAllGlobals()
  })

  it('rotates the refresh token and retries an unauthorized request once', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(auth('access-1', 'refresh-1')), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(auth('access-2', 'refresh-2')), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await login(user.email, 'password')
    const result = await apiRequest<{ items: unknown[] }>('/vouchers')

    expect(result.items).toEqual([])
    expect(localStorage.getItem('voucher.refreshToken')).toBe('refresh-2')
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[1][1]?.headers).toBeInstanceOf(Headers)
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer access-1')
    expect(new Headers(fetchMock.mock.calls[3][1]?.headers).get('Authorization')).toBe('Bearer access-2')
  })

  it('clears local authentication when refresh fails', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(auth('access-1', 'refresh-1')), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'invalid refresh' }), { status: 401, headers: { 'Content-Type': 'application/json' } }))

    await login(user.email, 'password')
    await expect(apiRequest('/vouchers')).rejects.toMatchObject({ status: 401 })

    expect(localStorage.getItem('voucher.refreshToken')).toBeNull()
  })
})