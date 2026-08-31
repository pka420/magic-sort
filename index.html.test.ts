import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The page is a shell: React draws the game once the script runs. WhatsApp,
 * Discord, Slack and Google's crawler read this markup and most of them never
 * run that script, so everything they can know about the game lives here.
 *
 * These tests guard the two ways that fails without a symptom — a relative URL,
 * which every unfurler quietly ignores, and advertising a card that was never
 * shipped. Both look perfect in a browser.
 */
const PAGE_URL = 'https://magic-sort.from-delhi.net/'
const CARD = 'social-card.jpg'

// Vitest runs from the project root, which is where the page and its assets sit.
const ROOT = process.cwd()

const page = new DOMParser().parseFromString(
  readFileSync(join(ROOT, 'index.html'), 'utf8'),
  'text/html'
)

const contentOf = (selector: string) =>
  page.querySelector(selector)?.getAttribute('content') ?? ''

describe('the published page', () => {
  it('points every URL a crawler follows at the canonical page', () => {
    expect({
      canonical: page
        .querySelector('link[rel="canonical"]')
        ?.getAttribute('href'),
      ogUrl: contentOf('meta[property="og:url"]'),
      ogImage: contentOf('meta[property="og:image"]'),
      twitterImage: contentOf('meta[name="twitter:image"]')
    }).toEqual({
      canonical: PAGE_URL,
      ogUrl: PAGE_URL,
      ogImage: `${PAGE_URL}${CARD}`,
      twitterImage: `${PAGE_URL}${CARD}`
    })
  })

  it('leaves nothing a chat preview reads unset', () => {
    const readByPreviews = [
      'meta[name="description"]',
      'meta[property="og:type"]',
      'meta[property="og:site_name"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:image:alt"]',
      'meta[name="twitter:card"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]'
    ]

    expect(
      readByPreviews.filter((selector) => contentOf(selector) === '')
    ).toEqual([])
  })

  it('ships the card it advertises', () => {
    expect(readdirSync(join(ROOT, 'public'))).toContain(CARD)
  })

  it('keeps the card light enough for a chat client to fetch it', () => {
    // WhatsApp drops the preview image past a few hundred kilobytes, without
    // saying so: the message arrives with a title and no picture.
    expect(statSync(join(ROOT, 'public', CARD)).size).toBeLessThan(300_000)
  })

  it('tells crawlers to index the page and advertises the sitemap', () => {
    expect(contentOf('meta[name="robots"]')).toMatch(/index/)
    expect(contentOf('meta[name="robots"]')).toMatch(/follow/)
    expect(
      page.querySelector('link[rel="sitemap"]')?.getAttribute('href')
    ).toBe('/sitemap.xml')
    // Also present via robots.txt – read plain text, not DOM.
    const robots = readFileSync(join(ROOT, 'public', 'robots.txt'), 'utf8')
    expect(robots).toMatch(/Allow: \//)
    expect(robots).toMatch(
      /Sitemap: https:\/\/magic-sort\.from-delhi\.net\/sitemap\.xml/
    )
    expect(robots).toMatch(/Disallow: \/api\//)
  })

  it('ships a valid sitemap pointing at the canonical page', () => {
    const sitemap = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8')
    expect(sitemap).toContain(`<loc>${PAGE_URL}</loc>`)
    expect(sitemap).toContain('<urlset')
  })

  it('exposes structured data so search results can render rich results', () => {
    const jsonLd =
      page.querySelector('script[type="application/ld+json"]')?.textContent ??
      ''
    expect(jsonLd).not.toBe('')
    const data = JSON.parse(jsonLd) as Record<string, unknown>
    expect(data['@type']).toBe('VideoGame')
    expect(data['name']).toBe('Magic Sort')
    expect(data['url']).toBe(PAGE_URL)
  })

  it('sets SEO meta tags crawlers expect', () => {
    expect(contentOf('meta[name="keywords"]')).not.toBe('')
    expect(contentOf('meta[name="author"]')).not.toBe('')
    expect(contentOf('meta[property="og:locale"]')).not.toBe('')
    expect(page.querySelector('title')?.textContent).toMatch(/Magic Sort/)
  })

  it('includes Google AdSense verification script and ads.txt', () => {
    const adsense = page.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    )
    expect(adsense).not.toBeNull()
    expect(adsense?.getAttribute('src')).toContain('ca-pub-8317099814214393')
    expect(adsense?.getAttribute('crossorigin')).toBe('anonymous')
    expect(adsense?.hasAttribute('async')).toBe(true)

    const adsTxt = readFileSync(join(ROOT, 'public', 'ads.txt'), 'utf8')
    expect(adsTxt).toContain(
      'google.com, pub-8317099814214393, DIRECT, f08c47fec0942fa0'
    )
  })

  it('ships a privacy policy and terms required for AdSense', () => {
    for (const file of ['privacy.html', 'terms.html']) {
      expect(readdirSync(join(ROOT, 'public'))).toContain(file)
      const html = readFileSync(join(ROOT, 'public', file), 'utf8')
      expect(html).toContain('https://magic-sort.from-delhi.net')
    }
    const privacy = readFileSync(join(ROOT, 'public', 'privacy.html'), 'utf8')
    expect(privacy).toContain('Privacy Policy')
    expect(privacy).toContain('Google AdSense')
    expect(privacy).toContain('ca-pub-8317099814214393')
    expect(privacy).toContain('/terms.html')
  })
})
