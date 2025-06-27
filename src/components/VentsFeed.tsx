import React from 'react'
import VentCard from './VentCard'
import LoadingSpinner from './LoadingSpinner'
import { MessageSquare } from 'lucide-react'
import type { Vent } from '../lib/supabase'

interface VentsFeedProps {
  vents: Vent[]
  loading: boolean
  loadingMore?: boolean
  error: string | null
  onReaction?: (ventId: string, emoji: string) => void
  onLoadMore?: () => void
  hasMore: boolean
  selectedTags?: string[]
}

export default function VentsFeed({
  vents,
  loading,
  loadingMore = false,
  error,
  onReaction,
  onLoadMore,
  hasMore,
  selectedTags = []
}: VentsFeedProps) {
  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <MessageSquare className="w-12 h-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Something went wrong</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (loading && vents.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            </div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-16" />
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (vents.length === 0) {
    return (
      <div className="card text-center py-12">
        <MessageSquare className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {loading ? 'Loading vents...' : 'No vents found'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {loading
            ? 'Please wait while we fetch the latest vents...'
            : selectedTags?.length > 0
              ? 'No vents found with the selected mood tags. Try adjusting your filters.'
              : 'Be the first to share your thoughts and emotions with the community.'
          }
        </p>
        {!loading && (
          <button className="btn-primary">
            Share Your First Vent
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vents.map((vent) => (
          <VentCard key={vent.id} vent={vent} onReaction={onReaction} />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="btn-secondary"
          >
            {loadingMore ? <LoadingSpinner /> : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}