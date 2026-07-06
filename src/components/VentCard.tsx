import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import ReactionButton from './ReactionButton'
import type { Vent } from '../lib/types'

interface VentCardProps {
  vent: Vent
  onReaction?: (ventId: string, emoji: string) => void
  currentUserId?: string
}

export default function VentCard({ vent, onReaction, currentUserId }: VentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const timeAgo = formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })

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
        rootMargin: '50px 0px -50px 0px'
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
    <div 
      ref={cardRef}
      className={`card vent-card-hover vent-card-enter overflow-hidden h-full flex flex-col ${
        isVisible ? 'vent-card-visible' : ''
      }`}
    >
      {/* Header */}
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {timeAgo}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4 flex-grow">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
          {vent.content}
        </p>
      </div>

      {/* Mood Tags */}
      {vent.mood_tags && vent.mood_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {vent.mood_tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`
              }}
            >
              <span className="mr-1">{tag.emoji}</span>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-start pt-3 mt-auto border-t border-gray-100 dark:border-gray-700 overflow-hidden">
        <ReactionButton
          reactions={vent.reactions || []}
          onReaction={(emoji) => onReaction?.(vent.id, emoji)}
          currentUserId={currentUserId}
          disabled={!currentUserId}
        />
      </div>
    </div>
  )
}