import { useState, useEffect } from 'react'
import { Search, Filter, User, Hash, X } from 'lucide-react'
import { useMoodTags } from '../hooks/useMoodTags'
import type { MoodTag } from '../lib/types'
import MoodTagChip from './MoodTagChip'

export interface AdvancedSearchFilters {
  query: string
  username: string
  tags: string[]
  sortBy: 'relevance' | 'newest' | 'oldest' | 'most_reactions'
  minReactions: number
}

interface AdvancedSearchProps {
  onSearch: (filters: AdvancedSearchFilters) => void
  isOpen: boolean
  onClose: () => void
}

export default function AdvancedSearch({ onSearch, isOpen, onClose }: AdvancedSearchProps) {
  const { tags } = useMoodTags()
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    query: '',
    username: '',
    tags: [],
    sortBy: 'newest',
    minReactions: 0,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<MoodTag[]>([])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags(tags.slice(0, 20))
    } else {
      const filtered = tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTags(filtered.slice(0, 20))
    }
  }, [searchQuery, tags])

  const handleTagToggle = (tagId: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId],
    }))
  }

  const handleSearch = () => {
    onSearch(filters)
    onClose()
  }

  const handleReset = () => {
    setFilters({
      query: '',
      username: '',
      tags: [],
      sortBy: 'newest',
      minReactions: 0,
    })
    setSearchQuery('')
  }

  const selectedTagObjects = tags.filter((tag) => filters.tags.includes(tag.id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
        aria-label="Close advanced search"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/85 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-50 flex items-center">
            <Search className="w-5 h-5 mr-2 text-sky-400" />
            Advanced Search
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
              Search Text
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                placeholder="Search in vent content..."
                className="text-xs sm:text-sm w-full pl-10 pr-4 py-2 rounded-full border border-white/10
                  bg-slate-800/80 text-slate-100 placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={filters.username}
                onChange={(e) => setFilters((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Search by username..."
                className="text-xs sm:text-sm w-full pl-10 pr-4 py-2 rounded-full border border-white/10
                  bg-slate-800/80 text-slate-100 placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/40"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-300">
                Mood Tags
              </label>
              {filters.tags.length > 0 && (
                <span className="text-[10px] sm:text-xs text-slate-500">
                  {filters.tags.length} selected · click again to remove
                </span>
              )}
            </div>

            {filters.tags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selectedTagObjects.map((tag) => (
                  <MoodTagChip
                    key={`sel-${tag.id}`}
                    tag={tag}
                    selected
                    size="md"
                    onClick={() => handleTagToggle(tag.id)}
                  />
                ))}
              </div>
            )}

            <div className="space-y-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mood tags..."
                className="text-xs sm:text-sm w-full px-3 py-2 rounded-full border border-white/10
                  bg-slate-800/80 text-slate-100 placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />

              <div className="max-h-40 overflow-y-auto overflow-x-hidden border border-white/10 rounded-xl p-3 bg-slate-800/40">
                <div className="flex flex-wrap gap-1.5">
                  {filteredTags.map((tag) => {
                    const isSelected = filters.tags.includes(tag.id)
                    return (
                      <MoodTagChip
                        key={tag.id}
                        tag={tag}
                        selected={isSelected}
                        size="md"
                        onClick={() => handleTagToggle(tag.id)}
                      />
                    )
                  })}
                  {filteredTags.length === 0 && (
                    <p className="text-xs text-slate-500 py-2 w-full text-center">
                      No tags match your search
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as AdvancedSearchFilters['sortBy'],
                  }))
                }
                className="text-xs sm:text-sm w-full px-3 py-2 rounded-full border border-white/10
                  bg-slate-800/80 text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              >
                <option value="newest" className="bg-slate-900">
                  Newest First
                </option>
                <option value="oldest" className="bg-slate-900">
                  Oldest First
                </option>
                <option value="most_reactions" className="bg-slate-900">
                  Most Reactions
                </option>
                <option value="relevance" className="bg-slate-900">
                  Relevance
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Min Reactions
              </label>
              <input
                type="number"
                min="0"
                value={filters.minReactions}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minReactions: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="text-xs sm:text-sm w-full px-3 py-2 rounded-full border border-white/10
                  bg-slate-800/80 text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-white/10">
            <button type="button" onClick={handleReset} className="btn-glass">
              Reset Filters
            </button>

            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="btn-glass">
                Cancel
              </button>
              <button type="button" onClick={handleSearch} className="btn-primary rounded-full">
                Search Vents
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
