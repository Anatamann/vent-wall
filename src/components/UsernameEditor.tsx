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

const glassInput =
  'w-full min-w-0 px-3 py-2 text-xs sm:text-sm rounded-full border border-white/10 ' +
  'bg-slate-800/80 text-slate-100 placeholder-slate-500 backdrop-blur-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/40'

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
      <div className="glass-panel p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
          <div className="relative flex-shrink-0 self-start">
            <UserAvatar username={currentUsername} avatarUrl={avatarUrl} size="lg" />

            <button
              type="button"
              onClick={() => setShowGifPicker(true)}
              disabled={isSettingAvatar}
              className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/45 transition-colors flex items-center justify-center group disabled:cursor-not-allowed ring-1 ring-white/10"
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
            <h2 className="text-lg sm:text-xl font-semibold text-slate-50 mb-1">Profile Settings</h2>

            <p className="text-xs sm:text-sm text-slate-400 mb-3">
              Pick a GIF from Klipy for your profile picture — max 2MB.
            </p>

            {isEditing ? (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 min-w-0">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`${glassInput} flex-1 font-medium ${
                      isValid ? '' : 'border-red-400/50 focus:ring-red-400/40'
                    }`}
                    placeholder="Enter username"
                    autoFocus
                  />

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleSave}
                      disabled={!isValid || isUpdating}
                      className="p-2 rounded-full text-emerald-400 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save"
                    >
                      {isUpdating ? <LoadingSpinner size="sm" /> : <Check className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={handleCancel}
                      disabled={isUpdating}
                      className="p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs sm:text-sm">
                  {!isValid && newUsername.trim().length > 0 && (
                    <p className="text-red-400">
                      Username must be 3-30 characters and contain only letters, numbers,
                      underscores, and hyphens
                    </p>
                  )}
                  {error && <p className="text-red-400">{error}</p>}
                  <p className="text-slate-500">Press Enter to save, Escape to cancel</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg font-medium text-slate-200">
                    @{currentUsername}
                  </span>
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 rounded-full text-slate-400 hover:text-sky-300 hover:bg-white/5 transition-colors"
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
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove profile picture
                  </button>
                )}

                {error && <p className="text-xs sm:text-sm text-red-400">{error}</p>}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <label
                htmlFor="profile-status"
                className="block text-xs sm:text-sm font-medium text-slate-200"
              >
                Status
              </label>
              <p className="text-[10px] sm:text-xs text-slate-500">
                Shown under your username on posts and comments:
              </p>
              <div className="rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2 w-fit">
                <UserNameWithStatus
                  username={currentUsername}
                  status={statusTrimmed || 'your status'}
                  usernameClassName="text-xs sm:text-sm font-medium text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 min-w-0">
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
                  className={`${glassInput} flex-1 ${
                    statusValid ? '' : 'border-red-400/50 focus:ring-red-400/40'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={!statusDirty || !statusValid || isSavingStatus}
                  className="btn-primary rounded-full text-xs sm:text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingStatus ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500">
                  {statusTrimmed.length}/{MAX_STATUS_LENGTH} · letters, numbers, and spaces only
                </span>
                {currentStatus?.trim() && (
                  <button
                    type="button"
                    onClick={handleClearStatus}
                    disabled={isSavingStatus}
                    className="text-red-400 hover:underline disabled:opacity-50"
                  >
                    Clear status
                  </button>
                )}
              </div>
              {!statusValid && statusTrimmed.length > 0 && (
                <p className="text-xs sm:text-sm text-red-400">
                  Status can only contain letters, numbers, and spaces
                </p>
              )}
              {statusError && (
                <p className="text-xs sm:text-sm text-red-400">{statusError}</p>
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
