import { useState, useCallback, useMemo, useEffect } from 'react'
import MoodTagFilter from '../components/MoodTagFilter'
import TagSearch from '../components/TagSearch'
import VentsFeed from '../components/VentsFeed'
import FeedFilters from '../components/FeedFilters'
import TrendingDashboard from '../components/TrendingDashboard'
import AdvancedSearch from '../components/AdvancedSearch'
import FloatingPostButton from '../components/FloatingPostButton'
import PostModal from '../components/PostModal'
import PostLimitBanner from '../components/PostLimitBanner'
import { useRealtimeVents } from '../hooks/useRealtimeVents'
import { useMoodTags } from '../hooks/useMoodTags'
import { usePostLimits } from '../hooks/usePostLimits'
import { useAuth } from '../hooks/useAuth'
import { Search, TrendingUp } from 'lucide-react'
import type { SortOption, TimeFilter } from '../components/FeedFilters'

export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [showTrending, setShowTrending] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  
  const { tags, loading: tagsLoading } = useMoodTags()
  const { 
    vents, 
    loading: ventsLoading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    refresh 
  } = useRealtimeVents({
    selectedTags,
    sortBy,
    timeFilter
  })
  const { canPost, refresh: refreshPostLimits } = usePostLimits()

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
    refreshPostLimits()
  }, [refresh, refreshPostLimits])

  // Debug logging for development
  useEffect(() => {
    if (import.meta.env.DEV) {
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
  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-4">
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
      </div>

      {/* Trending Dashboard */}
      {showTrending && <TrendingDashboard />}
      {/* Post Limit Banner */}
      {isAuthenticated && <PostLimitBanner />}

      {/* Mood Tags Filter */}
      <MoodTagFilter
        tags={tags}
        selectedTags={selectedTags}
        onTagSelect={handleTagSelect}
        onSearchOpen={() => setIsSearchOpen(true)}
        loading={tagsLoading}
      />

      {/* Feed Filters */}
      <FeedFilters
        sortBy={sortBy}
        timeFilter={timeFilter}
        onSortChange={setSortBy}
        onTimeFilterChange={setTimeFilter}
        totalCount={filteredVentsCount}
      />

      {/* Vents Feed */}
      <VentsFeed
        vents={vents}
        loading={ventsLoading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        selectedTags={selectedTags}
        onCreatePost={handlePostClick}
        onClearFilters={() => setSelectedTags([])}
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