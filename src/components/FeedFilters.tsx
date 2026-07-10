import React from 'react'
import { Calendar, TrendingUp, Clock, Filter } from 'lucide-react'

export type SortOption = 'newest' | 'oldest' | 'most_reactions' | 'trending'
export type TimeFilter = 'all' | 'today' | 'week' | 'month'

interface FeedFiltersProps {
  sortBy: SortOption
  timeFilter: TimeFilter
  onSortChange: (sort: SortOption) => void
  onTimeFilterChange: (filter: TimeFilter) => void
  totalCount: number
}

export default function FeedFilters({
  sortBy,
  timeFilter,
  onSortChange,
  onTimeFilterChange,
  totalCount
}: FeedFiltersProps) {
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'newest', label: 'Newest First', icon: <Clock className="w-4 h-4" /> },
    { value: 'oldest', label: 'Oldest First', icon: <Clock className="w-4 h-4 rotate-180" /> },
    { value: 'most_reactions', label: 'Most Reactions', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'trending', label: 'Trending', icon: <TrendingUp className="w-4 h-4" /> }
  ]

  const timeOptions: { value: TimeFilter; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ]

  return (
    <div className="card mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Results Count */}
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {totalCount} vent{totalCount !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Time Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={timeFilter}
              onChange={(e) => onTimeFilterChange(e.target.value as TimeFilter)}
              className="text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}