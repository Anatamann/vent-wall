import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { MoodTag } from '../lib/types'

interface TrendingTag extends MoodTag {
  usage_count: number
  growth_rate: number
  recent_usage: number
}

interface TrendingAnalysis {
  trendingTags: TrendingTag[]
  popularEmojis: { emoji: string; count: number }[]
  peakHours: { hour: number; count: number }[]
  totalVentsToday: number
  totalReactionsToday: number
}

export function useTrendingAnalysis() {
  const [analysis, setAnalysis] = useState<TrendingAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrendingAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.analytics.trending()
      setAnalysis(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch trending analysis'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrendingAnalysis()

    const interval = setInterval(fetchTrendingAnalysis, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    analysis,
    loading,
    error,
    refresh: fetchTrendingAnalysis,
  }
}