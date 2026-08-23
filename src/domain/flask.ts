/** The elixirs a player sorts. One colour per flask is the goal. */
export type Elixir =
  | 'crimson'
  | 'azure'
  | 'verdant'
  | 'amber'
  | 'violet'
  | 'pearl'
  | 'saffron'
  | 'indigo'

export interface Flask {
  /** Layers of elixir, bottom-most first. The last entry is the visible top. */
  readonly contents: readonly Elixir[]
  /**
   * How many layers this glass holds when full. It belongs to the flask rather
   * than to the board, because the later levels set them out mixed: a board of
   * five-layer glass with a three-layer vial on it is a board where the elixir
   * that only fills three has exactly one place it can end up.
   */
  readonly capacity: number
}

export interface PourResult {
  readonly source: Flask
  readonly target: Flask
}

/** A glass poured full to its own brim, which is how a level is laid out. */
export function filledFlask(contents: readonly Elixir[]): Flask {
  return { contents, capacity: contents.length }
}

/** A spare glass, which is the room a board leaves the player to think in. */
export function emptyFlask(capacity: number): Flask {
  return { contents: [], capacity }
}

/**
 * A glass laid out with room still left in it. The later tiers scatter a
 * board's room through part-filled glass instead of pooling it in a spare
 * flask: the same free layers are there, but no single glass is empty enough
 * to take a run poured out of another.
 */
export function partFilledFlask(
  capacity: number,
  contents: readonly Elixir[]
): Flask {
  return { contents, capacity }
}

export function topElixir(flask: Flask): Elixir | null {
  return flask.contents.at(-1) ?? null
}

export function isEmpty(flask: Flask): boolean {
  return flask.contents.length === 0
}

export function isComplete(flask: Flask): boolean {
  return flask.contents.length === flask.capacity && isPure(flask)
}

export function canPour(source: Flask, target: Flask): boolean {
  if (source === target || isEmpty(source) || freeSpace(target) === 0) {
    return false
  }
  return isEmpty(target) || topElixir(target) === topElixir(source)
}

export function pour(source: Flask, target: Flask): PourResult {
  if (!canPour(source, target)) {
    throw new Error(describeRefusal(source, target))
  }

  const volume = Math.min(topRunSize(source), freeSpace(target))
  const poured = source.contents.slice(source.contents.length - volume)

  return {
    source: {
      ...source,
      contents: source.contents.slice(0, source.contents.length - volume)
    },
    target: { ...target, contents: [...target.contents, ...poured] }
  }
}

function isPure(flask: Flask): boolean {
  return flask.contents.every((elixir) => elixir === flask.contents[0])
}

function freeSpace(flask: Flask): number {
  return flask.capacity - flask.contents.length
}

/** How many layers pour out at once: the unbroken run of the top elixir. */
function topRunSize(flask: Flask): number {
  const layers = flask.contents
  const top = topElixir(flask)
  let size = 0
  while (size < layers.length && layers[layers.length - 1 - size] === top) {
    size += 1
  }
  return size
}

function describeRefusal(source: Flask, target: Flask): string {
  if (source === target) return 'Cannot pour a flask into itself'
  if (isEmpty(source)) return 'Cannot pour from an empty flask'
  if (freeSpace(target) === 0) {
    return `Cannot pour ${topElixir(source)} into a full flask`
  }
  return `Cannot pour ${topElixir(source)} onto ${topElixir(target)}`
}
