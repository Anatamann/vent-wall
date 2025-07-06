import React from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Calendar, MessageSquare, Heart, TrendingUp, Clock } from 'lucide-react'

interface UserStatsProps {
  stats: {
    totalVents: number
    totalReactions: number
    joinedDate: string
    lastActiveDate: string
    postsThisMonth: number
    averageReactionsPerVent: number
  }
}

export default function UserStats({ stats }: UserStatsProps) {
  const joinedAgo = formatDistanceToNow(new Date(stats.joinedDate), { addSuffix: true })
  const lastActiveAgo = formatDistanceToNow(new Date(stats.lastActiveDate), { addSuffix: true })

  const statItems = [
    {
      icon: MessageSquare,
      label: 'Total Vents',
      value: stats.totalVents,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      icon: Heart,
      label: 'Total Reactions',
      value: stats.totalReactions,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    {
      icon: TrendingUp,
      label: 'Avg. Reactions',
      value: stats.averageReactionsPerVent,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      icon: Calendar,
      label: 'This Month',
      value: stats.postsThisMonth,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    }
  ]

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Your Statistics
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statItems.map((item, index) => (
          <div key={index} className="text-center">
            <div className={`w-12 h-12 ${item.bgColor} rounded-full flex items-center justify-center mx-auto mb-2`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {typeof item.value === 'number' && item.value % 1 !== 0 
                ? item.value.toFixed(1) 
                : item.value
              }
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline Info */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 text-sm md:text-base text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Joined {joinedAgo}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Last active {lastActiveAgo}</span>
          </div>
        </div>
      </div>
    </div>
  )
}