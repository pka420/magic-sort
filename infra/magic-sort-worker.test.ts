// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './magic-sort-worker.ts'

const visit = (url: string) => new Request(url)

describe('the magic-sort worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches from GitHub Pages at the very path the visitor asked for', async () => {
    // The network is the one real boundary here, so it is stubbed — with a stub
    // that answers with the URL it was handed, which is what is under test.
    vi.stubGlobal(
      'fetch',
      async (upstream: Request) => new Response(upstream.url)
    )

    const response = await worker.fetch(
      visit('https://www.pka420.github.io/magic-sort/assets/app.js')
    )

    expect(await response.text()).toBe(
      'https://pka420.github.io/magic-sort/assets/app.js'
    )
  })

  it('keeps a redirect from Pages inside the custom domain', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(null, {
          status: 301,
          headers: { location: 'https://pka420.github.io/magic-sort/' }
        })
    )

    const response = await worker.fetch(
      visit('https://www.pka420.github.io/magic-sort')
    )

    expect(response.headers.get('location')).toBe(
      'https://www.pka420.github.io/magic-sort/'
    )
  })

  it('hands back what Pages served when there is no redirect', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response('<!doctype html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
    )

    const response = await worker.fetch(
      visit('https://www.pka420.github.io/magic-sort/')
    )

    expect({
      status: response.status,
      type: response.headers.get('content-type'),
      body: await response.text()
    }).toEqual({
      status: 200,
      type: 'text/html',
      body: '<!doctype html>'
    })
  })
})
