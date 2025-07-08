import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import type { Reaction } from '../lib/supabase'

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
    
    const rect = e.currentTarget.getBoundingClientRect()
    setPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setShowPicker(true)
  }

  const handleEmojiSelect = (emoji: string) => {
    // Only add reaction if user hasn't already reacted with this emoji
    if (!reactionGroups[emoji]?.hasUserReacted) {
      onReaction(emoji)
    }
    setShowPicker(false)
  }

  const handleReactionClick = (emoji: string) => {
    if (disabled) return
    
    // If user has already reacted with this emoji, remove it
    // Otherwise, add the reaction
    onReaction(emoji)
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Existing Reactions */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(reactionGroups).map(([emoji, data]) => (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            disabled={disabled}
            className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full text-base transition-all duration-200 ${
              data.hasUserReacted
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            title={`${data.count} reaction${data.count !== 1 ? 's' : ''}`}
          >
            <span className="text-lg">{emoji}</span>
            <span className="font-medium">{data.count}</span>
          </button>
        ))}
      </div>

      {/* Add Reaction Button */}
      {!disabled && (
        <button
          onClick={handleAddReaction}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:scale-105 flex-shrink-0 ml-2"
          title="Add reaction"
        >
          <Plus className="w-5 h-5" />
        </button>
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
