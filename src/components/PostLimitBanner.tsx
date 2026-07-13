import React from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { usePostLimits } from '../hooks/usePostLimits'

export default function PostLimitBanner() {
  const { canPost, postsToday, maxPosts, timeUntilReset, loading } = usePostLimits()

  if (loading || canPost) return null

  return (
    <div className="glass-panel mb-6 border-amber-400/25 bg-amber-500/10 px-4 py-3 sm:px-5">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-xs sm:text-sm font-medium text-amber-100">
            Daily Post Limit Reached
          </h3>
          <p className="text-xs sm:text-sm text-amber-200/80 mt-1">
            You've shared {postsToday} out of {maxPosts} vents today. This helps maintain a healthy
            sharing environment.
          </p>
          {timeUntilReset && (
            <div className="flex items-center space-x-1 mt-2 text-xs sm:text-sm text-amber-300/90">
              <Clock className="w-4 h-4" />
              <span>Reset in {timeUntilReset}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}