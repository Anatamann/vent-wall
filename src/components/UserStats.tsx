import { formatDistanceToNow } from 'date-fns'
import { Calendar, MessageSquare, Heart, TrendingUp, Clock, Sparkles } from 'lucide-react'

interface UserStatsProps {
  stats: {
    totalVents: number
    /** @deprecated prefer totalReactionsReceived — kept for older API payloads */
    totalReactions: number
    totalReactionsReceived?: number
    totalReactionsGiven?: number
    totalCommentsGiven?: number
    joinedDate: string
    lastActiveDate: string
    postsThisMonth: number
    averageReactionsPerVent: number
  }
}

export default function UserStats({ stats }: UserStatsProps) {
  const joinedAgo = formatDistanceToNow(new Date(stats.joinedDate), { addSuffix: true })
  const lastActiveAgo = formatDistanceToNow(new Date(stats.lastActiveDate), { addSuffix: true })

  const received = stats.totalReactionsReceived ?? stats.totalReactions
  const given = stats.totalReactionsGiven ?? 0
  const commentsGiven = stats.totalCommentsGiven ?? 0

  const statItems = [
    {
      icon: MessageSquare,
      label: 'Your vents',
      value: stats.totalVents,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/15 border-sky-400/20',
    },
    {
      icon: Heart,
      label: 'Reactions received',
      value: received,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/15 border-rose-400/20',
    },
    {
      icon: Sparkles,
      label: 'Reactions given',
      value: given,
      color: 'text-amber-300',
      bgColor: 'bg-amber-500/15 border-amber-400/20',
    },
    {
      icon: TrendingUp,
      label: 'Avg. on your vents',
      value: stats.averageReactionsPerVent,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15 border-emerald-400/20',
    },
    {
      icon: Calendar,
      label: 'Posts this month',
      value: stats.postsThisMonth,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/15 border-violet-400/20',
    },
    {
      icon: MessageSquare,
      label: 'Comments given',
      value: commentsGiven,
      color: 'text-cyan-300',
      bgColor: 'bg-cyan-500/15 border-cyan-400/20',
    },
  ]

  return (
    <div className="glass-panel p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-slate-50 mb-2">Your Statistics</h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="text-center rounded-xl border border-white/5 bg-slate-800/40 px-2 py-4"
          >
            <div
              className={`w-11 h-11 ${item.bgColor} border rounded-full flex items-center justify-center mx-auto mb-2`}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-50 tabular-nums">
              {typeof item.value === 'number' && item.value % 1 !== 0
                ? item.value.toFixed(1)
                : item.value}
            </p>
            <p className="text-xs sm:text-sm text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 text-xs sm:text-sm text-slate-400">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Joined {joinedAgo}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Last active {lastActiveAgo}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
