import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Flask } from './Flask'
import { GameOver } from './GameOver'
import { Menu } from './Menu'
import { Restart } from './Restart'
import { SpeedSlider } from './SpeedSlider'
import { Undo } from './Undo'
import { ScoreBoard } from './ScoreBoard'
import { useGame } from '../hooks/useGame'
import { useGameSounds } from '../hooks/useGameSounds'
import { usePourFlight } from '../hooks/usePourFlight'
import { celebrateLevel } from '../effects/confetti'
import { endOfRun } from '../domain/runsEnd'
import { canPayForRestart, priceOfRestart, totalScore } from '../domain/scoring'
import type { CSSProperties } from 'react'
import type { Level } from '../domain/levels'
import type { RunsEnd } from '../domain/runsEnd'

interface GameProps {
  readonly level: Level
  /** Which level of the campaign this is, counted the way a player counts. */
  readonly position: number
  readonly levelCount: number
  /** What a flawless run of this level pays, which climbs with its position. */
  readonly worth: number
  /** Points earned on the levels before this one, less what restarts cost. */
  readonly bankedScore: number
  /** The ceiling those points climb towards, as saved campaigns left it. */
  readonly perfectTotal: number
  /** What restarts have cost so far, which the restart button owns up to. */
  readonly forfeited: number
  /**
   * Hands over the next level, taking what this one scored so the campaign can
   * bank it. Null when this is the last level.
   */
  readonly onNextLevel: ((score: number) => void) | null
  /** Tells the campaign a level was thrown away, so it can charge for it. */
  readonly onRestart: () => void
  /** Opens a run from nothing, for a player with nothing left. */
  readonly onBeginAgain: () => void
}

