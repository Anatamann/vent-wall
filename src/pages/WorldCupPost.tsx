import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { CommentPayload, WorldCupSupport, WorldCupSupportComment } from '../lib/types'
import LoadingSpinner from '../components/LoadingSpinner'
import SupportCard from '../components/worldcup/SupportCard'
import SupportCommentSection from '../components/worldcup/SupportCommentSection'

export default function WorldCupPost() {
  const { slug } = useParams<{ slug: string }>()
  const { user, isAuthenticated } = useAuth()
  const [support, setSupport] = useState<WorldCupSupport | null>(null)
  const [comments, setComments] = useState<WorldCupSupportComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('worldcup-wall-active')
    return () => document.body.classList.remove('worldcup-wall-active')
  }, [])

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const [post, c] = await Promise.all([
        api.worldcup.getSupport(slug),
        api.worldcup.listComments(slug),
      ])
      setSupport(post)
      setComments(c.comments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post not found')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  const handleAddComment = async (payload: CommentPayload) => {
    if (!slug) return
    if (!isAuthenticated) {
      window.location.href = `/auth?next=${encodeURIComponent(`/worldcup/post/${slug}`)}`
      return
    }
    try {
      const { comment } = await api.worldcup.addComment(slug, payload)
      setComments((prev) => [...prev, comment])
      setSupport((prev) =>
        prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev
      )
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : 'Failed to add comment')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <Link
        to="/worldcup?view=wall"
        className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Wall
      </Link>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : error || !support ? (
        <div className="glass-panel p-6 text-center text-red-400 text-sm">
          {error || 'Post not found'}
        </div>
      ) : (
        <>
          <SupportCard support={support} hideComments clickable={false} />
          <div className="glass-panel p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Reactions</h2>
            <SupportCommentSection
              comments={comments}
              currentUserId={user?.id}
              supportUserId={support.user?.id}
              isAuthenticated={isAuthenticated}
              loginNext={`/worldcup/post/${support.id}`}
              onAddComment={handleAddComment}
            />
          </div>
        </>
      )}
    </div>
  )
}
