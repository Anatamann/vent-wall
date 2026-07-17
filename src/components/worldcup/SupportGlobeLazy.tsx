import { lazy, Suspense } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import type { WorldCupStats, WorldCupSupport, WorldCupTeamId } from '../../lib/types'

const SupportGlobe = lazy(() => import('./SupportGlobe'))

interface SupportGlobeLazyProps {
  onViewChange: (view: 'wall' | 'globe') => void
  stats: WorldCupStats | null
  mySupport: WorldCupSupport | null
  voting?: boolean
  voteMessage?: string | null
  onVote: (teamId: WorldCupTeamId) => void
  regionsRefreshKey?: number
}

export default function SupportGlobeLazy({
  onViewChange,
  stats,
  mySupport,
  voting,
  voteMessage,
  onVote,
  regionsRefreshKey,
}: SupportGlobeLazyProps) {
  return (
    <Suspense
      fallback={
        <div className="globe-stage flex h-full w-full items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <SupportGlobe
        onViewChange={onViewChange}
        stats={stats}
        mySupport={mySupport}
        voting={voting}
        voteMessage={voteMessage}
        onVote={onVote}
        regionsRefreshKey={regionsRefreshKey}
      />
    </Suspense>
  )
}
