import { useState, useEffect } from 'react'
import { X, Plus, Minus, Image } from 'lucide-react'
import { useMoodTags } from '../hooks/useMoodTags'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import LoadingSpinner from './LoadingSpinner'
import GifPicker from './GifPicker'
import MediaAttribution from './MediaAttribution'
import type { KlipyGifItem, MoodTag } from '../lib/types'

interface PostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
}

export default function PostModal({ isOpen, onClose, onPostCreated }: PostModalProps) {
  const { user } = useAuth()
  const { tags } = useMoodTags()
  const [content, setContent] = useState('')
  const [selectedGif, setSelectedGif] = useState<KlipyGifItem | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<MoodTag[]>([])
  const [contributeToGlobe, setContributeToGlobe] = useState(true)

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

  useEffect(() => {
    if (!isOpen) {
      setContent('')
      setSelectedGif(null)
      setShowGifPicker(false)
      setSelectedTags([])
      setError('')
      setSearchQuery('')
      setContributeToGlobe(true)
    }
  }, [isOpen])

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId)
      }
      if (prev.length < 3) {
        return [...prev, tagId]
      }
      return prev
    })
  }

  const handleGifSelect = (gif: KlipyGifItem) => {
    setSelectedGif(gif)
    setShowGifPicker(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const trimmedContent = content.trim()
    const hasText = trimmedContent.length > 0
    const hasGif = Boolean(selectedGif)

    setError('')
    setIsSubmitting(true)

    try {
      if (!hasText && !hasGif) {
        throw new Error('Add text, a GIF, or both')
      }
      if (content.length > 500) {
        throw new Error('Vent must be 500 characters or less')
      }
      if (selectedTags.length === 0) {
        throw new Error('Please select at least one mood tag')
      }

      await api.vents.create({
        content: trimmedContent,
        tag_ids: selectedTags,
        contribute_to_globe: contributeToGlobe,
        ...(selectedGif ? { gif_id: selectedGif.id } : {}),
      })
      onPostCreated()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create vent'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const characterCount = content.length
  const isOverLimit = characterCount > 500
  const hasContent = content.trim().length > 0 || Boolean(selectedGif)
  const selectedTagObjects = tags.filter((tag) => selectedTags.includes(tag.id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
            Share Your Vent
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="content"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                What's on your mind?
              </label>
              <button
                type="button"
                onClick={() => setShowGifPicker(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
              >
                <Image className="w-4 h-4" />
                Add GIF
              </button>
            </div>

            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, feelings, or experiences…"
              rows={4}
              className={`text-xs sm:text-sm w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 transition-colors ${
                isOverLimit
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
            />

            {selectedGif && (
              <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <img
                    src={selectedGif.previewUrl}
                    alt={selectedGif.title || 'Selected GIF'}
                    className="max-h-28 rounded object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedGif(null)}
                    className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Remove GIF"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2">
                  <MediaAttribution />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-2">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Text optional when a GIF is attached
              </p>
              <span
                className={`text-xs sm:text-sm${
                  isOverLimit
                    ? 'text-red-500 dark:text-red-400'
                    : characterCount > 450
                      ? 'text-yellow-500 dark:text-yellow-400'
                      : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {characterCount}/500
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How are you feeling? (Select 1-3 tags)
            </label>

            {selectedTags.length > 0 && (
              <div className="mb-3">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Selected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTagObjects.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border-2 transition-all duration-200"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: `${tag.color}60`,
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

            <div className="mb-3">
              <input
                type="text"
                placeholder="Search mood tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs sm:text-sm w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3">
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
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? 'opacity-50 cursor-not-allowed'
                          : canSelect
                            ? 'hover:scale-105 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                            : 'opacity-30 cursor-not-allowed'
                      }`}
                      style={{
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
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

            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">
              {selectedTags.length}/3 tags selected
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={contributeToGlobe}
                onChange={(e) => setContributeToGlobe(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="min-w-0">
                <span className="block text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">
                  Add to 3D-Globe view
                </span>
                <span className="block mt-0.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Allow this vent to appear on the Global Mood Globe. Approximate location from your
                  connection may be used — never your exact position.
                </span>
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-xs sm:text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverLimit || !hasContent || selectedTags.length === 0}
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

      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onGifSelect={handleGifSelect}
      />
    </div>
  )
}