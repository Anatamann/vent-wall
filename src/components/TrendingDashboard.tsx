import React from 'react'
import { TrendingUp, Clock, Zap, BarChart3 } from 'lucide-react'
import { useTrendingAnalysis } from '../hooks/useTrendingAnalysis'
import LoadingSpinner from './LoadingSpinner'

export default function TrendingDashboard() {
  const { analysis, loading, error } = useTrendingAnalysis()

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">
            {error || 'Unable to load trending data'}
          </p>
        </div>
      </div>
    )
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  return (
    <div className="space-y-6">
      {/* Today's Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Today's Activity
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {analysis.totalVentsToday}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Vents Posted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {analysis.totalReactionsToday}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Reactions Given</p>
          </div>
        </div>
      </div>

      {/* Trending Tags */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
          Trending Moods
        </h3>
        <div className="space-y-3">
          {analysis.trendingTags.slice(0, 5).map((tag, index) => (
            <div key={tag.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-gray-400 dark:text-gray-500 w-6">
                  #{index + 1}
                </span>
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.emoji}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {tag.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tag.usage_count} uses
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +{tag.growth_rate.toFixed(1)}% recent
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Reactions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Popular Reactions
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {analysis.popularEmojis.slice(0, 10).map((emoji, index) => (
            <div key={emoji.emoji} className="text-center">
              <div className="text-2xl mb-1">{emoji.emoji}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {emoji.count}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Hours */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-purple-500" />
          Most Active Hours
        </h3>
        <div className="space-y-2">
          {analysis.peakHours.map((hour, index) => {
            const maxCount = analysis.peakHours[0]?.count || 1
            const percentage = (hour.count / maxCount) * 100
            
            return (
              <div key={hour.hour} className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">
                  {formatHour(hour.hour)}
                </span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm md:text-base text-gray-600 dark:text-gray-400 w-8">
                  {hour.count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}