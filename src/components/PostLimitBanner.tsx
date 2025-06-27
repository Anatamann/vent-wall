import React from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { usePostLimits } from '../hooks/usePostLimits'

export default function PostLimitBanner() {
  const { canPost, postsToday, maxPosts, timeUntilReset, loading } = usePostLimits()

  if (loading) return null

  const limitReached = !canPost

  return (
    <div className={`card mb-6 ${limitReached ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-start space-x-3">
        {limitReached ? (
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        ) : (
          <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3 className="text-sm font-medium ${limitReached ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-gray-100'}">
            {limitReached ? 'Daily Post Limit Reached' : 'Your Daily Post Status'}
          </h3>
          <p className={`text-sm ${limitReached ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-600 dark:text-gray-400'} mt-1`}>
            You've shared {postsToday} out of {maxPosts} vents today.
            {limitReached && " This helps maintain a healthy sharing environment."}
          </p>
          {limitReached && timeUntilReset && (
            <div className="flex items-center space-x-1 mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              <Clock className="w-4 h-4" />
              <span>Reset in {timeUntilReset}</span>
            </div>
          )}
          {!limitReached && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You can post {maxPosts - postsToday} more vents today.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}