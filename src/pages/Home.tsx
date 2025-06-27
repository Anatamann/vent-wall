import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import MoodTagFilter from '../components/MoodTagFilter'
import TagSearch from '../components/TagSearch'
import VentsFeed from '../components/VentsFeed'
import FeedFilters from '../components/FeedFilters'
import TrendingDashboard from '../components/TrendingDashboard'
import AdvancedSearch from '../components/AdvancedSearch'
import PerformanceOptimizer from '../components/PerformanceOptimizer'
import FloatingPostButton from '../components/FloatingPostButton'
import PostModal from '../components/PostModal'

import { useRealtimeVents } from '../hooks/useRealtimeVents'
import { useMoodTags } from '../hooks/useMoodTags'
import { usePostLimits } from '../hooks/usePostLimits'
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor'
import { useAuth } from '../hooks/useAuth'
import { useScrollPosition } from '../hooks/useScrollPosition'
import { Search, TrendingUp } from 'lucide-react'
import type { SortOption, TimeFilter } from '../components/FeedFilters'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [showTrending, setShowTrending] = useState(false)
  const [showPerformance, setShowPerformance] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  
  const scrollY = useScrollPosition()

  const { tags, loading: tagsLoading } = useMoodTags()
  const { 
    vents, 
    loading: ventsLoading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    addReaction, 
    refresh 
  } = useRealtimeVents({
    selectedTags,
    sortBy,
    timeFilter
  })
  const { canPost } = usePostLimits()
  const { metrics, optimize } = usePerformanceMonitor()

  // Memoize filtered vents count for performance
  const filteredVentsCount = useMemo(() => vents.length, [vents.length])

  const handleTagSelect = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handlePostClick = () => {
    if (!isAuthenticated) {
      // Redirect to auth or show login modal
      window.location.href = '/auth'
    } else {
      setIsPostModalOpen(true)
    }
  }

  const handlePostCreated = useCallback(() => {
    refresh()
  }, [refresh])

  // Debug logging for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Home page state:', {
        ventsCount: vents.length,
        loading: ventsLoading,
        error,
        selectedTags,
        sortBy,
        timeFilter
      })
    }
  }, [vents.length, ventsLoading, error, selectedTags, sortBy, timeFilter])

  const handleAdvancedSearch = (filters: any) => {
    // Apply advanced search filters
    console.log('Advanced search filters:', filters)
    // This would integrate with the useRealtimeVents hook
  }

  // Calculate dynamic styles for FeedFilters
  const feedFiltersOpacity = Math.max(0, 1 - (scrollY - 50) / (100));
  const feedFiltersHeight = Math.max(0, 100 - (scrollY - 50));

  return (
    <div className="flex flex-col h-[calc(100vh - 64px - 32px)] overflow-y-auto space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsAdvancedSearchOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">Advanced Search</span>
          </button>
          
          <button
            onClick={() => setShowTrending(!showTrending)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              showTrending
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Trending</span>
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => setShowPerformance(!showPerformance)}
            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Performance
          </button>
        )}
      </div>

      {/* Performance Monitor (Development Only) */}
      {process.env.NODE_ENV === 'development' && showPerformance && (
        <PerformanceOptimizer metrics={metrics} onOptimize={optimize} />
      )}

      {/* Trending Dashboard */}
      {showTrending && <TrendingDashboard />}
      

      {/* Mood Tags Filter */}
      <MoodTagFilter
        tags={tags}
        selectedTags={selectedTags}
        onTagSelect={handleTagSelect}
        onSearchOpen={() => setIsSearchOpen(true)}
        loading={tagsLoading}
      />

      {/* Feed Filters */}
      <div style={{ opacity: feedFiltersOpacity, height: `${feedFiltersHeight}px`, overflow: 'hidden' }} className="flex-shrink-0">
        <FeedFilters
          sortBy={sortBy}
          timeFilter={timeFilter}
          onSortChange={setSortBy}
          onTimeFilterChange={setTimeFilter}
          totalCount={filteredVentsCount}
        />
      </div>

      {/* Vents Feed */}
      <VentsFeed
        vents={vents}
        loading={ventsLoading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onReaction={addReaction}
        selectedTags={selectedTags}
      />

      {/* Tag Search Modal */}
      <TagSearch
        tags={tags}
        selectedTags={selectedTags}
        onTagSelect={handleTagSelect}
        onClose={() => setIsSearchOpen(false)}
        isOpen={isSearchOpen}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearch
        onSearch={handleAdvancedSearch}
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
      />

      {/* Floating Post Button */}
      <FloatingPostButton 
        onClick={handlePostClick} 
        disabled={isAuthenticated && !canPost}
      />

      {/* Post Modal */}
      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}