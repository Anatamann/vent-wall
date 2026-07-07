import { useState } from 'react'
import { Edit3, Check, X, Trash2, Image } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import UserAvatar from './UserAvatar'
import GifPicker from './GifPicker'
import type { KlipyGifItem } from '../lib/types'

interface UsernameEditorProps {
  currentUsername: string
  avatarUrl?: string | null
  onUpdateUsername: (newUsername: string) => Promise<void>
  onSetAvatarFromGif: (gifId: string) => Promise<void>
  onRemoveAvatar: () => Promise<void>
}

export default function UsernameEditor({
  currentUsername,
  avatarUrl,
  onUpdateUsername,
  onSetAvatarFromGif,
  onRemoveAvatar,
}: UsernameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState(currentUsername)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSettingAvatar, setIsSettingAvatar] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update username'
      setError(message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGifSelect = async (gif: KlipyGifItem) => {
    try {
      setIsSettingAvatar(true)
      setError('')
      await onSetAvatarFromGif(gif.id)
      setShowGifPicker(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set profile picture'
      setError(message)
    } finally {
      setIsSettingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      setIsSettingAvatar(true)
      setError('')
      await onRemoveAvatar()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove profile picture'
      setError(message)
    } finally {
      setIsSettingAvatar(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const isValid =
    newUsername.trim().length >= 3 &&
    newUsername.trim().length <= 30 &&
    /^[a-zA-Z0-9_-]+$/.test(newUsername.trim())

  return (
    <>
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <UserAvatar username={currentUsername} avatarUrl={avatarUrl} size="lg" />

            <button
              type="button"
              onClick={() => setShowGifPicker(true)}
              disabled={isSettingAvatar}
              className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center group disabled:cursor-not-allowed"
              title="Choose GIF profile picture"
              aria-label="Choose GIF profile picture"
            >
              {isSettingAvatar ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Image className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Profile Settings
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Pick a GIF from Klipy for your profile picture. Cached locally after selection — max 2MB.
            </p>

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

                <div className="text-sm">
                  {!isValid && newUsername.trim().length > 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens
                    </p>
                  )}
                  {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
                  <p className="text-gray-500 dark:text-gray-400">
                    Press Enter to save, Escape to cancel
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
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

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isSettingAvatar}
                    className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove profile picture
                  </button>
                )}

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onGifSelect={handleGifSelect}
      />
    </>
  )
}