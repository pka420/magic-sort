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
const PAGE_URL = 'https://pka420.github.io/magic-sort/'
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
})
