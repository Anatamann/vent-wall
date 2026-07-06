import React, { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import type { MoodTag } from '../lib/types'

interface TagSearchProps {
  tags: MoodTag[]
  selectedTags: string[]
  onTagSelect: (tagId: string) => void
  onClose: () => void
  isOpen: boolean
}

export default function TagSearch({ 
  tags, 
  selectedTags, 
  onTagSelect, 
  onClose, 
  isOpen 
}: TagSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<MoodTag[]>(tags)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags(tags)
    } else {
      const filtered = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTags(filtered)
    }
  }, [searchQuery, tags])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Search Mood Tags
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for mood tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Tags List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTags.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No tags found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      onTagSelect(tag.id)
                      onClose()
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {tag.name}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Press Escape to close
          </p>
        </div>
      </div>
    </div>
  )
}