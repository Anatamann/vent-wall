import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { truncateVentContent } from '../lib/format'
import type { Vent } from '../lib/types'

interface VentCardProps {
  vent: Vent
}

export default function VentCard({ vent }: VentCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const timeAgo = formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })
  const { preview, isTruncated } = truncateVentContent(vent.content)
  const reactionCount = vent.reactions?.length || 0

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
      className={`card vent-card-hover vent-card-enter overflow-hidden h-full flex flex-col block no-underline ${
        isVisible ? 'vent-card-visible' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {vent.user?.username?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {vent.user?.username || 'Anonymous'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex-grow">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3">
          {preview}
        </p>
        {isTruncated && (
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-2 font-medium">
            Read full post →
          </p>
        )}
      </div>

      {vent.mood_tags && vent.mood_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {vent.mood_tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
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
          {vent.mood_tags.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
              +{vent.mood_tags.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-3 mt-auto border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        {reactionCount > 0 && (
          <span>
            {reactionCount} reaction{reactionCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="w-4 h-4" />
          View post
        </span>
      </div>
    </Link>
  )
}