export function Game({
  level,
  position,
  levelCount,
  worth,
  bankedScore,
  perfectTotal,
  forfeited,
  onNextLevel,
  onRestart,
  onBeginAgain
}: GameProps) {
  const game = useGame(level, worth)
  useGameSounds(game)
  const sortedId = useId()
  const [speed, setSpeed] = useState(1)

  /*
   * A run ended by a price the player could not pay. It is remembered here
   * rather than read back off the scoreboard, because there is nothing left in
   * the scoreboard to read: the run is swept the moment the price is refused.
   */
  const [pricedOut, setPricedOut] = useState<RunsEnd | null>(null)

  const flasksRef = useRef<HTMLOListElement | null>(null)
  const slots = useRef<(HTMLLIElement | null)[]>([])
  const pour = usePourFlight({
    board: game.board,
    selectedIndex: game.selectedIndex,
    flasksRef,
    slots,
    onTap: game.tapFlask,
    speed
  })

  useEffect(() => {
    if (game.isSolved) celebrateLevel()
  }, [game.isSolved])

  const total = totalScore({ banked: bankedScore, current: game.score })
  const isLastLevel = onNextLevel === null
  const restartPrice = priceOfRestart(position)
  const canRestart = canPayForRestart({ banked: bankedScore, position })

  /*
   * The ending nobody pressed for is asked after on every render rather than
   * watched for: a level runs dry the moment the last pour on it is spent, and
   * nothing is pressed to make that happen.
   */
  const ending =
    pricedOut ?? endOfRun({ board: game.board, banked: bankedScore, position })

  // The save is wiped rather than written over, so the board the player was
  // on cannot be waiting for them at the next reload.
  const sweepTheRun = () => {
    game.restart()
    onBeginAgain()
  }

  /*
   * A price the player cannot pay ends the run there and then, sweeping it as
   * it goes rather than waiting for the card to be answered: closing the tab
   * is not a way out of a run, and it must not become one for the run that has
   * just ended.
   */
  const endTheRun = (howItEnded: RunsEnd) => {
    setPricedOut(howItEnded)
    sweepTheRun()
  }

  const beginANewRun = () => {
    setPricedOut(null)
    sweepTheRun()
  }

  const restartLevel = () => {
    if (!canRestart) {
      endTheRun({ kind: 'restart', price: restartPrice })
      return
    }

    game.restart()
    onRestart()
  }

  return (
    <main className='game'>
      {/* The title and the score share one hanging cluster at the top of
          the screen: the name above, the numbers under it. */}
      <div className='hud'>
        <header className='game__header'>
          <h1 className='game__title'>Magic Sort</h1>
          <p className='game__level'>
            Level {position} of {levelCount}
          </p>
        </header>

        <ScoreBoard
          score={game.score}
          worth={worth}
          totalScore={total}
          perfectTotal={perfectTotal}
          pours={game.pours}
          minimumPours={level.minimumPours}
        />
      </div>

      <div className='board'>
        {/* Hanging just off the board's left edge: taking back a slip of
            the finger is part of playing, not a tool put away in a drawer. */}
        <Undo canUndo={game.canUndo} onUndo={game.undo} />

        <ol className='bench' aria-label='Flasks' ref={flasksRef}>
          {game.board.map((flask, index) => (
            <li
              key={index}
              className='bench__slot'
              ref={(slot) => {
                slots.current[index] = slot
              }}
            >
              <Flask
                position={index + 1}
                contents={flask.contents}
                capacity={flask.capacity}
                isSelected={game.selectedIndex === index}
                refusedAt={
                  game.lastTap.refusedFlaskIndex === index
                    ? game.lastTap.sequence
                    : null
                }
                onTap={() => pour.tapFlask(index)}
                speed={speed}
              />
            </li>
          ))}

          {/* The elixir in the air, drawn between the tipped flask and the one
            filling: it belongs to the board rather than to either flask. */}
          {pour.stream !== null && (
            <motion.span
              className='pour-stream'
              aria-hidden='true'
              data-elixir={pour.stream.elixir}
              style={
                {
                  left: pour.stream.left,
                  top: pour.stream.top,
                  height: pour.stream.height
                } as CSSProperties
              }
              initial={{ scaleY: 0, opacity: 1 }}
              animate={{ scaleY: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 / speed, ease: 'easeIn' }}
            />
          )}
        </ol>
      </div>

      <Menu>
        <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
        <Restart
          onRestart={restartLevel}
          price={restartPrice}
          forfeited={forfeited}
          wouldEndTheRun={!canRestart}
        />
      </Menu>

      <AnimatePresence>
        {game.isSolved && (
          <motion.section
            className='victory'
            role='status'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className='victory__card'
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <h2 className='victory__title'>Elixirs sorted!</h2>

              {/* "Final" only when it is: the word was telling players on the
                  first level that they had reached the end of the game. */}
              <p className='victory__score'>
                {isLastLevel ? 'Final score' : 'Score'} {game.score} of {worth}
              </p>
              <p className='victory__detail'>
                Pours spent: {game.pours} · Fewest possible:{' '}
                {level.minimumPours}
              </p>

              {/* The card covers the whole campaign, so it has to carry the
                  progress the header behind it would otherwise show. A bar
                  rather than a pip per level: fifty of those ran off the
                  side of the card. */}
              <div className='victory__progress'>
                <div
                  className='meter'
                  role='progressbar'
                  aria-labelledby={sortedId}
                  aria-valuemin={0}
                  aria-valuemax={levelCount}
                  aria-valuenow={position}
                >
                  <motion.span
                    className='meter__fill'
                    aria-hidden='true'
                    initial={{ scaleX: (position - 1) / levelCount }}
                    animate={{ scaleX: position / levelCount }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <p className='victory__sorted' id={sortedId}>
                  Level {position} of {levelCount} sorted
                </p>
                <p className='victory__closing'>
                  {isLastLevel
                    ? `Every level is sorted, for ${total} of ${perfectTotal}.`
                    : `${levelCount - position} more to sort.`}
                </p>
              </div>

              <div className='victory__actions'>
                {onNextLevel !== null && (
                  <button
                    type='button'
                    className='button button--primary button--wide'
                    autoFocus
                    onClick={() => onNextLevel(game.score)}
                  >
                    Next level <span aria-hidden='true'>→</span>
                  </button>
                )}
                <button
                  type='button'
                  className='button button--quiet'
                  autoFocus={isLastLevel}
                  onClick={game.restart}
                >
                  Play again
                </button>
              </div>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* The end of the run covers everything, the board included: there is
          nothing left on it the player could pay their way out with. */}
      <AnimatePresence>
        {ending !== null && (
          <GameOver ending={ending} onBeginAgain={beginANewRun} />
        )}
      </AnimatePresence>
    </main>
  )
}
