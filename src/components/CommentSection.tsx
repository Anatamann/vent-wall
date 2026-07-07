import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Image, MessageCircle, Smile } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import UserNameWithStatus from './UserNameWithStatus'
import type { CommentPayload, KlipyGifItem, VentComment } from '../lib/types'
import { MAX_COMMENTS_PER_USER_PER_VENT } from '../lib/constants'

interface CommentSectionProps {
  comments: VentComment[]
  commentsOpen: boolean
  currentUserId?: string
  onAddComment: (payload: CommentPayload) => Promise<void>
  disabled?: boolean
}

type PickerTab = 'emoji' | 'gif'

export default function CommentSection({
  comments,
  commentsOpen,
  currentUserId,
  onAddComment,
  disabled = false,
}: CommentSectionProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('emoji')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userCommentCount = currentUserId
    ? comments.filter((c) => c.user_id === currentUserId).length
    : 0
  const atCommentLimit = userCommentCount >= MAX_COMMENTS_PER_USER_PER_VENT

  const handleOpenPicker = (e: React.MouseEvent, tab: PickerTab) => {
    if (disabled || !commentsOpen || atCommentLimit) return

    setActiveTab(tab)
    setError(null)

    if (tab === 'gif') {
      setShowGifPicker(true)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    setPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
    setShowEmojiPicker(true)
  }

  const submitComment = async (payload: CommentPayload) => {
    if (disabled || !commentsOpen || atCommentLimit) return

    try {
      setIsSubmitting(true)
      setError(null)
      await onAddComment(payload)
      setShowEmojiPicker(false)
      setShowGifPicker(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add comment'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmojiSelect = async (emoji: string) => {
    await submitComment({ type: 'emoji', emoji })
  }

  const handleGifSelect = async (gif: KlipyGifItem) => {
    await submitComment({ type: 'gif', gif_id: gif.id })
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
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleOpenPicker(e, 'emoji')}
              disabled={isSubmitting || atCommentLimit}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                atCommentLimit
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50'
              }`}
            >
              <Smile className="w-4 h-4" />
              Emoji
            </button>
            <button
              onClick={(e) => handleOpenPicker(e, 'gif')}
              disabled={isSubmitting || atCommentLimit}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                atCommentLimit
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50'
              }`}
            >
              <Image className="w-4 h-4" />
              GIF
            </button>
          </div>
        )}
      </div>

      {!commentsOpen && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
          Comments closed — they were only available while this post was on the Wall.
        </div>
      )}

      {commentsOpen && !currentUserId && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Sign in to respond with an emoji or GIF.
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
            ? 'No comments yet. Be the first to respond with an emoji or GIF.'
            : 'No comments were left on this post.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <UserNameWithStatus
                  username={comment.user?.username || 'Anonymous'}
                  status={comment.user?.status}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>

              <div className="flex items-center justify-center min-h-[3rem]">
                {comment.comment_type === 'gif' && comment.asset?.url ? (
                  <img
                    src={comment.asset.url}
                    alt="GIF comment"
                    className="max-h-20 max-w-full rounded object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {comment.emoji}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <EmojiPicker
        isOpen={showEmojiPicker && activeTab === 'emoji'}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
        position={pickerPosition}
      />

      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onGifSelect={handleGifSelect}
      />

      {isSubmitting && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Posting comment...</p>
      )}
    </section>
  )
}