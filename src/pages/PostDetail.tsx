import { Link, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Clock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useVentDetail } from '../hooks/useVentDetail'
import ReactionButton from '../components/ReactionButton'
import CommentSection from '../components/CommentSection'
import LoadingSpinner from '../components/LoadingSpinner'

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
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wall
        </Link>
        <div className="card text-center py-12">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Post not found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
        className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wall
      </Link>

      <article className="card">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {vent.user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {vent.user?.username || 'Anonymous'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{timeAgo}</p>
            </div>
          </div>

          {vent.is_on_wall ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              <Clock className="w-3.5 h-3.5" />
              Leaves Wall {expiresIn}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              Archived
            </span>
          )}
        </header>

        <div className="mb-5">
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg whitespace-pre-wrap break-words">
            {vent.content}
          </p>
        </div>

        {vent.mood_tags && vent.mood_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {vent.mood_tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
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
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Reactions
          </h2>
          <ReactionButton
            reactions={vent.reactions || []}
            onReaction={addReaction}
            currentUserId={user?.id}
            disabled={!isAuthenticated}
          />
          {!isAuthenticated && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Sign in to react to this post.
            </p>
          )}
        </div>
      </article>

      <CommentSection
        comments={vent.comments || []}
        commentsOpen={commentsOpen}
        currentUserId={user?.id}
        onAddComment={addComment}
        disabled={!isAuthenticated}
      />
    </div>
  )
}