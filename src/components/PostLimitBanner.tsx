import React from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { usePostLimits } from '../hooks/usePostLimits'

export default function PostLimitBanner() {
  const { canPost, postsToday, maxPosts, timeUntilReset, loading } = usePostLimits()

  if (loading || canPost) return null

  return (
    <div className="card mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Daily Post Limit Reached
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            You've shared {postsToday} out of {maxPosts} vents today. This helps maintain a healthy sharing environment.
          </p>
          {timeUntilReset && (
            <div className="flex items-center space-x-1 mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              <Clock className="w-4 h-4" />
              <span>Reset in {timeUntilReset}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}