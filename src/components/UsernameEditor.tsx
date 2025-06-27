import React, { useState } from 'react'
import { Edit3, Check, X, User } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

interface UsernameEditorProps {
  currentUsername: string
  onUpdateUsername: (newUsername: string) => Promise<void>
}

export default function UsernameEditor({ currentUsername, onUpdateUsername }: UsernameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState(currentUsername)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')

  const handleStartEdit = () => {
    setIsEditing(true)
    setNewUsername(currentUsername)
    setError('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNewUsername(currentUsername)
    setError('')
  }

  const handleSave = async () => {
    if (newUsername.trim() === currentUsername) {
      setIsEditing(false)
      return
    }

    try {
      setIsUpdating(true)
      setError('')
      await onUpdateUsername(newUsername.trim())
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update username')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const isValid = newUsername.trim().length >= 3 && 
                  newUsername.trim().length <= 30 && 
                  /^[a-zA-Z0-9_-]+$/.test(newUsername.trim())

  return (
    <div className="card">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Profile Settings
          </h1>
          
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`px-3 py-1 border rounded-md text-lg font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors ${
                    isValid 
                      ? 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500' 
                      : 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                  }`}
                  placeholder="Enter username"
                  autoFocus
                />
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleSave}
                    disabled={!isValid || isUpdating}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save"
                  >
                    {isUpdating ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                  
                  <button
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Validation Messages */}
              <div className="text-sm">
                {!isValid && newUsername.trim().length > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens
                  </p>
                )}
                {error && (
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                )}
                <p className="text-gray-500 dark:text-gray-400">
                  Press Enter to save, Escape to cancel
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                @{currentUsername}
              </span>
              <button
                onClick={handleStartEdit}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Edit username"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}