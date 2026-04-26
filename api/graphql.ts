export const runtime = 'edge'

const BACKEND = 'https://usaautopartesapi20260406085513-amh4fwdnanbpa9gs.centralus-01.azurewebsites.net'

function rewriteSetCookie(setCookieValue: string | null, targetDomain: string): string {
  if (!setCookieValue) return ''

  return setCookieValue.split(', ').map(cookie => {
    const domainMatch = cookie.match(/domain=([^;]+)/i)
    if (domainMatch) {
      return cookie.replace(`domain=${domainMatch[1]}`, `domain=${targetDomain}`)
    }
    return `${cookie}; domain=${targetDomain}`
  }).join(', ')
}

export async function POST(request: Request) {
  const body = await request.text()

  const response = await fetch(`${BACKEND}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
    body,
  })

  const newHeaders = new Headers()
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      newHeaders.set(key, rewriteSetCookie(value, '.snakil.com'))
    } else {
      newHeaders.set(key, value)
    }
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)

  const response = await fetch(`${BACKEND}/graphql${url.search}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
  })

  const newHeaders = new Headers()
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      newHeaders.set(key, rewriteSetCookie(value, '.snakil.com'))
    } else {
      newHeaders.set(key, value)
    }
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}