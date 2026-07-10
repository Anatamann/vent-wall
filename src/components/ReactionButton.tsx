import { useState } from 'react'
import { Plus } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import type { Reaction } from '../lib/types'
import { MAX_REACTIONS_PER_VENT } from '../lib/constants'

interface ReactionButtonProps {
  reactions: Reaction[]
  onReaction: (emoji: string) => void
  currentUserId?: string
  disabled?: boolean
}

export default function ReactionButton({ 
  reactions, 
  onReaction, 
  currentUserId,
  disabled = false 
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const [limitMessage, setLimitMessage] = useState<string | null>(null)

  const userReactionCount = currentUserId
    ? reactions.filter((r) => r.user_id === currentUserId).length
    : 0
  const atReactionLimit = userReactionCount >= MAX_REACTIONS_PER_VENT

  // Group reactions by emoji and count them
  const reactionGroups = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        count: 0,
        users: [],
        hasUserReacted: false
      }
    }
    acc[reaction.emoji].count++
    acc[reaction.emoji].users.push(reaction.user_id)
    if (currentUserId && reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasUserReacted = true
    }
    return acc
  }, {} as Record<string, { count: number; users: string[]; hasUserReacted: boolean }>)

  const handleAddReaction = (e: React.MouseEvent) => {
    if (disabled) return
    if (atReactionLimit) {
      setLimitMessage(`You can only add ${MAX_REACTIONS_PER_VENT} reactions per vent`)
      return
    }

    setLimitMessage(null)
    const rect = e.currentTarget.getBoundingClientRect()
    setPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setShowPicker(true)
  }

  const handleEmojiSelect = (emoji: string) => {
    const alreadyReacted = reactions.some(
      (r) => r.user_id === currentUserId && r.emoji === emoji
    )
    if (!alreadyReacted && atReactionLimit) {
      setLimitMessage(`You can only add ${MAX_REACTIONS_PER_VENT} reactions per vent`)
      return
    }
    setLimitMessage(null)
    onReaction(emoji)
  }

  const handleReactionClick = (emoji: string, hasUserReacted: boolean) => {
    if (disabled) return
    if (!hasUserReacted && atReactionLimit) {
      setLimitMessage(`You can only add ${MAX_REACTIONS_PER_VENT} reactions per vent`)
      return
    }
    setLimitMessage(null)
    onReaction(emoji)
  }

  return (
    <div className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
      {/* Existing Reactions */}
      <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
        {Object.entries(reactionGroups).map(([emoji, data]) => (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji, data.hasUserReacted)}
            disabled={disabled}
            className={`inline-flex items-center space-x-1 px-2 py-1.5 rounded-full text-xs sm:text-sm transition-all duration-200 ${
              data.hasUserReacted
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            title={`${data.count} reaction${data.count !== 1 ? 's' : ''}`}
          >
            <span>{emoji}</span>
            <span className="text-[10px] sm:text-xs font-medium">{data.count}</span>
          </button>
        ))}
      </div>

      {/* Add Reaction Button */}
      {!disabled && (
        <button
          onClick={handleAddReaction}
          disabled={atReactionLimit}
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ml-2 transition-all duration-200 ${
            atReactionLimit
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 opacity-50 cursor-not-allowed'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300 hover:scale-105'
          }`}
          title={
            atReactionLimit
              ? `Reaction limit reached (${MAX_REACTIONS_PER_VENT}/${MAX_REACTIONS_PER_VENT})`
              : `Add reaction (${userReactionCount}/${MAX_REACTIONS_PER_VENT})`
          }
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
      </div>

      {limitMessage && (
        <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mt-1">
          {limitMessage}
        </p>
      )}

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onEmojiSelect={handleEmojiSelect}
        position={pickerPosition}
      />
    </div>
  )
}