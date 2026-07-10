import React, { useEffect, useRef, useCallback } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface InfiniteScrollProps {
  children: React.ReactNode
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  threshold?: number
  className?: string
}

export default function InfiniteScroll({
  children,
  hasMore,
  loading,
  onLoadMore,
  threshold = 100,
  className = ''
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    
    if (entry.isIntersecting && hasMore && !loading && !loadingRef.current) {
      loadingRef.current = true
      onLoadMore()
      
      // Reset loading flag after a short delay
      setTimeout(() => {
        loadingRef.current = false
      }, 1000)
    }
  }, [hasMore, loading, onLoadMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: `${threshold}px`,
      threshold: 0.1
    })

    observer.observe(sentinel)

    return () => {
      observer.unobserve(sentinel)
    }
  }, [handleIntersection, threshold])

  return (
    <div className={className}>
      {children}
      
      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} className="h-4" />
      
      {/* Loading indicator */}
      {loading && hasMore && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
      
      {/* End of content indicator */}
      {!hasMore && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            You've reached the end! 🎉
          </p>
        </div>
      )}
    </div>
  )
}