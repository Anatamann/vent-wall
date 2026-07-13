import React, { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import type { MoodTag } from '../lib/types'
import MoodTagChip from './MoodTagChip'

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
  isOpen,
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
      const filtered = tags.filter((tag) =>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
        aria-label="Close search"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md max-h-96 flex flex-col overflow-hidden rounded-2xl
          border border-white/15 bg-slate-900/80 backdrop-blur-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-base sm:text-lg font-semibold text-slate-50">Search Mood Tags</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for mood tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-full
                border border-white/10 bg-slate-800/80 text-slate-100 placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredTags.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs sm:text-sm text-slate-400">
                No tags found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id)
                return (
                  <MoodTagChip
                    key={tag.id}
                    tag={tag}
                    selected={isSelected}
                    onClick={() => {
                      onTagSelect(tag.id)
                      onClose()
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
