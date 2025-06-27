import React, { memo, useMemo } from 'react'
import { Zap, TrendingUp, Clock } from 'lucide-react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  cacheHitRate: number
  apiResponseTime: number
}

interface PerformanceOptimizerProps {
  metrics: PerformanceMetrics
  onOptimize?: () => void
}

const PerformanceOptimizer = memo(({ metrics, onOptimize }: PerformanceOptimizerProps) => {
  const performanceScore = useMemo(() => {
    const renderScore = Math.max(0, 100 - (metrics.renderTime * 10))
    const memoryScore = Math.max(0, 100 - (metrics.memoryUsage / 1024 / 1024 * 10))
    const cacheScore = metrics.cacheHitRate
    const apiScore = Math.max(0, 100 - (metrics.apiResponseTime / 10))
    
    return Math.round((renderScore + memoryScore + cacheScore + apiScore) / 4)
  }, [metrics])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Performance Monitor
        </h3>
        
        <div className={`px-3 py-1 rounded-full ${getScoreBg(performanceScore)}`}>
          <span className={`text-sm font-medium ${getScoreColor(performanceScore)}`}>
            Score: {performanceScore}/100
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {metrics.renderTime.toFixed(1)}ms
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Render Time</p>
        </div>

        <div className="text-center">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Memory</p>
        </div>

        <div className="text-center">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {metrics.cacheHitRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Cache Hit</p>
        </div>

        <div className="text-center">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {metrics.apiResponseTime.toFixed(0)}ms
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">API Response</p>
        </div>
      </div>

      {performanceScore < 70 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Performance could be improved
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Consider optimizing render cycles and memory usage
              </p>
            </div>
            {onOptimize && (
              <button
                onClick={onOptimize}
                className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
              >
                Optimize
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

PerformanceOptimizer.displayName = 'PerformanceOptimizer'

export default PerformanceOptimizer