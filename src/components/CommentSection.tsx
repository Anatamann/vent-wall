import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Plus } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import type { VentComment } from '../lib/types'
import { MAX_COMMENTS_PER_USER_PER_VENT } from '../lib/constants'

interface CommentSectionProps {
  comments: VentComment[]
  commentsOpen: boolean
  currentUserId?: string
  onAddComment: (emoji: string) => Promise<void>
  disabled?: boolean
}

export default function CommentSection({
  comments,
  commentsOpen,
  currentUserId,
  onAddComment,
  disabled = false,
}: CommentSectionProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userCommentCount = currentUserId
    ? comments.filter((c) => c.user_id === currentUserId).length
    : 0
  const atCommentLimit = userCommentCount >= MAX_COMMENTS_PER_USER_PER_VENT

  const handleOpenPicker = (e: React.MouseEvent) => {
    if (disabled || !commentsOpen || atCommentLimit) return

    setError(null)
    const rect = e.currentTarget.getBoundingClientRect()
    setPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
    setShowPicker(true)
  }

  const handleEmojiSelect = async (emoji: string) => {
    if (disabled || !commentsOpen || atCommentLimit) return

    try {
      setIsSubmitting(true)
      setError(null)
      await onAddComment(emoji)
      setShowPicker(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add comment'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Comments
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({comments.length})
          </span>
        </div>

        {commentsOpen && currentUserId && !disabled && (
          <button
            onClick={handleOpenPicker}
            disabled={isSubmitting || atCommentLimit}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              atCommentLimit
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add emoji
          </button>
        )}
      </div>

      {!commentsOpen && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
          Comments closed — they were only available while this post was on the Wall.
        </div>
      )}

      {commentsOpen && !currentUserId && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Sign in to leave an emoji comment.
        </p>
      )}

      {commentsOpen && currentUserId && atCommentLimit && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
          Comment limit reached ({MAX_COMMENTS_PER_USER_PER_VENT}/{MAX_COMMENTS_PER_USER_PER_VENT} per post).
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          {commentsOpen
            ? 'No comments yet. Be the first to respond with an emoji.'
            : 'No comments were left on this post.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5"
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {comment.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {comment.user?.username || 'Anonymous'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmojiPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onEmojiSelect={handleEmojiSelect}
        position={pickerPosition}
      />
    </section>
  )
}