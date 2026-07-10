import React from 'react'
import { Search } from 'lucide-react'
import type { MoodTag } from '../lib/types'

interface MoodTagFilterProps {
  tags: MoodTag[]
  selectedTags: string[]
  onTagSelect: (tagId: string) => void
  onSearchOpen: () => void
  loading?: boolean
}

export default function MoodTagFilter({ 
  tags, 
  selectedTags, 
  onTagSelect, 
  onSearchOpen,
  loading = false 
}: MoodTagFilterProps) {
  // Show first 8 tags, rest available through search
  const visibleTags = tags.slice(0, 8)

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 min-w-0">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
          Filter by Mood
        </h2>
        <button
          onClick={onSearchOpen}
          className="flex items-center space-x-2 px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
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
        <div className="flex flex-wrap gap-2">
          {/* All Tags Button */}
          <button
            onClick={() => {
              // Clear all selected tags when "All Moods" is clicked
              selectedTags.forEach(tagId => onTagSelect(tagId))
            }}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
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
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
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
          {tags.length > 8 && (
            <button
              onClick={onSearchOpen}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              +{tags.length - 8} more
            </button>
          )}
        </div>
      )}

      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Filtering by {selectedTags.length} mood{selectedTags.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}