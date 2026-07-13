import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import type { Vent } from '../lib/types'
import UserAvatar from './UserAvatar'
import UserNameWithStatus from './UserNameWithStatus'
import VentContentDisplay from './VentContentDisplay'
import MoodTagChip from './MoodTagChip'

interface VentCardProps {
  vent: Vent
}

export default function VentCard({ vent }: VentCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const timeAgo = formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })
  const reactionCount = vent.reactions?.length || 0
  const tags = vent.mood_tags || []

  useEffect(() => {
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
  }, [])

  return (
    <Link
      to={`/post/${vent.slug}`}
      ref={cardRef}
      className={`glass-card vent-card-hover vent-card-enter overflow-hidden h-full flex flex-col block no-underline ${
        isVisible ? 'vent-card-visible' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2 min-w-0">
          <UserAvatar
            username={vent.user?.username || 'Anonymous'}
            avatarUrl={vent.user?.avatar_url}
            size="sm"
          />
          <UserNameWithStatus
            username={vent.user?.username || 'Anonymous'}
            status={vent.user?.status}
            usernameClassName="text-xs sm:text-sm font-medium text-slate-100 truncate"
          />
        </div>
        <p className="text-[10px] sm:text-xs text-slate-500 shrink-0">{timeAgo}</p>
      </div>

      <div className="mb-3 flex-grow">
        <VentContentDisplay
          content={vent.content}
          asset={vent.asset}
          compact
          showReadMore
          textClassName="text-slate-200 leading-relaxed"
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag) => (
            <MoodTagChip key={tag.id} tag={tag} static />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 pt-3 mt-auto border-t border-white/10 text-xs sm:text-sm text-slate-400">
        {reactionCount > 0 && (
          <span>
            {reactionCount} reaction{reactionCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-sky-400/90">
          <MessageCircle className="w-4 h-4" />
          View post
        </span>
      </div>
    </Link>
  )
}
