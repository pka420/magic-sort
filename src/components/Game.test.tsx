import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Game } from './Game'
import { celebrateFlask, celebrateLevel } from '../effects/confetti'
import { boardOfGlass } from '../test/board'
import type { Level } from '../domain/levels'

// Confetti paints to a canvas, which is a boundary rather than behaviour.
vi.mock('../effects/confetti', () => ({
  celebrateFlask: vi.fn(),
  celebrateLevel: vi.fn()
}))

const level: Level = {
  id: 1,
  minimumPours: 4,
  board: boardOfGlass(4, ['crimson', 'azure'], ['azure'], [])
}

/** Tapping flask 2 then flask 1 fills flask 1 without finishing the level. */
const nearlyFull: Level = {
  id: 2,
  minimumPours: 2,
  board: boardOfGlass(
    4,
    ['crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure'],
    ['verdant', 'verdant']
  )
}

/** Tapping flask 2 then flask 1 finishes this level. */
const finalPour: Level = {
  id: 3,
  minimumPours: 1,
  board: boardOfGlass(
    4,
    ['crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure', 'azure', 'azure']
  )
}

/** Taller glass: the fifth layer is what finishes a flask on this level. */
const tallGlass: Level = {
  id: 4,
  minimumPours: 1,
  board: boardOfGlass(
    5,
    ['crimson', 'crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure', 'azure', 'azure', 'azure']
  )
}

/** Glass of two sizes on one level, which is what the later tiers set out. */
const mixedGlass: Level = {
  id: 5,
  minimumPours: 1,
  board: [
    { capacity: 5, contents: ['crimson', 'azure'] },
    { capacity: 3, contents: [] }
  ]
}

/** A level with no pour left in it: both flasks full, and their tops clash. */
const deadEnd: Level = {
  id: 6,
  minimumPours: 2,
  board: boardOfGlass(
    4,
    ['crimson', 'crimson', 'crimson', 'azure'],
    ['azure', 'azure', 'azure', 'crimson']
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
  readonly onBeginAgain?: () => void
}

/* The account corner is a prop of the game, not a thing under test here. */
const signedOut = {
  user: null,
  token: null,
  resolving: false,
  login: vi.fn(),
  register: vi.fn(),
  signInWithGoogle: vi.fn(),
  chooseUsername: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  signOut: vi.fn()
}

const showLevel = (level: Level, standing: Standing = {}) =>
  render(
    <Game
      level={level}
      position={standing.position ?? 1}
      levelCount={5}
      worth={standing.worth ?? 1000}
      bankedScore={standing.bankedScore ?? 0}
      perfectTotal={standing.perfectTotal ?? 5000}
      forfeited={standing.forfeited ?? 0}
      auth={signedOut}
      onNextLevel={standing.onNextLevel ?? null}
      onRestart={standing.onRestart ?? (() => {})}
      onBeginAgain={standing.onBeginAgain ?? (() => {})}
    />
  )

const flask = (position: number) =>
  screen.getByRole('button', { name: new RegExp(`^Flask ${position}[,:]`) })

/**
 * Pours one flask into another and waits for the elixir to land. The flask
 * being poured is put down at the moment the board takes the pour, so letting
 * go of it is the board saying the elixir arrived.
 */
const pourFrom = async (user: UserEvent, from: number, to: number) => {
  await user.click(flask(from))
  await user.click(flask(to))
  await waitFor(() =>
    expect(flask(from)).toHaveAttribute('aria-pressed', 'false')
  )
}

/** The speed and the restart live behind the burger; most tests need them. */
const openMenu = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: 'Menu' }))
}

beforeEach(() => {
  vi.mocked(celebrateFlask).mockClear()
  vi.mocked(celebrateLevel).mockClear()
})

