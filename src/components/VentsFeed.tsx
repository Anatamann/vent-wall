import VentCard from './VentCard'
import InfiniteScroll from './InfiniteScroll'
import { MessageSquare } from 'lucide-react'
import type { Vent } from '../lib/types'

interface VentsFeedProps {
  vents: Vent[]
  loading: boolean
  loadingMore?: boolean
  error: string | null
  onLoadMore?: () => void
  hasMore: boolean
  selectedTags?: string[]
  onCreatePost?: () => void
  onClearFilters?: () => void
}

const GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full'

function VentCardSkeleton() {
  return (
    <div className="glass-card animate-pulse h-full">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-slate-700/80 rounded-full" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700/80 rounded w-24" />
          <div className="h-3 bg-slate-700/60 rounded w-16" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-slate-700/70 rounded w-full" />
        <div className="h-4 bg-slate-700/50 rounded w-3/4" />
      </div>
      <div className="flex space-x-2">
        <div className="h-6 bg-slate-700/60 rounded-full w-16" />
        <div className="h-6 bg-slate-700/60 rounded-full w-20" />
      </div>
    </div>
  )
}

export default function VentsFeed({
  vents,
  loading,
  loadingMore = false,
  error,
  onLoadMore,
  hasMore,
  selectedTags = [],
  onCreatePost,
  onClearFilters,
}: VentsFeedProps) {
  const hasTagFilter = selectedTags.length > 0
  if (error) {
    const isTagFilterError =
      hasTagFilter &&
      (error.toLowerCase().includes('tag filter') ||
        error.toLowerCase().includes('invalid tag'))

    return (
      <div className="glass-panel text-center py-12 px-4">
        <MessageSquare
          className={`w-16 h-16 mx-auto mb-4 ${
            isTagFilterError ? 'text-slate-500' : 'text-red-400'
          }`}
        />
        {isTagFilterError ? (
          <>
            <h3 className="text-base sm:text-lg font-medium text-slate-100 mb-2">No vents yet</h3>
            <p className="text-slate-400 mb-6">
              No vents on the Wall match these mood tags right now. Try different tags or clear
              your filters.
            </p>
            {onClearFilters && (
              <button type="button" onClick={onClearFilters} className="btn-glass">
                Clear filters
              </button>
            )}
          </>
        ) : (
          <div className="text-red-400">
            <p className="text-base sm:text-lg font-medium">Something went wrong</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{error}</p>
          </div>
        )}
      </div>
    )
  }

  if (loading && vents.length === 0) {
    return (
      <div className={GRID_CLASS}>
        {[...Array(6)].map((_, i) => (
          <VentCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (vents.length === 0) {
    return (
      <div className="glass-panel text-center py-12 px-4">
        <MessageSquare className="w-16 h-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-slate-100 mb-2">
          {loading ? 'Loading vents...' : hasTagFilter ? 'No vents yet' : 'No vents found'}
        </h3>
        <p className="text-slate-400 mb-6">
          {loading
            ? 'Please wait while we fetch the latest vents...'
            : hasTagFilter
              ? 'No vents on the Wall match these mood tags right now. Try different tags or clear your filters.'
              : 'Be the first to share your thoughts and emotions with the community.'}
        </p>
        {!loading && hasTagFilter && onClearFilters && (
          <button type="button" onClick={onClearFilters} className="btn-glass">
            Clear filters
          </button>
        )}
        {!loading && !hasTagFilter && onCreatePost && (
          <button type="button" onClick={onCreatePost} className="btn-primary">
            Share Your First Vent
          </button>
        )}
      </div>
    )
  }

  return (
    <InfiniteScroll
      hasMore={hasMore}
      loading={loadingMore}
      onLoadMore={onLoadMore || (() => {})}
    >
      <div className={GRID_CLASS}>
        {vents.map((vent) => (
          <VentCard key={vent.id} vent={vent} />
        ))}
      </div>
    </InfiniteScroll>
  )
}
