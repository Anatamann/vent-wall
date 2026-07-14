import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Heart } from 'lucide-react'
import type { CommentAsset, GlobeVentSummary, MoodTag, Vent } from '../lib/types'
import UserAvatar from './UserAvatar'
import UserNameWithStatus from './UserNameWithStatus'
import VentContentDisplay from './VentContentDisplay'
import MoodTagChip from './MoodTagChip'

/** Minimal shape accepted by the standard vent card (Wall + Globe). */
export type VentCardModel = {
  id: string
  slug: string
  content: string
  created_at: string
  user?: {
    id?: string
    username?: string
    status?: string | null
    avatar_url?: string | null
  } | null
  mood_tags?: Array<Pick<MoodTag, 'id' | 'name' | 'color' | 'emoji'>>
  asset?: CommentAsset
  /** Prefer explicit counts when present (globe API). */
  reaction_count?: number
  comment_count?: number
  engagement_count?: number
  /** Full vent payload may only have arrays. */
  reactions?: Array<unknown>
  comments?: Array<unknown>
}

interface VentCardProps {
  vent: Vent | GlobeVentSummary | VentCardModel
  /** Animate in when scrolled into view (feed). Default true. */
  animateOnScroll?: boolean
}

function previewText(content: string, max = 160): string {
  const trimmed = content.trim()
  if (!trimmed) return ''
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

function normalizeCounts(vent: VentCardModel) {
  const reactionCount =
    typeof vent.reaction_count === 'number'
      ? vent.reaction_count
      : Array.isArray(vent.reactions)
        ? vent.reactions.length
        : 0

  const commentCount =
    typeof vent.comment_count === 'number'
      ? vent.comment_count
      : Array.isArray(vent.comments)
        ? vent.comments.length
        : 0

  const engagementCount =
    typeof vent.engagement_count === 'number'
      ? vent.engagement_count
      : reactionCount + commentCount

  return { reactionCount, commentCount, engagementCount }
}

/**
 * Standard vent card (Vent Globe style) — used on Wall feed and Globe popup.
 * Whole card navigates to the full post.
 */
export default function VentCard({ vent, animateOnScroll = true }: VentCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const [isVisible, setIsVisible] = useState(!animateOnScroll)

  const timeAgo = formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })
  const username = vent.user?.username || 'Anonymous'
  const tags = vent.mood_tags || []
  const { reactionCount, commentCount, engagementCount } = normalizeCounts(vent)
  const asset = 'asset' in vent ? vent.asset : undefined
  const hasAsset = Boolean(asset?.url)
  const contentPreview = previewText(vent.content)

  useEffect(() => {
    if (!animateOnScroll) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px 0px -50px 0px',
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current)
      }
    }
  }, [animateOnScroll])

  return (
    <Link
      to={`/post/${vent.slug}`}
      ref={cardRef}
      className={`group glass-card vent-card-hover vent-card-enter overflow-hidden h-full flex flex-col block no-underline text-inherit
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50
        ${isVisible ? 'vent-card-visible' : ''}`}
    >
      {/* Author */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2 min-w-0">
          <UserAvatar
            username={username}
            avatarUrl={vent.user?.avatar_url}
            size="sm"
          />
          <UserNameWithStatus
            username={username}
            status={vent.user?.status}
            usernameClassName="text-xs sm:text-sm font-medium text-slate-100 truncate"
          />
        </div>
        <p className="text-[10px] sm:text-xs text-slate-500 shrink-0">{timeAgo}</p>
      </div>

      {/* Content preview (+ optional GIF on wall vents) */}
      <div className="mb-3 flex-grow min-w-0">
        {hasAsset ? (
          <VentContentDisplay
            content={vent.content}
            asset={asset}
            compact
            showReadMore
            textClassName="text-xs sm:text-sm text-slate-100 leading-relaxed"
          />
        ) : contentPreview ? (
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">{contentPreview}</p>
        ) : (
          <p className="text-xs sm:text-sm text-slate-500 italic">GIF vent</p>
        )}
      </div>

      {/* Mood tags — standard chips (min-w-0 + truncate avoids mobile overflow) */}
      {tags.length > 0 && (
        <div className="flex min-w-0 flex-wrap gap-1.5 mb-3">
          {tags.map((tag) => (
            <MoodTagChip key={tag.id} tag={tag} static compact />
          ))}
        </div>
      )}

      {/* Engagement footer */}
      <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-white/10 text-[11px] sm:text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1" title="Total engagement">
            <Heart className="w-3.5 h-3.5" />
            {engagementCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Comments">
            <MessageCircle className="w-3.5 h-3.5" />
            {commentCount}
          </span>
        </div>
        <span className="font-medium text-sky-400/90 group-hover:text-sky-300 transition-colors shrink-0">
          View full vent
        </span>
      </div>
    </Link>
  )
}
