import { Footer } from './components/Footer'
import { Game } from './components/Game'
import { useCampaign } from './hooks/useCampaign'
import { useAuth } from './hooks/useAuth'
import { LEVELS } from './domain/levels'

export function App() {
  const campaign = useCampaign(LEVELS)
  const auth = useAuth()

  return (
    <div className='app'>
      <Game
        level={campaign.level}
        position={campaign.position}
        levelCount={campaign.levelCount}
        worth={campaign.worth}
        bankedScore={campaign.bankedScore}
        perfectTotal={campaign.perfectTotal}
        forfeited={campaign.forfeited}
        auth={auth}
        onNextLevel={campaign.hasNext ? campaign.advance : null}
        onRestart={campaign.chargeForRestart}
        onBeginAgain={campaign.beginAgain}
      />
      <Footer />
    </div>
  )
}