describe('Game', () => {
  it('throws confetti over a flask once a pour fills it', async () => {
    const user = userEvent.setup()
    showLevel(nearlyFull)

    await pourFrom(user, 2, 1)

    await waitFor(() => expect(celebrateFlask).toHaveBeenCalled())
  })

  it('leaves the confetti alone while flasks are still unfinished', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await pourFrom(user, 1, 2)

    expect(celebrateFlask).not.toHaveBeenCalled()
  })

  it('throws confetti over the whole campaign once the level is solved', async () => {
    const user = userEvent.setup()
    showLevel(finalPour)

    await pourFrom(user, 2, 1)

    await waitFor(() => expect(celebrateLevel).toHaveBeenCalled())
  })

  it('shows every flask on the board with the elixirs it holds', () => {
    showLevel(level)

    expect(flask(1)).toHaveAccessibleName(
      'Flask 1, a 4-layer flask holding crimson, azure from bottom to top'
    )
    expect(flask(3)).toHaveAccessibleName('Flask 3, an empty 4-layer flask')
  })

  /*
   * On a board of mixed glass, size is the puzzle: an elixir can only be sealed
   * in a flask its layers exactly fill. A player who cannot see the squat vial
   * beside the tall one has to be told which is which.
   */
  it('names the size of the glass, which mixed boards turn into the puzzle', () => {
    showLevel(mixedGlass)

    expect(flask(1)).toHaveAccessibleName(
      'Flask 1, a 5-layer flask holding crimson, azure from bottom to top'
    )
    expect(flask(2)).toHaveAccessibleName('Flask 2, an empty 3-layer flask')
  })

  it('marks a flask as picked up when the player taps it', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await user.click(flask(1))

    expect(flask(1)).toHaveAttribute('aria-pressed', 'true')
  })

  it('pours between two flasks tapped in turn', async () => {
    const user = userEvent.setup()
    showLevel(level)

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
   * receives it, and those are two different moments. Changing the board on the
   * tap is what made the pour read as teleporting.
   */
  it('holds the board still while the elixir is on its way over', async () => {
    const user = userEvent.setup()
    showLevel(level)

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
  it('lands the elixir at once when the player taps on mid-pour', async () => {
    const user = userEvent.setup()
    showLevel(nearlyFull)

    await user.click(flask(2))
    await user.click(flask(1))
    await user.click(flask(3))

    expect(screen.getByLabelText('Pours')).toHaveTextContent('1')
    expect(flask(3)).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps pouring into a four-layer flask on a board of taller glass', async () => {
    const user = userEvent.setup()
    showLevel(tallGlass)

    await pourFrom(user, 2, 1)

    expect(flask(1)).toHaveAccessibleName(
      'Flask 1, a 5-layer flask holding crimson, crimson, crimson, crimson, crimson from bottom to top'
    )
    expect(
      screen.getByRole('heading', { name: /elixirs sorted/i })
    ).toBeInTheDocument()
  })

  it('counts the pours the player has spent', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await pourFrom(user, 1, 2)

    expect(screen.getByLabelText('Pours')).toHaveTextContent('1')
  })

  it('says in how few pours the level can be sorted and what going over costs', () => {
    showLevel(level)

    expect(screen.getByText(/can be sorted in/i)).toHaveTextContent(
      'This level can be sorted in 4 pours. Every pour past that costs 25 points.'
    )
  })

  it('counts out which level of the campaign this is', () => {
    showLevel(level, { position: 2, worth: 2000 })

    // Anchored: the level name used to trail this line and read as clutter.
    expect(screen.getByText(/level 2 of 5/i)).toHaveTextContent(
      /^Level 2 of 5$/
    )
  })

  it('offers the next level once this one is sorted', async () => {
    const user = userEvent.setup()
    const onNextLevel = vi.fn()
    showLevel(finalPour, { onNextLevel })

    await pourFrom(user, 2, 1)
    await user.click(screen.getByRole('button', { name: 'Next level' }))

    // With the score, so the campaign can bank what this level was worth.
    expect(onNextLevel).toHaveBeenCalledWith(1000)
  })

  it('closes the campaign out on the last level rather than offering another', async () => {
    const user = userEvent.setup()
    showLevel(finalPour)

    await pourFrom(user, 2, 1)

    expect(
      screen.queryByRole('button', { name: 'Next level' })
    ).not.toBeInTheDocument()
    expect(screen.getByText(/every level/i)).toHaveTextContent(
      'Every level is sorted, for 1000 of 5000.'
    )
  })

  it('does not call the score final while there are levels left', async () => {
    const user = userEvent.setup()
    showLevel(finalPour, { onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    expect(screen.getByText(/score 1000 of 1000/i)).toHaveTextContent(
      /^Score 1000 of 1000$/
    )
  })

  /*
   * Fifty levels are more dots than a card can hold: the row of pips this
   * replaces ran off the side of it and squeezed the closing line out. A bar
   * says the same thing at any length of campaign.
   */
  it('measures how far into the campaign the sorted level is', async () => {
    const user = userEvent.setup()
    showLevel(finalPour, { position: 2, onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    const sorted = screen.getByRole('progressbar', {
      name: 'Level 2 of 5 sorted'
    })
    expect({
      levelsSorted: sorted.getAttribute('aria-valuenow'),
      levelsInTheCampaign: sorted.getAttribute('aria-valuemax')
    }).toEqual({ levelsSorted: '2', levelsInTheCampaign: '5' })
  })

  it('counts out how much of the campaign is still to sort', async () => {
    const user = userEvent.setup()
    showLevel(finalPour, { onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    expect(screen.getByText(/more to sort/i)).toHaveTextContent(
      '4 more to sort.'
    )
  })

  it('puts the next level under the player\u2019s finger', async () => {
    const user = userEvent.setup()
    showLevel(finalPour, { onNextLevel: vi.fn() })

    await pourFrom(user, 2, 1)

    expect(screen.getByRole('button', { name: 'Next level' })).toHaveFocus()
  })

  it('celebrates once every elixir is sorted', async () => {
    const user = userEvent.setup()
    showLevel(finalPour)

    await pourFrom(user, 2, 1)

    // Presence is the behaviour worth asserting here: whether the card has
    // finished fading in is a question only a real browser can answer, and the
    // e2e smoke test asks it there.
    expect(
      screen.getByRole('heading', { name: /elixirs sorted/i })
    ).toBeInTheDocument()
  })

  it('scores every level out of the same 1000', () => {
    showLevel(level)

    expect(screen.getByLabelText('Score')).toHaveTextContent('0 / 1000')
  })

  it('pays a flawless run the full 1000', async () => {
    const user = userEvent.setup()
    showLevel(finalPour)

    await pourFrom(user, 2, 1)

    // Awaited because the number climbs to it rather than appearing on it.
    await waitFor(() =>
      expect(screen.getByLabelText('Score')).toHaveTextContent('1000 / 1000')
    )
  })

  it('breaks the final score down against the fewest pours possible', async () => {
    const user = userEvent.setup()
    showLevel(finalPour)

    await pourFrom(user, 2, 1)

    expect(screen.getByText(/final score/i)).toHaveTextContent(
      'Final score 1000 of 1000'
    )
    expect(screen.getByText(/fewest possible/i)).toHaveTextContent(
      'Pours spent: 1 · Fewest possible: 1'
    )
  })

  /*
   * The end of a run nobody presses for, and the one the player cannot see
   * coming: the level has no pour left in it, and laying it out again costs
   * more than they have banked. Nothing has to be pressed for the run to be
   * over, so nothing should have to be pressed to be told.
   */
  it('closes the run down when the level runs dry and a restart is out of reach', () => {
    showLevel(deadEnd)

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'There is no pour left on this level, and you cannot pay the 100 points it costs to lay it out again.'
    )
  })

  it('leaves a stuck player who can pay for a restart to go and take it', () => {
    showLevel(deadEnd, { bankedScore: 100 })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('leaves the level standing while there are still pours left on it', () => {
    showLevel(level)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  /*
   * The speed and the restart are tools for a moment, not for the whole sitting:
   * they live behind the burger on the edge so the board keeps the screen.
   */
  it('keeps the tools tucked behind the menu until asked for', () => {
    showLevel(level)

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.queryByLabelText('Animation speed')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Restart' })
    ).not.toBeInTheDocument()
  })

  it('hands over the speed and the restart when the menu is opened', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await user.click(screen.getByRole('button', { name: 'Menu' }))

    expect(screen.getByLabelText('Animation speed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument()
  })

  it('takes the tools back when the menu is closed again', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Menu' }))

    await waitFor(() =>
      expect(screen.queryByLabelText('Animation speed')).not.toBeInTheDocument()
    )
    expect(
      screen.queryByRole('button', { name: 'Restart' })
    ).not.toBeInTheDocument()
  })

  it('closes the menu when Escape asks it to', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByLabelText('Animation speed')).not.toBeInTheDocument()
    )
  })

  /*
   * A tool spent is a tool with nothing left to hold the drawer open for:
   * pressing the restart, or settling on a speed, closes the drawer behind
   * the hand rather than leaving it over the board.
   */
  it('closes the menu behind a restart the player pays for', async () => {
    const user = userEvent.setup()
    showLevel(level, { bankedScore: 100 })

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Restart' }))

    await waitFor(() =>
      expect(screen.queryByLabelText('Animation speed')).not.toBeInTheDocument()
    )
    expect(
      screen.queryByRole('button', { name: 'Restart' })
    ).not.toBeInTheDocument()
  })

  it('closes the menu once a speed is settled on', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    // The browser's own change, fired when the value commits — the drawer
    // stays open through the drag that leads up to it.
    fireEvent.change(screen.getByLabelText('Animation speed'), {
      target: { value: '2' }
    })

    await waitFor(() =>
      expect(screen.queryByLabelText('Animation speed')).not.toBeInTheDocument()
    )
  })

  /* Changing your mind is free here: the undo stands beside the board and
     hands back the pour it was asked to take back, and the pour count — and
     with it the score — climbs back to where it stood. */
  it('takes the last pour back when the undo asks it to', async () => {
    const user = userEvent.setup()
    showLevel(level)

    await pourFrom(user, 2, 1)
    expect(screen.getByLabelText('Pours')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Pours')).toHaveTextContent('0')
    )
  })

  it('offers the undo only once there is a pour to take back', async () => {
    const user = userEvent.setup()
    showLevel(level)

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()

    await pourFrom(user, 2, 1)

    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
  })

  /*
   * The end of a run the player does press for. Nothing here is bought on
   * credit: a level thrown away by someone who cannot pay for it is the last
   * one of their run, which is what the warning under the button said it would
   * be.
   */
  it('ends the run of a player who restarts a level they cannot pay for', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    const onBeginAgain = vi.fn()
    showLevel(level, { onRestart, onBeginAgain })
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Restart' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Laying this level out again costs 100 points, which is more than you have.'
    )
    expect(onRestart).not.toHaveBeenCalled()
  })

  /*
   * The run is swept at the press rather than when the card is answered:
   * closing the tab is not a way out of a run, and it must not become one for
   * the run that has just ended.
   */
  it('sweeps the run away with the price the player could not pay', async () => {
    const user = userEvent.setup()
    const onBeginAgain = vi.fn()
    showLevel(level, { onBeginAgain })
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Restart' }))

    expect(onBeginAgain).toHaveBeenCalledTimes(1)
  })

  it('sweeps the board clean when the player begins a new run', async () => {
    const user = userEvent.setup()
    const onBeginAgain = vi.fn()
    showLevel(deadEnd, { onBeginAgain })

    await user.click(screen.getByRole('button', { name: 'Begin a new run' }))

    expect(onBeginAgain).toHaveBeenCalledTimes(1)
  })

  it('carries the points banked on earlier levels into the total', () => {
    showLevel(level, { bankedScore: 1750 })

    expect(screen.getByLabelText('Total')).toHaveTextContent('1750 / 5000')
  })

  it('counts what this level earns into the total as it is earned', async () => {
    const user = userEvent.setup()
    showLevel(finalPour, { bankedScore: 1750 })

    await pourFrom(user, 2, 1)

    await waitFor(() =>
      expect(screen.getByLabelText('Total')).toHaveTextContent('2750 / 5000')
    )
  })

  it('puts the board back the way it started on a restart', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    showLevel(level, { bankedScore: 100, onRestart })

    await pourFrom(user, 1, 2)
    await openMenu(user)
    await user.click(screen.getByRole('button', { name: 'Restart' }))

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
