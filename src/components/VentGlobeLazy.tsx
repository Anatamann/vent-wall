import { lazy, Suspense } from 'react'
import LoadingSpinner from './LoadingSpinner'

const VentGlobe = lazy(() => import('./VentGlobe'))

interface VentGlobeLazyProps {
  onViewChange: (view: 'wall' | 'globe') => void
}

export default function VentGlobeLazy({ onViewChange }: VentGlobeLazyProps) {
  return (
    <Suspense
      fallback={
        <div className="globe-stage flex h-full w-full items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <VentGlobe onViewChange={onViewChange} />
    </Suspense>
  )
}
