import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import type { CommentPayload, WorldCupSupport, WorldCupSupportComment } from '../../lib/types'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import UserAvatar from '../UserAvatar'
import UserNameWithStatus from '../UserNameWithStatus'
import TeamChip from './TeamChip'
import SupportCommentSection from './SupportCommentSection'

interface SupportCardProps {
  support: WorldCupSupport
  onUpdated?: () => void
  /** Hide inline comment expander (e.g. full post page has its own thread). */
  hideComments?: boolean
  /** When false, card body is not a link (detail page). Default true on wall. */
  clickable?: boolean
}

export default function SupportCard({
  support,
  onUpdated,
  hideComments = false,
  clickable = true,
}: SupportCardProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<WorldCupSupportComment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const postPath = `/worldcup/post/${support.id}`

  const borderColor =
    support.team_id === 'spain'
      ? 'border-l-[var(--wc-spain)]'
      : support.team_id === 'argentina'
        ? 'border-l-[var(--wc-argentina)]'
        : 'border-l-sky-400'

  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const data = await api.worldcup.listComments(support.id)
      setComments(data.comments)
      setCommentsLoaded(true)
    } catch {
      /* ignore */
    } finally {
      setLoadingComments(false)
    }
  }

  const handleToggleComments = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !expanded
    setExpanded(next)
    if (next && !commentsLoaded) {
      await loadComments()
    }
  }

  const handleAddComment = async (payload: CommentPayload) => {
    if (!isAuthenticated) {
      window.location.href = `/auth?next=${encodeURIComponent(postPath)}`
      return
    }
    try {
      const { comment } = await api.worldcup.addComment(support.id, payload)
      setComments((prev) => [...prev, comment])
      onUpdated?.()
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : 'Failed to add comment')
    }
  }

  const handleCardActivate = () => {
    if (!clickable) return
    navigate(postPath)
  }

  const username = support.user?.username || 'Anonymous'
  const when = support.wall_published_at || support.created_at

  return (
    <article
      className={`glass-card border-l-4 ${borderColor} ${
        clickable
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40'
          : ''
      }`}
      role={clickable ? 'link' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleCardActivate : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCardActivate()
              }
            }
          : undefined
      }
      aria-label={clickable ? `Open support post by ${username}` : undefined}
    >
      <div className="flex items-start gap-3 min-w-0">
        <UserAvatar username={username} avatarUrl={support.user?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <UserNameWithStatus
              username={username}
              status={support.user?.status}
              usernameClassName="text-sm font-medium text-slate-100"
            />
            <TeamChip team={support.team} selected static />
            <span className="text-[10px] sm:text-xs text-slate-500">
              {formatDistanceToNow(new Date(when), { addSuffix: true })}
            </span>
          </div>

          {support.content ? (
            <p className="mt-2 text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
              {support.content}
            </p>
          ) : null}

          {support.asset && (
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
              <img
                src={support.asset.preview_url || support.asset.url}
                alt=""
                className="w-full max-h-64 object-cover"
              />
            </div>
          )}

          {!hideComments && (
            <div
              className="mt-3 flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => void handleToggleComments(e)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-300"
              >
                <MessageCircle className="w-4 h-4" />
                {support.comment_count}
                <span className="hidden sm:inline">comments</span>
              </button>
              <span className="text-xs text-sky-400/80">Open post →</span>
            </div>
          )}

          {!hideComments && expanded && (
            <div
              className="mt-4 border-t border-white/10 pt-3"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {loadingComments ? (
                <p className="text-xs text-slate-500">Loading comments…</p>
              ) : (
                <SupportCommentSection
                  comments={comments}
                  currentUserId={user?.id}
                  supportUserId={support.user?.id}
                  isAuthenticated={isAuthenticated}
                  loginNext={postPath}
                  onAddComment={handleAddComment}
                  compact
                />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
