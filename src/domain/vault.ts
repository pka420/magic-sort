/*
 * Where a saved run is locked away, and the honest limits of that lock.
 *
 * A seal does two things: it makes a save unreadable, so there is no obvious
 * number to reach for, and it signs the save, so one that has been edited is
 * refused rather than believed. Between them they stop a player opening
 * developer tools, finding `"earned":4200` and typing a bigger number — which
 * is the whole of what a puzzle game with no leaderboard is really up against.
 *
 * What they do not stop is a player who reads the JavaScript. The key below
 * ships to every browser inside the bundle, because this game deliberately has
 * no server to keep a score on, and a key everyone has is not a secret. Making
 * a score genuinely unforgeable needs somewhere the player cannot reach to
 * keep it, and that is a different game to the one this is. Anything stronger
 * here — a real cipher, a longer key — would only make the lock look sturdier
 * without moving it out of the glass house.
 */

/** The key, such as it is. See above for exactly how much it is worth. */
const SEAL_KEY = 0x5f3a92c1

/** Two 32-bit lanes of fingerprint, written out as hex. */
const SIGNATURE_LENGTH = 16

/** Locks a value away as one opaque token. */
export function seal(value: unknown): string {
  const json = JSON.stringify(value)
  return encode(scramble(bytesOf(fingerprint(json) + json)))
}

/**
 * Opens a sealed value, or gives back null if it was edited, cut short, or
 * never sealed in the first place. A refused save is not an error to report:
 * the game simply has nothing to go back to, and lays out the first level.
 */
export function unseal(sealed: string): unknown {
  const bytes = decode(sealed)
  if (bytes === null) return null

  const opened = textOf(scramble(bytes))
  const signature = opened.slice(0, SIGNATURE_LENGTH)
  const json = opened.slice(SIGNATURE_LENGTH)
  if (json === '' || fingerprint(json) !== signature) return null

  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Hides the bytes behind a keystream. XOR is its own undoing, so scrambling a
 * scrambled save is what opens it again.
 */
function scramble(bytes: Uint8Array): Uint8Array {
  const scrambled = new Uint8Array(bytes.length)
  let state = SEAL_KEY

  for (let at = 0; at < bytes.length; at += 1) {
    // Xorshift: cheap, and it never reaches zero from a non-zero key, which is
    // the one state that would leave the save in plain sight.
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    scrambled[at] = bytes[at] ^ (state & 0xff)
  }

  return scrambled
}

/**
 * A short signature over the save, mixed with the key. Two lanes rather than
 * one, so that editing a digit is overwhelmingly unlikely to land on the same
 * signature by accident.
 */
function fingerprint(text: string): string {
  let lane = 0xdeadbeef ^ SEAL_KEY
  let other = 0x41c6ce57 ^ SEAL_KEY

  for (let at = 0; at < text.length; at += 1) {
    const character = text.charCodeAt(at)
    lane = Math.imul(lane ^ character, 2654435761)
    other = Math.imul(other ^ character, 1597334677)
  }

  lane =
    Math.imul(lane ^ (lane >>> 16), 2246822507) ^
    Math.imul(other ^ (other >>> 13), 3266489909)
  other =
    Math.imul(other ^ (other >>> 16), 2246822507) ^
    Math.imul(lane ^ (lane >>> 13), 3266489909)

  return hex(lane) + hex(other)
}

function hex(lane: number): string {
  return (lane >>> 0).toString(16).padStart(8, '0')
}

function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function textOf(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function encode(bytes: Uint8Array): string {
  let latin1 = ''
  for (const byte of bytes) latin1 += String.fromCharCode(byte)
  return btoa(latin1)
}

function decode(sealed: string): Uint8Array | null {
  try {
    const latin1 = atob(sealed)
    const bytes = new Uint8Array(latin1.length)
    for (let at = 0; at < latin1.length; at += 1) {
      bytes[at] = latin1.charCodeAt(at)
    }
    return bytes
  } catch {
    // Not even base64, which is a save nobody sealed.
    return null
  }
}
