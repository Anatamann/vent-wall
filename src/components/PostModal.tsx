import React, { useState, useEffect } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { useMoodTags } from '../hooks/useMoodTags'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import type { MoodTag } from '../lib/supabase'

interface PostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
}

export default function PostModal({ isOpen, onClose, onPostCreated }: PostModalProps) {
  const { user } = useAuth()
  const { tags } = useMoodTags()
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<MoodTag[]>([])

  // Filter tags based on search query
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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setContent('')
      setSelectedTags([])
      setError('')
      setSearchQuery('')
    }
  }, [isOpen])

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId)
      } else if (prev.length < 3) {
        return [...prev, tagId]
      }
      return prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setIsSubmitting(true)

    try {
      // Validate content
      if (content.trim().length < 1) {
        throw new Error('Please write something to share')
      }
      if (content.length > 500) {
        throw new Error('Vent must be 500 characters or less')
      }

      // Validate tags
      if (selectedTags.length === 0) {
        throw new Error('Please select at least one mood tag')
      }

      // Check rate limiting
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('post_count_today, last_post_date')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      const today = new Date().toISOString().split('T')[0]
      const lastPostDate = userData.last_post_date

      if (lastPostDate === today && userData.post_count_today >= 3) {
        throw new Error('You can only post 3 vents per day. Try again tomorrow!')
      }

      // Create the vent
      const { data: ventData, error: ventError } = await supabase
        .from('vents')
        .insert({
          user_id: user.id,
          content: content.trim()
        })
        .select()
        .single()

      if (ventError) throw ventError

      // Add mood tags
      const ventTagInserts = selectedTags.map(tagId => ({
        vent_id: ventData.id,
        tag_id: tagId
      }))

      const { error: tagsError } = await supabase
        .from('vent_tags')
        .insert(ventTagInserts)

      if (tagsError) throw tagsError

      // Update user post count
      const newPostCount = lastPostDate === today ? userData.post_count_today + 1 : 1
      const { error: updateError } = await supabase
        .from('users')
        .update({
          post_count_today: newPostCount,
          last_post_date: today
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Success!
      onPostCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create vent')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const characterCount = content.length
  const isOverLimit = characterCount > 500
  const selectedTagObjects = tags.filter(tag => selectedTags.includes(tag.id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Share Your Vent
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Content Input */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What's on your mind?
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, feelings, or experiences..."
              rows={4}
              className={`w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 transition-colors ${
                isOverLimit
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Express yourself authentically and respectfully
              </p>
              <span className={`text-sm ${
                isOverLimit 
                  ? 'text-red-500 dark:text-red-400' 
                  : characterCount > 450 
                    ? 'text-yellow-500 dark:text-yellow-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                {characterCount}/500
              </span>
            </div>
          </div>

          {/* Mood Tags Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How are you feeling? (Select 1-3 tags)
            </label>
            
            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTagObjects.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
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
                      <Minus className="w-3 h-3 ml-1.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tag Search */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search mood tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Available Tags */}
            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 scrollbar-hide">
              <div className="flex flex-wrap gap-2">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id)
                  const canSelect = !isSelected && selectedTags.length < 3
                  
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => canSelect && handleTagToggle(tag.id)}
                      disabled={!canSelect && !isSelected}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? 'opacity-50 cursor-not-allowed'
                          : canSelect
                            ? 'hover:scale-105 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                            : 'opacity-30 cursor-not-allowed'
                      }`}
                      style={{
                        backgroundColor: `${tag.color}15`,
                        color: tag.color
                      }}
                    >
                      <span className="mr-1.5">{tag.emoji}</span>
                      {tag.name}
                      {canSelect && <Plus className="w-3 h-3 ml-1.5" />}
                    </button>
                  )
                })}
              </div>
              {filteredTags.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No tags found matching "{searchQuery}"
                </p>
              )}
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {selectedTags.length}/3 tags selected
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverLimit || content.trim().length === 0 || selectedTags.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Posting...</span>
                </>
              ) : (
                <span>Share Vent</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}