import { TrendingUp, Clock, Filter } from 'lucide-react'

export type SortOption = 'newest' | 'oldest' | 'most_reactions' | 'trending'
/** @deprecated Time filter removed from UI; kept for API compatibility with default 'all'. */
export type TimeFilter = 'all' | 'today' | 'week' | 'month'

interface FeedFiltersProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  totalCount: number
}

export default function FeedFilters({ sortBy, onSortChange, totalCount }: FeedFiltersProps) {
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'newest', label: 'Newest First', icon: <Clock className="w-4 h-4" /> },
    { value: 'oldest', label: 'Oldest First', icon: <Clock className="w-4 h-4 rotate-180" /> },
    { value: 'most_reactions', label: 'Most Reactions', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'trending', label: 'Trending', icon: <TrendingUp className="w-4 h-4" /> },
  ]

  return (
    <div className="glass-panel mb-6 px-4 py-3 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs sm:text-sm text-slate-400">
            {totalCount} vent{totalCount !== 1 ? 's' : ''} found
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-slate-500">Sort</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="text-xs sm:text-sm rounded-full border border-white/10 bg-slate-800/80 text-slate-200
              px-3 py-1.5 backdrop-blur-sm
              focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/40"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
