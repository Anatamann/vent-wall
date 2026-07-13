import { TrendingUp, Clock, Zap, BarChart3 } from 'lucide-react'
import { useTrendingAnalysis } from '../hooks/useTrendingAnalysis'
import LoadingSpinner from './LoadingSpinner'

export default function TrendingDashboard() {
  const { analysis, loading, error } = useTrendingAnalysis()

  if (loading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="glass-panel p-6">
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400">{error || 'Unable to load trending data'}</p>
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
    <div className="space-y-4 sm:space-y-5">
      <div className="glass-panel p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-amber-400" />
          Today's Activity
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="text-center min-w-0 px-1 rounded-xl border border-white/5 bg-slate-800/40 py-3">
            <p className="text-xl sm:text-2xl font-bold text-sky-400 tabular-nums">
              {analysis.totalVentsToday}
            </p>
            <p className="text-xs sm:text-sm text-slate-400">Vents Posted</p>
          </div>
          <div className="text-center min-w-0 px-1 rounded-xl border border-white/5 bg-slate-800/40 py-3">
            <p className="text-xl sm:text-2xl font-bold text-rose-400 tabular-nums">
              {analysis.totalReactionsToday}
            </p>
            <p className="text-xs sm:text-sm text-slate-400">Reactions Given</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
          Trending Moods
        </h3>
        <div className="space-y-3">
          {analysis.trendingTags.slice(0, 5).map((tag, index) => (
            <div
              key={tag.id}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 min-w-0"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="text-base sm:text-lg font-bold text-slate-500 w-5 sm:w-6 shrink-0 tabular-nums">
                  #{index + 1}
                </span>
                <span
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm shrink-0 border border-white/10"
                  style={{ backgroundColor: `${tag.color}25`, color: tag.color }}
                >
                  {tag.emoji}
                </span>
                <span className="font-medium text-slate-100 truncate min-w-0">{tag.name}</span>
              </div>
              <div className="flex items-baseline gap-3 sm:block sm:text-right shrink-0 pl-[3.25rem] sm:pl-0">
                <p className="text-xs sm:text-sm font-medium text-slate-200 tabular-nums whitespace-nowrap">
                  {tag.usage_count} uses
                </p>
                <p className="text-[10px] sm:text-xs text-emerald-400 whitespace-nowrap">
                  +{tag.growth_rate.toFixed(1)}% recent
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-4">Popular Reactions</h3>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
          {analysis.popularEmojis.slice(0, 10).map((emoji) => (
            <div
              key={emoji.emoji}
              className="text-center min-w-0 px-0.5 rounded-lg border border-white/5 bg-slate-800/40 py-2"
            >
              <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1 leading-none">{emoji.emoji}</div>
              <p className="text-[10px] sm:text-xs text-slate-400 tabular-nums truncate">
                {emoji.count}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-violet-400" />
          Most Active Hours
        </h3>
        <div className="space-y-2">
          {analysis.peakHours.map((hour) => {
            const maxCount = analysis.peakHours[0]?.count || 1
            const percentage = (hour.count / maxCount) * 100

            return (
              <div key={hour.hour} className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-slate-300 w-12 sm:w-16 shrink-0">
                  {formatHour(hour.hour)}
                </span>
                <div className="flex-1 min-w-0 bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/5">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all duration-300 max-w-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs sm:text-sm text-slate-400 w-6 sm:w-8 shrink-0 text-right tabular-nums">
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
