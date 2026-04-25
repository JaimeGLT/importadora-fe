const GQL_URL = import.meta.env.VITE_GQL_URL ?? 'https://usaautopartesapi20260406085513-amh4fwdnanbpa9gs.centralus-01.azurewebsites.net/graphql'

let refreshFn: (() => Promise<boolean>) | null = null
let logoutFn: (() => Promise<void>) | null = null

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  retry = false,
): Promise<T> {
  const response = await fetch(GQL_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  if (response.status === 401 && !retry && refreshFn) {
    const refreshed = await refreshFn()
    if (refreshed) {
      return gql<T>(query, variables, true)
    }
    if (logoutFn) {
      await logoutFn()
      window.location.href = '/login'
    }
    throw new Error('Sesión expirada')
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] }

  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }

  return json.data as T
}

export function initGqlCallbacks(refresh: () => Promise<boolean>, logout: () => Promise<void>) {
  refreshFn = refresh
  logoutFn = logout
}

export function clearGqlCallbacks() {
  refreshFn = null
  logoutFn = null
}