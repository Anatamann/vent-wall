import { useEffect, useState } from 'react'
import { Edit3, Check, X, Trash2, Image } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import UserAvatar from './UserAvatar'
import GifPicker from './GifPicker'
import UserNameWithStatus from './UserNameWithStatus'
import type { KlipyGifItem } from '../lib/types'

const STATUS_PLACEHOLDER = 'e.g. Taking it one day at a time'
const MAX_STATUS_LENGTH = 30

interface UsernameEditorProps {
  currentUsername: string
  currentStatus?: string | null
  avatarUrl?: string | null
  onUpdateUsername: (newUsername: string) => Promise<void>
  onUpdateStatus: (status: string) => Promise<void>
  onSetAvatarFromGif: (gifId: string) => Promise<void>
  onRemoveAvatar: () => Promise<void>
}

export default function UsernameEditor({
  currentUsername,
  currentStatus,
  avatarUrl,
  onUpdateUsername,
  onUpdateStatus,
  onSetAvatarFromGif,
  onRemoveAvatar,
}: UsernameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState(currentUsername)
  const [statusDraft, setStatusDraft] = useState(currentStatus ?? '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isSettingAvatar, setIsSettingAvatar] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState('')

  useEffect(() => {
    setStatusDraft(currentStatus ?? '')
  }, [currentStatus])

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

  const statusTrimmed = statusDraft.trim()
  const statusValid =
    statusTrimmed.length <= MAX_STATUS_LENGTH &&
    (statusTrimmed.length === 0 || /^[a-zA-Z0-9 ]+$/.test(statusTrimmed))
  const statusDirty = statusTrimmed !== (currentStatus?.trim() ?? '')

  const handleSaveStatus = async () => {
    if (!statusDirty || !statusValid) return

    try {
      setIsSavingStatus(true)
      setStatusError('')
      await onUpdateStatus(statusTrimmed)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      setStatusError(message)
    } finally {
      setIsSavingStatus(false)
    }
  }

  const handleClearStatus = async () => {
    if (!currentStatus?.trim()) return

    try {
      setIsSavingStatus(true)
      setStatusError('')
      setStatusDraft('')
      await onUpdateStatus('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clear status'
      setStatusError(message)
    } finally {
      setIsSavingStatus(false)
    }
  }

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

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <label
                htmlFor="profile-status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Status
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Shown under your username on posts and comments:
              </p>
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 w-fit">
                <UserNameWithStatus
                  username={currentUsername}
                  status={statusTrimmed || 'your status'}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="profile-status"
                  type="text"
                  value={statusDraft}
                  onChange={(e) => {
                    setStatusDraft(e.target.value)
                    setStatusError('')
                  }}
                  maxLength={MAX_STATUS_LENGTH}
                  placeholder={STATUS_PLACEHOLDER}
                  className={`input flex-1 ${
                    statusValid
                      ? ''
                      : 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={!statusDirty || !statusValid || isSavingStatus}
                  className="btn-primary text-sm py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingStatus ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {statusTrimmed.length}/{MAX_STATUS_LENGTH} · letters, numbers, and spaces only
                </span>
                {currentStatus?.trim() && (
                  <button
                    type="button"
                    onClick={handleClearStatus}
                    disabled={isSavingStatus}
                    className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Clear status
                  </button>
                )}
              </div>
              {!statusValid && statusTrimmed.length > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Status can only contain letters, numbers, and spaces
                </p>
              )}
              {statusError && (
                <p className="text-sm text-red-600 dark:text-red-400">{statusError}</p>
              )}
            </div>
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