import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Game } from './Game'
import { celebrateFlask, celebrateLevel } from '../effects/confetti'
import { benchOfGlass } from '../test/bench'
import type { Level } from '../domain/levels'

// Confetti paints to a canvas, which is a boundary rather than behaviour.
vi.mock('../effects/confetti', () => ({
  celebrateFlask: vi.fn(),
  celebrateLevel: vi.fn()
}))

const bench: Level = {
  id: 'test-bench',
  name: 'Test Bench',
  minimumPours: 4,
  board: benchOfGlass(4, ['crimson', 'azure'], ['azure'], [])
}

/** Tapping flask 2 then flask 1 fills flask 1 without finishing the level. */
const nearlyFull: Level = {
  id: 'test-nearly-full',
  name: 'Nearly Full',
  minimumPours: 2,
  board: benchOfGlass(
    4,
    ['crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure'],
    ['verdant', 'verdant']
  )
}

/** Tapping flask 2 then flask 1 finishes this level. */
const finalPour: Level = {
  id: 'test-final-pour',
  name: 'Final Pour',
  minimumPours: 1,
  board: benchOfGlass(
    4,
    ['crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure', 'azure', 'azure']
  )
}

/** Taller glass: the fifth layer is what finishes a flask on this bench. */
const tallGlass: Level = {
  id: 'test-tall-glass',
  name: 'Tall Glass',
  minimumPours: 1,
  board: benchOfGlass(
    5,
    ['crimson', 'crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure', 'azure', 'azure', 'azure']
  )
}

/** Glass of two sizes on one bench, which is what the later shelves set out. */
const mixedGlass: Level = {
  id: 'test-mixed-glass',
  name: 'Mixed Glass',
  minimumPours: 1,
  board: [
    { capacity: 5, contents: ['crimson', 'azure'] },
    { capacity: 3, contents: [] }
  ]
}

/** A bench with no pour left in it: both flasks full, and their tops clash. */
const deadEnd: Level = {
  id: 'test-dead-end',
  name: 'Dead End',
  minimumPours: 2,
  board: benchOfGlass(
    4,
    ['crimson', 'crimson', 'crimson', 'azure'],
    ['azure', 'azure', 'azure', 'crimson']
  )
}

/** One layer of each elixir, so their marks can be compared side by side. */
const oneOfEach: Level = {
  id: 'test-one-of-each',
  name: 'One of Each',
  minimumPours: 1,
  board: benchOfGlass(
    4,
    ['crimson'],
    ['azure'],
    ['verdant'],
    ['amber'],
    ['violet'],
    ['pearl']
  )
}

interface Standing {
  readonly position?: number
  readonly worth?: number
  readonly bankedScore?: number
  readonly perfectTotal?: number
  readonly forfeited?: number
  readonly onNextLevel?: ((score: number) => void) | null
  readonly onRestart?: () => void
  readonly onStartOver?: (score: number) => void
  readonly onBeginAgain?: () => void
}

const showBench = (level: Level, standing: Standing = {}) =>
  render(
    <Game
      level={level}
      position={standing.position ?? 1}
      levelCount={5}
      worth={standing.worth ?? 1000}
      bankedScore={standing.bankedScore ?? 0}
      perfectTotal={standing.perfectTotal ?? 5000}
      forfeited={standing.forfeited ?? 0}
      onNextLevel={standing.onNextLevel ?? null}
      onRestart={standing.onRestart ?? (() => {})}
      onStartOver={standing.onStartOver ?? (() => {})}
      onBeginAgain={standing.onBeginAgain ?? (() => {})}
    />
  )

const flask = (position: number) =>
  screen.getByRole('button', { name: new RegExp(`^Flask ${position}[,:]`) })

/**
 * Pours one flask into another and waits for the elixir to land. The flask
 * being poured is put down at the moment the bench takes the pour, so letting
 * go of it is the bench saying the elixir arrived.
 */
const pourFrom = async (user: UserEvent, from: number, to: number) => {
  await user.click(flask(from))
  await user.click(flask(to))
  await waitFor(() =>
    expect(flask(from)).toHaveAttribute('aria-pressed', 'false')
  )
}

beforeEach(() => {
  vi.mocked(celebrateFlask).mockClear()
  vi.mocked(celebrateLevel).mockClear()
})

