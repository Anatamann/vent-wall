import React from 'react'
import { Plus } from 'lucide-react'

interface FloatingPostButtonProps {
  onClick: () => void
  disabled?: boolean
}

export default function FloatingPostButton({ onClick, disabled = false }: FloatingPostButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-40 ${
        disabled
          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
          : 'bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 hover:scale-110 active:scale-95'
      }`}
      aria-label="Create new vent"
    >
      <Plus 
        className={`w-6 h-6 text-white mx-auto transition-transform duration-200 ${
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