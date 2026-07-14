import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import MoodTagFilter from '../components/MoodTagFilter'
import TagSearch from '../components/TagSearch'
import VentsFeed from '../components/VentsFeed'
import FeedFilters from '../components/FeedFilters'
import TrendingDashboard from '../components/TrendingDashboard'
import AdvancedSearch, { type AdvancedSearchFilters } from '../components/AdvancedSearch'
import FloatingPostButton from '../components/FloatingPostButton'
import PostModal from '../components/PostModal'
import PostLimitBanner from '../components/PostLimitBanner'
import ViewSwitcher from '../components/ViewSwitcher'
import VentGlobeLazy from '../components/VentGlobeLazy'
import { useRealtimeVents } from '../hooks/useRealtimeVents'
import { useMoodTags } from '../hooks/useMoodTags'
import { usePostLimits } from '../hooks/usePostLimits'
import { useAuth } from '../hooks/useAuth'
import { Search, TrendingUp } from 'lucide-react'
import type { SortOption } from '../components/FeedFilters'

type HomeView = 'wall' | 'globe'

/** Tailwind `lg` (1024px): desktop → Vent Globe; smaller screens → Vent Wall. */
const DESKTOP_MIN_WIDTH_PX = 1024

function getDefaultHomeView(): HomeView {
  if (typeof window === 'undefined') return 'wall'
  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`).matches
    ? 'globe'
    : 'wall'
}

function parseViewParam(value: string | null): HomeView | null {
  if (value === 'wall' || value === 'globe') return value
  return null
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL `?view=` wins (post-detail back links); else device default.
  const [view, setView] = useState<HomeView>(() => {
    return parseViewParam(searchParams.get('view')) ?? getDefaultHomeView()
  })

  const handleViewChange = useCallback(
    (next: HomeView) => {
      setView(next)
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('view', next)
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  // Stay in sync when navigating with /?view=wall|globe
  useEffect(() => {
    const fromUrl = parseViewParam(searchParams.get('view'))
    if (fromUrl && fromUrl !== view) {
      setView(fromUrl)
    }
  }, [searchParams, view])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [showTrending, setShowTrending] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [searchUsername, setSearchUsername] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [minReactions, setMinReactions] = useState(0)

  const { tags, loading: tagsLoading } = useMoodTags()
  const {
    vents,
    loading: ventsLoading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useRealtimeVents({
    selectedTags,
    sortBy,
    timeFilter: 'all',
    username: searchUsername,
    query: searchQuery,
    minReactions,
  })
  const { canPost, refresh: refreshPostLimits } = usePostLimits()

  const filteredVentsCount = useMemo(() => vents.length, [vents.length])

  const handleTagSelect = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handlePostClick = () => {
    if (!isAuthenticated) {
      window.location.href = '/auth'
    } else {
      setIsPostModalOpen(true)
    }
  }

  const handlePostCreated = useCallback(() => {
    refresh()
    refreshPostLimits()
  }, [refresh, refreshPostLimits])

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Home page state:', {
        view,
        ventsCount: vents.length,
        loading: ventsLoading,
        error,
        selectedTags,
        sortBy,
      })
    }
  }, [view, vents.length, ventsLoading, error, selectedTags, sortBy])

  // Shared dark shell: wall scrolls; globe is full-viewport locked
  useEffect(() => {
    document.body.classList.toggle('globe-view-active', view === 'globe')
    document.body.classList.toggle('wall-view-active', view === 'wall')
    return () => {
      document.body.classList.remove('globe-view-active', 'wall-view-active')
    }
  }, [view])

  const handleAdvancedSearch = (filters: AdvancedSearchFilters) => {
    setSearchQuery(filters.query.trim())
    setSearchUsername(filters.username.trim())
    setMinReactions(Math.max(0, filters.minReactions || 0))
    if (filters.tags.length > 0) {
      setSelectedTags(filters.tags)
    }
    const sortMap: Record<AdvancedSearchFilters['sortBy'], SortOption> = {
      newest: 'newest',
      oldest: 'oldest',
      most_reactions: 'most_reactions',
      relevance: 'newest',
    }
    setSortBy(sortMap[filters.sortBy] || 'newest')
  }

  const clearAdvancedSearch = () => {
    setSearchQuery('')
    setSearchUsername('')
    setMinReactions(0)
  }

  const hasAdvancedFilters =
    Boolean(searchUsername) || Boolean(searchQuery) || minReactions > 0

  if (view === 'globe') {
    return (
      <div className="relative h-full w-full min-h-0 overflow-hidden">
        <VentGlobeLazy onViewChange={handleViewChange} />
        <FloatingPostButton
          onClick={handlePostClick}
          disabled={isAuthenticated && !canPost}
          stacked={isAuthenticated}
        />
        <PostModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          onPostCreated={handlePostCreated}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <ViewSwitcher view={view} onChange={handleViewChange} variant="dark" />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={() => setIsAdvancedSearchOpen(true)}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium
            border backdrop-blur-sm transition-colors ${
              hasAdvancedFilters
                ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                : 'border-white/10 bg-slate-800/70 text-slate-200 hover:border-sky-400/30 hover:bg-slate-700/80'
            }`}
        >
          <Search className="w-4 h-4" />
          <span>Advanced Search</span>
        </button>

        {hasAdvancedFilters && (
          <button
            type="button"
            onClick={clearAdvancedSearch}
            className="px-3 py-2 rounded-full text-[11px] sm:text-xs font-medium text-slate-400
              border border-white/10 hover:text-slate-200 hover:border-sky-400/25 transition-colors"
          >
            Clear search
          </button>
        )}

        <button
          onClick={() => setShowTrending(!showTrending)}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium
            border backdrop-blur-sm transition-colors ${
              showTrending
                ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                : 'border-white/10 bg-slate-800/70 text-slate-200 hover:border-sky-400/30 hover:bg-slate-700/80'
            }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Trending</span>
        </button>
      </div>

      {hasAdvancedFilters && (
        <p className="text-[11px] sm:text-xs text-slate-400">
          Active search
          {searchUsername ? ` · @${searchUsername}` : ''}
          {searchQuery ? ` · “${searchQuery}”` : ''}
          {minReactions > 0 ? ` · ≥${minReactions} reactions` : ''}
        </p>
      )}

      {showTrending && <TrendingDashboard />}
      {isAuthenticated && <PostLimitBanner />}

      <MoodTagFilter
        tags={tags}
        selectedTags={selectedTags}
        onTagSelect={handleTagSelect}
        onSearchOpen={() => setIsSearchOpen(true)}
        loading={tagsLoading}
      />

      <FeedFilters sortBy={sortBy} onSortChange={setSortBy} totalCount={filteredVentsCount} />

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

      <TagSearch
        tags={tags}
        selectedTags={selectedTags}
        onTagSelect={handleTagSelect}
        onClose={() => setIsSearchOpen(false)}
        isOpen={isSearchOpen}
      />

      <AdvancedSearch
        onSearch={handleAdvancedSearch}
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
      />

      <FloatingPostButton
        onClick={handlePostClick}
        disabled={isAuthenticated && !canPost}
        stacked={isAuthenticated}
      />

      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}