describe('Game', () => {
  it('throws confetti over a flask once a pour fills it', async () => {
    const user = userEvent.setup()
    showBench(nearlyFull)

    await pourFrom(user, 2, 1)

    await waitFor(() => expect(celebrateFlask).toHaveBeenCalled())
  })

  it('leaves the confetti alone while flasks are still unfinished', async () => {
    const user = userEvent.setup()
    showBench(bench)

    await pourFrom(user, 1, 2)

    expect(celebrateFlask).not.toHaveBeenCalled()
  })

  it('throws confetti over the whole atelier once the level is solved', async () => {
    const user = userEvent.setup()
    showBench(finalPour)

    await pourFrom(user, 2, 1)

    await waitFor(() => expect(celebrateLevel).toHaveBeenCalled())
  })

  it('shows every flask on the bench with the elixirs it holds', () => {
    showBench(bench)

    expect(flask(1)).toHaveAccessibleName(
      'Flask 1, a 4-layer flask holding crimson, azure from bottom to top'
    )
    expect(flask(3)).toHaveAccessibleName('Flask 3, an empty 4-layer flask')
  })

  /*
   * On a bench of mixed glass, size is the puzzle: an elixir can only be sealed
   * in a flask its layers exactly fill. A player who cannot see the squat vial
   * beside the tall one has to be told which is which.
   */
  it('names the size of the glass, which mixed benches turn into the puzzle', () => {
    showBench(mixedGlass)

    expect(flask(1)).toHaveAccessibleName(
      'Flask 1, a 5-layer flask holding crimson, azure from bottom to top'
    )
    expect(flask(2)).toHaveAccessibleName('Flask 2, an empty 3-layer flask')
  })

  it('marks a flask as picked up when the apprentice taps it', async () => {
    const user = userEvent.setup()
    showBench(bench)

    await user.click(flask(1))

    expect(flask(1)).toHaveAttribute('aria-pressed', 'true')
  })

  it('pours between two flasks tapped in turn', async () => {
    const user = userEvent.setup()
    showBench(bench)

    await pourFrom(user, 1, 2)

    expect(flask(1)).toHaveAccessibleName(
      'Flask 1, a 4-layer flask holding crimson from bottom to top'
    )
    expect(flask(2)).toHaveAccessibleName(
      'Flask 2, a 4-layer flask holding azure, azure from bottom to top'
    )
  })

  /*
   * The elixir has to leave the flask that pours it and arrive in the one that
   * receives it, and those are two different moments. Changing the bench on the
   * tap is what made the pour read as teleporting.
   */
  it('holds the bench still while the elixir is on its way over', async () => {
    const user = userEvent.setup()
    showBench(bench)

    await user.click(flask(1))
    await user.click(flask(2))

    expect(flask(2)).toHaveAccessibleName(
      'Flask 2, a 4-layer flask holding azure from bottom to top'
    )

    await waitFor(() =>
      expect(flask(2)).toHaveAccessibleName(
        'Flask 2, a 4-layer flask holding azure, azure from bottom to top'
      )
    )
  })

  /*
   * Waiting out the animation would make chaining pours feel stuck, which is
   * most of what playing this game is.
   */
  it('lands the elixir at once when the apprentice taps on mid-pour', async () => {
    const user = userEvent.setup()
    showBench(nearlyFull)

    await user.click(flask(2))
    await user.click(flask(1))
    await user.click(flask(3))

    expect(screen.getByLabelText('Pours')).toHaveTextContent('1')
    expect(flask(3)).toHaveAttribute('aria-pressed', 'true')
  })

  it('leaves the elixirs unmarked while the colours are enough', () => {
    showBench(oneOfEach)

    const marks = oneOfEach.board.map(
      (_, index) => flask(index + 1).textContent
    )

    expect(marks).toEqual(['', '', '', '', '', ''])
  })

  it('keeps pouring into a four-layer flask on a bench of taller glass', async () => {
    const user = userEvent.setup()
    showBench(tallGlass)

    await pourFrom(user, 2, 1)

    expect(flask(1)).toHaveAccessibleName(
      'Flask 1, a 5-layer flask holding crimson, crimson, crimson, crimson, crimson from bottom to top'
    )
    expect(
      screen.getByRole('heading', { name: /elixirs sorted/i })
    ).toBeInTheDocument()
  })

  it('counts the pours the apprentice has spent', async () => {
    const user = userEvent.setup()
    showBench(bench)

    await pourFrom(user, 1, 2)

    expect(screen.getByLabelText('Pours')).toHaveTextContent('1')
  })

  it('says in how few pours the bench can be sorted and what going over costs', () => {
    showBench(bench)

    expect(screen.getByText(/can be sorted in/i)).toHaveTextContent(
      'This bench can be sorted in 4 pours. Every pour past that costs 25 points.'
    )
  })

  it('counts out which bench of the atelier this is', () => {
    showBench(bench, { position: 2, worth: 2000 })

    // Anchored: the bench name used to trail this line and read as clutter.
    expect(screen.getByText(/level 2 of 5/i)).toHaveTextContent(
      /^Level 2 of 5$/
    )
  })

  it('offers the next bench once this one is sorted', async () => {
    const user = userEvent.setup()
    const onNextLevel = vi.fn()
    showBench(finalPour, { onNextLevel })

    await pourFrom(user, 2, 1)
    await user.click(screen.getByRole('button', { name: 'Next level' }))

    // With the score, so the campaign can bank what this bench was worth.
    expect(onNextLevel).toHaveBeenCalledWith(1000)
  })

  it('closes the atelier out on the last bench rather than offering another', async () => {
    const user = userEvent.setup()
    showBench(finalPour)

    await pourFrom(user, 2, 1)

    expect(
      screen.queryByRole('button', { name: 'Next level' })
    ).not.toBeInTheDocument()
    expect(screen.getByText(/every bench/i)).toHaveTextContent(
      'Every bench in the atelier is sorted, for 1000 of 5000.'
    )
  })

  it('does not call the score final while there are benches left', async () => {
    const user = userEvent.setup()
    showBench(finalPour, { onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    expect(screen.getByText(/score 1000 of 1000/i)).toHaveTextContent(
      /^Score 1000 of 1000$/
    )
  })

  /*
   * Fifty benches are more dots than a card can hold: the row of pips this
   * replaces ran off the side of it and squeezed the closing line out. A bar
   * says the same thing at any length of atelier.
   */
  it('measures how far into the atelier the sorted bench is', async () => {
    const user = userEvent.setup()
    showBench(finalPour, { position: 2, onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    const sorted = screen.getByRole('progressbar', {
      name: 'Bench 2 of 5 sorted'
    })
    expect({
      benchesSorted: sorted.getAttribute('aria-valuenow'),
      benchesInTheAtelier: sorted.getAttribute('aria-valuemax')
    }).toEqual({ benchesSorted: '2', benchesInTheAtelier: '5' })
  })

  it('counts out how much of the atelier is still to sort', async () => {
    const user = userEvent.setup()
    showBench(finalPour, { onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    expect(screen.getByText(/more to sort/i)).toHaveTextContent(
      '4 more to sort.'
    )
  })

  it('puts the next bench under the apprentice\u2019s finger', async () => {
    const user = userEvent.setup()
    showBench(finalPour, { onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    expect(screen.getByRole('button', { name: 'Next level' })).toHaveFocus()
  })

  it('celebrates once every elixir is sorted', async () => {
    const user = userEvent.setup()
    showBench(finalPour)

    await pourFrom(user, 2, 1)

    // Presence is the behaviour worth asserting here: whether the card has
    // finished fading in is a question only a real browser can answer, and the
    // e2e smoke test asks it there.
    expect(
      screen.getByRole('heading', { name: /elixirs sorted/i })
    ).toBeInTheDocument()
  })

  it('scores every bench out of the same 1000', () => {
    showBench(bench)

    expect(screen.getByLabelText('Score')).toHaveTextContent('0 / 1000')
  })

  it('pays a flawless run the full 1000', async () => {
    const user = userEvent.setup()
    showBench(finalPour)

    await pourFrom(user, 2, 1)

    // Awaited because the number climbs to it rather than appearing on it.
    await waitFor(() =>
      expect(screen.getByLabelText('Score')).toHaveTextContent('1000 / 1000')
    )
  })

  it('breaks the final score down against the fewest pours possible', async () => {
    const user = userEvent.setup()
    showBench(finalPour)

    await pourFrom(user, 2, 1)

    expect(screen.getByText(/final score/i)).toHaveTextContent(
      'Final score 1000 of 1000'
    )
    expect(screen.getByText(/fewest possible/i)).toHaveTextContent(
      'Pours spent: 1 · Fewest possible: 1'
    )
  })

  /*
   * The end of a run nobody presses for, and the one the apprentice cannot see
   * coming: the bench has no pour left in it, and laying it out again costs
   * more than they have banked. Nothing has to be pressed for the run to be
   * over, so nothing should have to be pressed to be told.
   */
  it('closes the run down when the bench runs dry and a restart is out of reach', () => {
    showBench(deadEnd)

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'There is no pour left on this bench, and you cannot pay the 100 points it costs to lay it out again.'
    )
  })

  it('leaves a stuck apprentice who can pay for a restart to go and take it', () => {
    showBench(deadEnd, { bankedScore: 100 })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('leaves the bench standing while there are still pours left on it', () => {
    showBench(bench)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  /*
   * The end of a run the apprentice does press for. Nothing here is bought on
   * credit: a bench thrown away by someone who cannot pay for it is the last
   * one of their run, which is what the warning under the button said it would
   * be.
   */
  it('ends the run of an apprentice who holds a restart they cannot pay for', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    showBench(bench, { onRestart })

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('button', { name: 'Hold to restart' })
    })

    await waitFor(
      () =>
        expect(screen.getByRole('alertdialog')).toHaveTextContent(
          'Laying this bench out again costs 100 points, which is more than you have.'
        ),
      { timeout: 3000 }
    )
    expect(onRestart).not.toHaveBeenCalled()
  })

  it('ends the run of an apprentice who confirms a walk back they cannot pay for', async () => {
    const user = userEvent.setup()
    const onStartOver = vi.fn()
    showBench(bench, { onStartOver })

    await user.click(screen.getByRole('button', { name: 'Start over' }))
    await user.click(screen.getByRole('button', { name: 'Yes, end my run' }))

    // Named, because the dialog that asked the question is still fading out.
    expect(
      screen.getByRole('alertdialog', { name: 'Game over' })
    ).toHaveTextContent(
      'The walk back to the first bench costs 1000 points, which is more than you have.'
    )
    expect(onStartOver).not.toHaveBeenCalled()
  })

  /*
   * The run is swept at the press rather than when the card is answered:
   * closing the tab is not a way out of a run, and it must not become one for
   * the run that has just ended.
   */
  it('sweeps the run away with the price the apprentice could not pay', async () => {
    const user = userEvent.setup()
    const onBeginAgain = vi.fn()
    showBench(bench, { onBeginAgain })

    await user.click(screen.getByRole('button', { name: 'Start over' }))
    await user.click(screen.getByRole('button', { name: 'Yes, end my run' }))

    expect(onBeginAgain).toHaveBeenCalledTimes(1)
  })

  it('sweeps the bench clean when the apprentice begins a new run', async () => {
    const user = userEvent.setup()
    const onBeginAgain = vi.fn()
    showBench(deadEnd, { onBeginAgain })

    await user.click(screen.getByRole('button', { name: 'Begin a new run' }))

    expect(onBeginAgain).toHaveBeenCalledTimes(1)
  })

  it('carries the points banked on earlier benches into the total', () => {
    showBench(bench, { bankedScore: 1750 })

    expect(screen.getByLabelText('Total')).toHaveTextContent('1750 / 5000')
  })

  it('counts what this bench earns into the total as it is earned', async () => {
    const user = userEvent.setup()
    showBench(finalPour, { bankedScore: 1750 })

    await pourFrom(user, 2, 1)

    await waitFor(() =>
      expect(screen.getByLabelText('Total')).toHaveTextContent('2750 / 5000')
    )
  })

  it('hands the whole run back when the apprentice starts over', async () => {
    const user = userEvent.setup()
    const onStartOver = vi.fn()
    showBench(bench, { bankedScore: 1000, onStartOver })

    await pourFrom(user, 1, 2)
    await user.click(screen.getByRole('button', { name: 'Start over' }))
    await user.click(screen.getByRole('button', { name: 'Yes, start over' }))

    expect(onStartOver).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Pours')).toHaveTextContent('0')
  })

  /*
   * The bench in hand goes with the apprentice rather than down the drain: they
   * are leaving it for good rather than laying it out again, so the campaign is
   * handed what it earned to bank on the way past.
   */
  it('hands over what the bench in hand earned as the apprentice walks back', async () => {
    const user = userEvent.setup()
    const onStartOver = vi.fn()
    showBench(nearlyFull, { bankedScore: 1000, onStartOver })

    await pourFrom(user, 2, 1)
    await user.click(screen.getByRole('button', { name: 'Start over' }))
    await user.click(screen.getByRole('button', { name: 'Yes, start over' }))

    // One of the three elixirs sealed, which is a third of the sorting half.
    expect(onStartOver).toHaveBeenCalledWith(167)
  })

  it('puts the bench back the way it started once the restart is held', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    showBench(bench, { bankedScore: 100, onRestart })

    await pourFrom(user, 1, 2)
    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('button', { name: 'Hold to restart' })
    })

    await waitFor(
      () =>
        expect(flask(1)).toHaveAccessibleName(
          'Flask 1, a 4-layer flask holding crimson, azure from bottom to top'
        ),
      { timeout: 3000 }
    )
    expect(screen.getByLabelText('Pours')).toHaveTextContent('0')
    // And the campaign is told, because a restart is not free.
    expect(onRestart).toHaveBeenCalledTimes(1)
  })
})
