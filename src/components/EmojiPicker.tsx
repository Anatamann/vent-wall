import React, { useState } from 'react'
import { Smile, Heart, ThumbsUp, Star, Zap, Coffee } from 'lucide-react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
  isOpen: boolean
  position?: { x: number; y: number }
}

const EMOJI_CATEGORIES = {
  'Emotions': ['❤️', '😊', '😢', '😡', '😰', '😌', '🤗', '😔', '🥰', '😍'],
  'Support': ['🫂', '🙏', '💪', '👏', '🤝', '💯', '✨', '🌟', '🔥', '💝'],
  'Nature': ['🌊', '🌅', '🌈', '🌙', '☀️', '🌸', '🍃', '🌺', '🦋', '🌻'],
  'Activities': ['☕', '📝', '🎵', '🏃', '🧘', '🎨', '📚', '🌃', '🏄', '✈️'],
  'Objects': ['💡', '🎯', '🔑', '🎪', '🎭', '🎨', '🎪', '🎲', '🎸', '🎤']
}

export default function EmojiPicker({ onEmojiSelect, onClose, isOpen, position }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('Emotions')

  if (!isOpen) return null

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    onClose()
  }

  const style = position ? {
    position: 'fixed' as const,
    top: Math.max(10, Math.min(window.innerHeight - 300, position.y - 200)),
    left: Math.max(10, Math.min(window.innerWidth - 330, position.x - 160)),
    zIndex: 1000
  } : {}

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Picker */}
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 z-50"
        style={style}
      >
        {/* Category Tabs */}
        <div className="flex space-x-1 mb-3 overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleEmojiClick(emoji)}
              className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Quick reactions
            </span>
            <div className="flex space-x-1">
              {['❤️', '👏', '🙏', '💪'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}