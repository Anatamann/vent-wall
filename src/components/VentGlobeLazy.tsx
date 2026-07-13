import { lazy, Suspense } from 'react'
import LoadingSpinner from './LoadingSpinner'

const VentGlobe = lazy(() => import('./VentGlobe'))

export default function VentGlobeLazy() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <VentGlobe />
    </Suspense>
  )
}
