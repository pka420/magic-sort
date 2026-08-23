import { describe, expect, it } from 'vitest'
import { seal, unseal } from './vault'

const run = { reached: 6, earned: 4200, forfeited: 100, rebirths: 1 }

/**
 * What a player with developer tools open actually does: change a character of
 * the save and put it back. The middle is picked so the edit never lands on
 * base64's padding, where it would be thrown out before the seal is read.
 */
const editOneCharacter = (sealed: string): string => {
  const at = Math.floor(sealed.length / 2)
  const different = sealed[at] === 'A' ? 'B' : 'A'
  return sealed.slice(0, at) + different + sealed.slice(at + 1)
}

describe('seal', () => {
  it('gives nothing away about what it is holding', () => {
    expect(seal(run)).not.toContain('4200')
  })

  it('reads as one opaque token rather than as anything editable', () => {
    expect(seal(run)).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('seals a value the same way every time, so a save can be compared', () => {
    expect(seal(run)).toBe(seal(run))
  })

  it('seals different values differently', () => {
    expect(seal(run)).not.toBe(seal({ ...run, earned: 4300 }))
  })
})

describe('unseal', () => {
  it('gives back exactly what was sealed', () => {
    expect(unseal(seal(run))).toEqual(run)
  })

  it('carries a value through with its nesting and its types intact', () => {
    const save = {
      levelId: 1,
      pours: 3,
      board: [{ capacity: 4, contents: ['crimson', 'azure'] }]
    }

    expect(unseal(seal(save))).toEqual(save)
  })

  it('carries text a Latin-1 byte cannot hold', () => {
    expect(unseal(seal({ name: 'Poção mágica ✨' }))).toEqual({
      name: 'Poção mágica ✨'
    })
  })

  it('refuses a seal that has been edited', () => {
    expect(unseal(editOneCharacter(seal(run)))).toBeNull()
  })

  it('refuses a seal that has been cut short', () => {
    const sealed = seal(run)

    expect(unseal(sealed.slice(0, sealed.length - 8))).toBeNull()
  })

  it('refuses a score that was simply typed in unsealed', () => {
    expect(unseal(JSON.stringify({ ...run, earned: 999999 }))).toBeNull()
  })

  it('refuses a seal that carries no value at all', () => {
    expect(unseal('')).toBeNull()
  })

  it('refuses anything that is not even an encoded token', () => {
    expect(unseal('not a seal at all')).toBeNull()
  })
})
