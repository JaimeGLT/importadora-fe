/**
 * Wrapper centralizado para llamadas GraphQL.
 * Todos los componentes deben usar gql() — nunca fetch() directo.
 */

const GQL_URL = import.meta.env.VITE_GQL_URL ?? 'http://usaautopartesapi20260406085513-amh4fwdnanbpa9gs.centralus-01.azurewebsites.net/graphql'

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(GQL_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] }

  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }

  return json.data as T
}
