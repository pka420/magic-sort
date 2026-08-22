/**
 * The game is published by GitHub Pages, but players reach it at a path on
 * the custom domain. Cloudflare routes that one path here, and this hands the
 * request to Pages unchanged apart from the hostname — the repository is named
 * after the public path, so the path itself is identical on both sides.
 */
const PAGES_HOST = 'pka420.github.io'

export default {
  async fetch(request: Request): Promise<Response> {
    const visited = new URL(request.url)
    const upstream = new URL(request.url)
    upstream.host = PAGES_HOST

    const served = await fetch(new Request(upstream, request), {
      redirect: 'manual'
    })

    const location = served.headers.get('location')
    if (location === null) return served

    // Pages answers /magic-sort with a redirect to /magic-sort/ on its own
    // hostname, which would throw the player out of the custom domain.
    const target = new URL(location, upstream)
    if (target.host === upstream.host) target.host = visited.host

    const rehomed = new Response(served.body, served)
    rehomed.headers.set('location', target.href)
    return rehomed
  }
}
