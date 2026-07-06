import React, { useState, useEffect } from 'react'
import { Search, Filter, Calendar, User, Hash, X } from 'lucide-react'
import { useMoodTags } from '../hooks/useMoodTags'
import type { MoodTag } from '../lib/types'

interface SearchFilters {
  query: string
  tags: string[]
  dateRange: 'all' | 'today' | 'week' | 'month'
  sortBy: 'relevance' | 'newest' | 'oldest' | 'most_reactions'
  minReactions: number
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  isOpen: boolean
  onClose: () => void
}

export default function AdvancedSearch({ onSearch, isOpen, onClose }: AdvancedSearchProps) {
  const { tags } = useMoodTags()
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tags: [],
    dateRange: 'all',
    sortBy: 'relevance',
    minReactions: 0
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<MoodTag[]>([])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags(tags.slice(0, 20))
    } else {
      const filtered = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTags(filtered.slice(0, 20))
    }
  }, [searchQuery, tags])

  const handleTagToggle = (tagId: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
    }))
  }

  const handleSearch = () => {
    onSearch(filters)
    onClose()
  }

  const handleReset = () => {
    setFilters({
      query: '',
      tags: [],
      dateRange: 'all',
      sortBy: 'relevance',
      minReactions: 0
    })
    setSearchQuery('')
  }

  const selectedTagObjects = tags.filter(tag => filters.tags.includes(tag.id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Advanced Search
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Text Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Text
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Search in vent content..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Selected Tags */}
          {filters.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected Mood Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedTagObjects.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-200"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      borderColor: `${tag.color}60`
                    }}
                  >
                    <span className="mr-1.5">{tag.emoji}</span>
                    {tag.name}
                    <X className="w-3 h-3 ml-1.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Mood Tags
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mood tags..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              
              <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag) => {
                    const isSelected = filters.tags.includes(tag.id)
                    
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        disabled={isSelected}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: `${tag.color}15`,
                          color: tag.color
                        }}
                      >
                        <span className="mr-1">{tag.emoji}</span>
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most_reactions">Most Reactions</option>
              </select>
            </div>

            {/* Min Reactions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Min Reactions
              </label>
              <input
                type="number"
                min="0"
                value={filters.minReactions}
                onChange={(e) => setFilters(prev => ({ ...prev, minReactions: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleReset}
              className="btn-secondary"
            >
              Reset Filters
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                className="btn-primary"
              >
                Search Vents
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}