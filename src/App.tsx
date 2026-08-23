import { Game } from './components/Game'
import { useCampaign } from './hooks/useCampaign'
import { LEVELS } from './domain/levels'

export function App() {
  const campaign = useCampaign(LEVELS)

  return (
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
      onBeginAgain={campaign.beginAgain}
    />
  )
}
