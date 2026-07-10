import { Link, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Clock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useVentDetail } from '../hooks/useVentDetail'
import ReactionButton from '../components/ReactionButton'
import CommentSection from '../components/CommentSection'
import LoadingSpinner from '../components/LoadingSpinner'
import UserAvatar from '../components/UserAvatar'
import UserNameWithStatus from '../components/UserNameWithStatus'
import VentContentDisplay from '../components/VentContentDisplay'

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user, isAuthenticated } = useAuth()
  const { vent, loading, error, addReaction, addComment } = useVentDetail(slug, user?.id)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !vent) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wall
        </Link>
        <div className="card text-center py-12">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Post not found
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {error || 'This post may have been removed or is no longer available.'}
          </p>
        </div>
      </div>
    )
  }

  const timeAgo = formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })
  const expiresIn = formatDistanceToNow(new Date(vent.expires_at), { addSuffix: true })
  const commentsOpen = vent.comments_open ?? vent.is_on_wall ?? false

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wall
      </Link>

      <article className="card">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <UserAvatar
              username={vent.user?.username || 'Anonymous'}
              avatarUrl={vent.user?.avatar_url}
              size="md"
            />
            <UserNameWithStatus
              username={vent.user?.username || 'Anonymous'}
              status={vent.user?.status}
              usernameClassName="font-medium text-gray-900 dark:text-gray-100 truncate"
            />
          </div>

          <div className="flex flex-col items-end gap-1 w-full min-w-0 sm:w-auto sm:shrink-0">
            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">{timeAgo}</p>
            {vent.is_on_wall ? (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 max-w-full min-w-0">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate min-w-0">Leaves Wall {expiresIn}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                Archived
              </span>
            )}
          </div>
        </header>

        <div className="mb-5">
          <VentContentDisplay content={vent.content} asset={vent.asset} />
        </div>

        {vent.mood_tags && vent.mood_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {vent.mood_tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                  border: `1px solid ${tag.color}40`,
                }}
              >
                <span className="mr-1">{tag.emoji}</span>
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <h2 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Reactions
          </h2>
          <ReactionButton
            reactions={vent.reactions || []}
            onReaction={addReaction}
            currentUserId={user?.id}
            disabled={!isAuthenticated}
          />
          {!isAuthenticated && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">
              Sign in to react to this post.
            </p>
          )}
        </div>
      </article>

      <CommentSection
        comments={vent.comments || []}
        commentsOpen={commentsOpen}
        currentUserId={user?.id}
        ventUserId={vent.user_id}
        onAddComment={addComment}
        disabled={!isAuthenticated}
      />
    </div>
  )
}