import { Game } from './components/Game'
import { Wordmark } from './components/Wordmark'
import { useCampaign } from './hooks/useCampaign'
import { LEVELS } from './domain/levels'

export function App() {
  const campaign = useCampaign(LEVELS)

  return (
    <>
      <Wordmark />
      <Game
        level={campaign.level}
        position={campaign.position}
        levelCount={campaign.levelCount}
        worth={campaign.worth}
        bankedScore={campaign.bankedScore}
        perfectTotal={campaign.perfectTotal}
        forfeited={campaign.forfeited}
        onNextLevel={campaign.hasNext ? campaign.advance : null}
        onRestart={campaign.chargeForRestart}
        onStartOver={campaign.startOver}
        onBeginAgain={campaign.beginAgain}
      />
    </>
  )
}
