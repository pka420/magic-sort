import { describe, expect, it } from 'vitest'
import { playSound } from './sounds'

describe('playSound', () => {
  // jsdom has no Web Audio API, which is the same situation as a browser with
  // audio blocked. Either way the game must keep running, silently.
  it('stays silent instead of throwing where the browser offers no audio', () => {
    expect(() => playSound('pour')).not.toThrow()
  })
})
