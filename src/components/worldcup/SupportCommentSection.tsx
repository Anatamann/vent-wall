import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Image, LogIn, Smile } from 'lucide-react'
import EmojiPicker from '../EmojiPicker'
import GifPicker from '../GifPicker'
import UserNameWithStatus from '../UserNameWithStatus'
import type { CommentPayload, KlipyGifItem, WorldCupSupportComment } from '../../lib/types'
import {
  MAX_WC_COMMENTS_PER_POST_NON_OP,
  MAX_WC_COMMENTS_PER_POST_OP,
} from '../../lib/constants'

interface SupportCommentSectionProps {
  comments: WorldCupSupportComment[]
  currentUserId?: string
  supportUserId?: string | null
  /** Required to post emoji/GIF reactions */
  isAuthenticated?: boolean
  /** Path for auth redirect after login */
  loginNext?: string
  onAddComment: (payload: CommentPayload) => Promise<void>
  disabled?: boolean
  compact?: boolean
}

export default function SupportCommentSection({
  comments,
  currentUserId,
  supportUserId,
  isAuthenticated = Boolean(currentUserId),
  loginNext = '/worldcup',
  onAddComment,
  disabled = false,
  compact = false,
}: SupportCommentSectionProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = Boolean(currentUserId && supportUserId && currentUserId === supportUserId)
  const commentLimit = isOwner ? MAX_WC_COMMENTS_PER_POST_OP : MAX_WC_COMMENTS_PER_POST_NON_OP
  const userCommentCount = currentUserId
    ? comments.filter((c) => c.user_id === currentUserId).length
    : 0
  const atLimit = userCommentCount >= commentLimit
  const canReact = isAuthenticated && !disabled && !atLimit && !isSubmitting
  const authHref = `/auth?next=${encodeURIComponent(loginNext)}`

  const submit = async (payload: CommentPayload) => {
    if (!isAuthenticated) {
      window.location.href = authHref
      return
    }
    if (disabled || atLimit) return
    try {
      setIsSubmitting(true)
      setError(null)
      await onAddComment(payload)
      setShowEmojiPicker(false)
      setShowGifPicker(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEmoji = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      window.location.href = authHref
      return
    }
    if (!canReact) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPickerPosition({ x: rect.left + rect.width / 2, y: rect.top })
    setShowEmojiPicker(true)
  }

  const openGif = () => {
    if (!isAuthenticated) {
      window.location.href = authHref
      return
    }
    if (!canReact) return
    setShowGifPicker(true)
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          {comments.length} reaction{comments.length === 1 ? '' : 's'}
          {isAuthenticated && currentUserId ? (
            <span className="text-slate-500">
              {' '}
              · {Math.max(0, commentLimit - userCommentCount)} left for you
            </span>
          ) : null}
        </p>

        {isAuthenticated ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canReact}
              onClick={openEmoji}
              className="btn-glass !px-2.5 !py-1.5 gap-1 disabled:opacity-50"
              title="Emoji reaction (login required)"
            >
              <Smile className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">Emoji</span>
            </button>
            <button
              type="button"
              disabled={!canReact}
              onClick={openGif}
              className="btn-glass !px-2.5 !py-1.5 gap-1 disabled:opacity-50"
              title="GIF reaction (login required)"
            >
              <Image className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">GIF</span>
            </button>
          </div>
        ) : (
          <Link
            to={authHref}
            className="btn-glass !px-2.5 !py-1.5 gap-1.5 text-[10px] sm:text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <LogIn className="w-3.5 h-3.5" />
            Log in to react
          </Link>
        )}
      </div>

      {!isAuthenticated && (
        <p className="text-[11px] text-slate-500">
          Anyone can browse reactions. Sign in to post an emoji or GIF.
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {comments.length === 0 ? (
        <p className="text-xs text-slate-500">
          No reactions yet
          {isAuthenticated ? ' — add an emoji or GIF.' : '.'}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <UserNameWithStatus
                    username={c.user?.username || 'User'}
                    status={c.user?.status}
                    usernameClassName="text-xs font-medium text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                {c.comment_type === 'emoji' && c.emoji ? (
                  <p className="mt-0.5 text-xl leading-none">{c.emoji}</p>
                ) : null}
                {c.comment_type === 'gif' && c.asset ? (
                  <img
                    src={c.asset.preview_url || c.asset.url}
                    alt=""
                    className="mt-1 max-h-28 rounded-md border border-white/10"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated && (
        <>
          <EmojiPicker
            isOpen={showEmojiPicker}
            position={pickerPosition}
            onEmojiSelect={(emoji) => void submit({ type: 'emoji', emoji })}
            onClose={() => setShowEmojiPicker(false)}
          />
          <GifPicker
            isOpen={showGifPicker}
            onGifSelect={(gif: KlipyGifItem) => void submit({ type: 'gif', gif_id: gif.id })}
            onClose={() => setShowGifPicker(false)}
          />
        </>
      )}
    </div>
  )
}
