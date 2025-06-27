import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MoodTag } from '../lib/supabase'

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

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get trending tags (most used in last 7 days with growth rate)
      const { data: tagUsage, error: tagError } = await supabase
        .from('vent_tags')
        .select(`
          tag_id,
          mood_tags(id, name, color, emoji),
          vents!inner(created_at)
        `)
        .gte('vents.created_at', weekAgo.toISOString())

      if (tagError) throw tagError

      // Process tag usage data
      const tagStats = tagUsage?.reduce((acc, item) => {
        const tagId = item.tag_id
        const ventDate = new Date(item.vents.created_at)
        const isRecent = ventDate >= yesterday

        if (!acc[tagId]) {
          acc[tagId] = {
            ...item.mood_tags,
            usage_count: 0,
            recent_usage: 0
          }
        }

        acc[tagId].usage_count++
        if (isRecent) {
          acc[tagId].recent_usage++
        }

        return acc
      }, {} as Record<string, any>) || {}

      // Calculate growth rates and sort by trending
      const trendingTags = Object.values(tagStats)
        .map((tag: any) => ({
          ...tag,
          growth_rate: tag.usage_count > 0 ? (tag.recent_usage / tag.usage_count) * 100 : 0
        }))
        .sort((a: any, b: any) => {
          // Sort by combination of recent usage and growth rate
          const aScore = a.recent_usage * 2 + a.growth_rate
          const bScore = b.recent_usage * 2 + b.growth_rate
          return bScore - aScore
        })
        .slice(0, 10)

      // Get popular reaction emojis
      const { data: reactions, error: reactionsError } = await supabase
        .from('reactions')
        .select('emoji, created_at')
        .gte('created_at', weekAgo.toISOString())

      if (reactionsError) throw reactionsError

      const emojiCounts = reactions?.reduce((acc, reaction) => {
        acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const popularEmojis = Object.entries(emojiCounts)
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Get peak hours (when most vents are posted)
      const { data: vents, error: ventsError } = await supabase
        .from('vents')
        .select('created_at')
        .gte('created_at', weekAgo.toISOString())

      if (ventsError) throw ventsError

      const hourCounts = vents?.reduce((acc, vent) => {
        const hour = new Date(vent.created_at).getHours()
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {} as Record<number, number>) || {}

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // Get today's totals
      const { data: todayVents, error: todayVentsError } = await supabase
        .from('vents')
        .select('id')
        .gte('created_at', today.toISOString())

      if (todayVentsError) throw todayVentsError

      const { data: todayReactions, error: todayReactionsError } = await supabase
        .from('reactions')
        .select('id')
        .gte('created_at', today.toISOString())

      if (todayReactionsError) throw todayReactionsError

      setAnalysis({
        trendingTags,
        popularEmojis,
        peakHours,
        totalVentsToday: todayVents?.length || 0,
        totalReactionsToday: todayReactions?.length || 0
      })

    } catch (err: any) {
      setError(err.message || 'Failed to fetch trending analysis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrendingAnalysis()
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchTrendingAnalysis, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    analysis,
    loading,
    error,
    refresh: fetchTrendingAnalysis
  }
}