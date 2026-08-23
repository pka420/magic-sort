import { useId } from 'react'
import { CountingNumber } from './CountingNumber'
import { pourPenalty } from '../domain/scoring'

interface ScoreBoardProps {
  readonly score: number
  /** What a flawless run of this level pays, which is what it is scored out of. */
  readonly worth: number
  /** The whole campaign so far, this level included. */
  readonly totalScore: number
  readonly perfectTotal: number
  readonly pours: number
  readonly minimumPours: number
}

export function ScoreBoard({
  score,
  worth,
  totalScore,
  perfectTotal,
  pours,
  minimumPours
}: ScoreBoardProps) {
  return (
    <div className='scoreboard'>
      <dl className='scoreboard__stats'>
        <Stat label='Score' value={score} outOf={worth} counting />
        <Stat label='Total' value={totalScore} outOf={perfectTotal} counting />
        <Stat label='Pours' value={pours} />
      </dl>

      {/* This used to be a bare stat labelled "Par", which reads as golf to
          everyone who has not played golf. Spell the rule out instead. */}
      <p className='scoreboard__hint'>
        This level can be sorted in {minimumPours} pours. Every pour past that
        costs {pourPenalty(worth)} points.
      </p>
    </div>
  )
}

interface StatProps {
  readonly label: string
  readonly value: number
  /** The most this stat can reach, for a stat that has a ceiling. */
  readonly outOf?: number
  /**
   * Climbs to a new value instead of snapping to it. For points, where the
   * climb is part of the reward — not for the pour count, which is the player's
   * own action and has to land the instant they tap.
   */
  readonly counting?: boolean
}

function Stat({ label, value, outOf, counting = false }: StatProps) {
  const labelId = useId()

  return (
    <div className='stat'>
      <dt className='stat__label' id={labelId}>
        {label}
      </dt>
      <dd className='stat__value' aria-labelledby={labelId}>
        {counting ? <CountingNumber value={value} /> : value}
        {outOf !== undefined && (
          <span className='stat__ceiling'> / {outOf}</span>
        )}
      </dd>
    </div>
  )
}
