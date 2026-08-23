import { expect, test } from '@playwright/test'

/**
 * The third end-to-end test, here for the same reason as the second: the test
 * environment has no working storage, so a lent double is the most a unit test
 * can prove. What only a real browser can answer is whether a run written into
 * real storage, sealed by a real `btoa` and read back through a real `atob`,
 * comes back the way it went in — and whether a save the player has edited is
 * turned away rather than believed.
 */
test('a player comes back to their run, but not to an edited one', async ({
  page
}) => {
  await page.goto('./')

  const pours = page.getByLabel('Pours')
  await page.getByRole('button', { name: /^Flask 1/ }).click()
  await page.getByRole('button', { name: /^Flask 5/ }).click()
  await expect(pours).toHaveText('1')

  await page.reload()

  // The level comes back mid-solve: closing the tab is not a free restart.
  await expect(pours).toHaveText('1')

  const edited = await page.evaluate(() => {
    const key = 'magic-sort:run'
    const sealed = window.localStorage.getItem(key) ?? ''
    const at = Math.floor(sealed.length / 2)
    const different = sealed[at] === 'A' ? 'B' : 'A'
    window.localStorage.setItem(
      key,
      sealed.slice(0, at) + different + sealed.slice(at + 1)
    )
    return sealed !== window.localStorage.getItem(key)
  })
  expect(
    edited,
    'the save has to actually change for this to prove anything'
  ).toBe(true)

  await page.reload()

  // Refused outright: a player who edits the save gets the game from the
  // first flask, not the level and score they typed in.
  await expect(pours).toHaveText('0')
  await expect(page.getByText(/level 1 of/i)).toBeVisible()
})
