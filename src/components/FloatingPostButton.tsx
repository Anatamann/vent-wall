import React from 'react'
import { Plus } from 'lucide-react'

interface FloatingPostButtonProps {
  onClick: () => void
  disabled?: boolean
  /**
   * Sit just above the feedback FAB (bottom-right stack).
   * Use on pages that also show FloatingFeedbackButton.
   */
  stacked?: boolean
}

export default function FloatingPostButton({
  onClick,
  disabled = false,
  stacked = false,
}: FloatingPostButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`fixed ${
        // Feedback sits at bottom-4/6 (h-11/h-14); small gap above it
        stacked ? 'bottom-[4.25rem] sm:bottom-[5.5rem]' : 'bottom-4 sm:bottom-6'
      } right-3 sm:right-6 w-11 h-11 sm:w-14 sm:h-14 rounded-full shadow-md sm:shadow-lg transition-all duration-300 z-[45] ${
        disabled
          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
          : 'bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 hover:scale-110 active:scale-95'
      }`}
      aria-label="Create new vent"
    >
      <Plus 
        className={`w-5 h-5 sm:w-6 sm:h-6 text-white mx-auto transition-transform duration-200 ${
          disabled ? 'opacity-60' : 'group-hover:rotate-90'
        }`} 
      />
      
      {/* Ripple effect */}
      {!disabled && (
        <div className="absolute inset-0 rounded-full bg-primary-400 dark:bg-primary-300 opacity-0 animate-ping" />
      )}
    </button>
  )
}