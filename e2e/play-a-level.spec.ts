import { expect, test } from '@playwright/test'

/**
 * The one end-to-end test in the suite. Everything below it — the pouring
 * rules, the scoring, the wiring — is already covered by unit and integration
 * tests; this exists only to prove the whole thing runs in a real browser.
 *
 * The shortest solution to the starter level, as pairs of flask numbers.
 */
const PERFECT_RUN = [
  [1, 5],
  [1, 6],
  [2, 6],
  [2, 5],
  [3, 1],
  [2, 3],
  [1, 2],
  [3, 1],
  [3, 5],
  [3, 6],
  [4, 1],
  [4, 2],
  [4, 6],
  [4, 5]
]

test('sorting the starter level from first pour to last', async ({ page }) => {
  // Relative, so it resolves against the base path rather than replacing it.
  await page.goto('./')

  const flask = (position: number) =>
    page.getByRole('button', { name: new RegExp(`^Flask ${position},`) })

  for (const [source, target] of PERFECT_RUN) {
    await flask(source).click()
    await flask(target).click()
  }

  await expect(
    page.getByRole('heading', { name: 'Elixirs sorted!' })
  ).toBeVisible()
  await expect(page.getByLabel('Score')).toHaveText('1000 / 1000')

  // The celebration covers the screen, so nothing from the board may paint
  // over it. Only a real browser resolves stacking order, so this is checked
  // here by hit-testing a grid of points and asking what is actually on top.
  const celebration = page.getByRole('status')
  const pointsCoveredByTheBoard = await celebration.evaluate((banner) => {
    const box = banner.getBoundingClientRect()
    const samples = []
    for (let column = 1; column <= 6; column++) {
      for (let row = 1; row <= 6; row++) {
        samples.push([
          box.left + (box.width * column) / 7,
          box.top + (box.height * row) / 7
        ])
      }
    }
    return samples.filter(([x, y]) => {
      const onTop = document.elementFromPoint(x, y)
      return onTop === null || !banner.contains(onTop)
    }).length
  })
  expect(pointsCoveredByTheBoard).toBe(0)

  await page.getByRole('button', { name: 'Next level' }).click()
  await expect(page.getByText(/^Level 2 of/)).toHaveText('Level 2 of 50')
  await expect(page.getByLabel('Pours')).toHaveText('0')
  // The level resets; what it earned does not.
  await expect(page.getByLabel('Total')).toHaveText('1000 / 1275000')

  // A restart costs a tenth of the level being thrown away — 200 points on
  // the second one.
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByLabel('Total')).toHaveText('800 / 1275000')
})
