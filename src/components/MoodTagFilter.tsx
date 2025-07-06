import React, { useState, useRef, useLayoutEffect } from 'react'
import { Search } from 'lucide-react'
import type { MoodTag } from '../lib/supabase'

interface MoodTagFilterProps {
  tags: MoodTag[]
  selectedTags: string[]
  onTagSelect: (tagId: string) => void
  onSearchOpen: () => void
  loading?: boolean;
  
}

export default function MoodTagFilter({
  tags,
  selectedTags,
  onTagSelect,
  onSearchOpen,
  loading = false,
}: MoodTagFilterProps) {
  const [visibleTagCount, setVisibleTagCount] = useState(tags.length)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (loading || !containerRef.current) return

    const calculateVisibleTags = () => {
      const containerWidth = containerRef.current?.offsetWidth ?? 0
      const gap = 8 // Corresponds to gap-2 in Tailwind
      let totalWidth = 0
      let count = 0

      const allTagsButton = containerRef.current?.children[0] as HTMLElement
      if (allTagsButton) {
        totalWidth += allTagsButton.offsetWidth + gap
      }

      for (let i = 0; i < tags.length; i++) {
        const tagElement = document.createElement('span')
        tagElement.innerText = tags[i].name
        tagElement.className = 'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium'
        document.body.appendChild(tagElement)
        const tagWidth = tagElement.offsetWidth + gap
        document.body.removeChild(tagElement)

        if (totalWidth + tagWidth < containerWidth) {
          totalWidth += tagWidth
          count++
        } else {
          break
        }
      }
      setVisibleTagCount(count)
    }

    calculateVisibleTags()

    const resizeObserver = new ResizeObserver(calculateVisibleTags)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [tags, loading])

  const visibleTags = tags.slice(0, visibleTagCount)
  const hiddenTagCount = tags.length - visibleTagCount

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Filter by Mood
        </h2>
        <button
          onClick={onSearchOpen}
          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search tags</span>
        </button>
      </div>

      {loading ? (
        <div className="flex space-x-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
              style={{ width: `${60 + Math.random() * 40}px` }}
            />
          ))}
        </div>
      ) : (
        <div ref={containerRef} className="flex flex-wrap gap-2">
          {/* All Tags Button */}
          <button
            onClick={() => {
              // Clear all selected tags when "All Moods" is clicked
              selectedTags.forEach(tagId => onTagSelect(tagId))
            }}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedTags.length === 0
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-300 dark:border-primary-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            All Moods
          </button>

          {/* Individual Tag Buttons */}
          {visibleTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => onTagSelect(tag.id)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border-2 shadow-sm transform scale-105'
                    : 'border-2 border-transparent hover:scale-105'
                }`}
                style={{
                  backgroundColor: isSelected ? `${tag.color}20` : `${tag.color}10`,
                  color: tag.color,
                  borderColor: isSelected ? `${tag.color}60` : 'transparent'
                }}
              >
                <span className="mr-1.5">{tag.emoji}</span>
                {tag.name}
              </button>
            )
          })}

          {/* More Tags Indicator */}
          {hiddenTagCount > 0 && (
            <button
              onClick={onSearchOpen}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm md:text-base font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              +{hiddenTagCount} more
            </button>
          )}
        </div>
      )}

      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            Filtering by {selectedTags.length} mood{selectedTags.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}