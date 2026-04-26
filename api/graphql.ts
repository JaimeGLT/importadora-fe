export const runtime = 'edge'

const BACKEND = 'https://usaautopartesapi20260406085513-amh4fwdnanbpa9gs.centralus-01.azurewebsites.net'

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

  const newHeaders = new Headers(response.headers)
  const setCookie = newHeaders.get('set-cookie')

  if (setCookie) {
    const rewritten = setCookie.split(', ').map(cookie => {
      if (cookie.includes('azurewebsites')) {
        const domainMatch = cookie.match(/domain=([^;]+)/i)
        if (domainMatch) {
          return cookie.replace(`domain=${domainMatch[1]}`, 'domain=.snakil.com')
        }
        return `${cookie}; domain=.snakil.com`
      }
      if (!cookie.includes('domain=')) {
        return `${cookie}; domain=.snakil.com`
      }
      return cookie
    }).join(', ')

    newHeaders.set('set-cookie', rewritten)
  }

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

  const newHeaders = new Headers(response.headers)
  const setCookie = newHeaders.get('set-cookie')

  if (setCookie) {
    const rewritten = setCookie.split(', ').map(cookie => {
      if (cookie.includes('azurewebsites')) {
        const domainMatch = cookie.match(/domain=([^;]+)/i)
        if (domainMatch) {
          return cookie.replace(`domain=${domainMatch[1]}`, 'domain=.snakil.com')
        }
        return `${cookie}; domain=.snakil.com`
      }
      if (!cookie.includes('domain=')) {
        return `${cookie}; domain=.snakil.com`
      }
      return cookie
    }).join(', ')

    newHeaders.set('set-cookie', rewritten)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}