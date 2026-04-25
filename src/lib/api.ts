/**
 * Wrapper centralizado para llamadas REST.
 * Todos los componentes deben usar esta función — nunca fetch() directo.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://usaautopartesapi20260406085513-amh4fwdnanbpa9gs.centralus-01.azurewebsites.net/api'

function serializeBody(body: unknown): string {
  const json = JSON.stringify(body)
  return json.replace(/"(costo|precio|conversionABs)":(-?\d+)(?![.\d])/g, '"$1":$2.0')
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  _retry?: boolean
}

let refreshFn: (() => Promise<boolean>) | null = null
let logoutFn: (() => Promise<void>) | null = null

export function setAuthCallbacks(refresh: () => Promise<boolean>, logout: () => Promise<void>) {
  refreshFn = refresh
  logoutFn = logout
}

export function clearAuthCallbacks() {
  refreshFn = null
  logoutFn = null
}

async function requestWithInterceptor<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, _retry, ...rest } = options

  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? serializeBody(body) : undefined,
    ...rest,
  })

  if (response.status === 401 && !_retry && refreshFn) {
    const refreshed = await refreshFn()
    if (refreshed) {
      return requestWithInterceptor<T>(path, { ...options, _retry: true })
    }
    if (logoutFn) {
      await logoutFn()
      window.location.href = '/login'
    }
    throw new Error('Sesión expirada')
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    try {
      const json = JSON.parse(text) as { error?: string; title?: string }
      throw new Error(json.error ?? json.title ?? text)
    } catch {
      throw new Error(text || `HTTP ${response.status}`)
    }
  }

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function requestNoIntercept<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? serializeBody(body) : undefined,
    ...rest,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    try {
      const json = JSON.parse(text) as { error?: string; title?: string }
      throw new Error(json.error ?? json.title ?? text)
    } catch {
      throw new Error(text || `HTTP ${response.status}`)
    }
  }

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    requestWithInterceptor<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestWithInterceptor<T>(path, { method: 'POST', body, ...options }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestWithInterceptor<T>(path, { method: 'PUT', body, ...options }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestWithInterceptor<T>(path, { method: 'PATCH', body, ...options }),

  delete: <T>(path: string, options?: RequestOptions) =>
    requestWithInterceptor<T>(path, { method: 'DELETE', ...options }),
}

export const apiInternal = {
  get: <T>(path: string, options?: RequestOptions) =>
    requestNoIntercept<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestNoIntercept<T>(path, { method: 'POST', body, ...options }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestNoIntercept<T>(path, { method: 'PUT', body, ...options }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestNoIntercept<T>(path, { method: 'PATCH', body, ...options }),

  delete: <T>(path: string, options?: RequestOptions) =>
    requestNoIntercept<T>(path, { method: 'DELETE', ...options }),
}