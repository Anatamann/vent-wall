import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, MoreHorizontal, AlertTriangle } from 'lucide-react'
import type { Vent } from '../lib/types'

interface UserVentsListProps {
  vents: Vent[]
  onDeleteVent: (ventId: string) => Promise<void>
  loading?: boolean
}

export default function UserVentsList({ vents, onDeleteVent, loading = false }: UserVentsListProps) {
  const [deletingVent, setDeletingVent] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const handleDeleteVent = async (ventId: string) => {
    try {
      setDeletingVent(ventId)
      await onDeleteVent(ventId)
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete vent:', error)
    } finally {
      setDeletingVent(null)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Your Vents
        </h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2" />
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-16" />
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (vents.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <MoreHorizontal className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No vents yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your vents will appear here. They stay on the Wall for 24 hours, then move to your private archive.
          </p>
        </div>
      </div>
    )
  }

  const onWallCount = vents.filter((v) => v.is_on_wall).length
  const archivedCount = vents.length - onWallCount

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Your Vents
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {onWallCount} on Wall · {archivedCount} archived
        </p>
      </div>

      <div className="space-y-4">
        {vents.map((vent) => {
          const onWall = vent.is_on_wall ?? new Date(vent.expires_at) >= new Date()

          return (
            <div
              key={vent.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    onWall
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {onWall ? 'On Wall' : 'Archived'}
                </span>
                {!onWall && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Only visible to you
                  </span>
                )}
              </div>

              <div className="mb-3">
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {vent.content}
                </p>
              </div>

              {vent.mood_tags && vent.mood_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {vent.mood_tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        border: `1px solid ${tag.color}40`,
                      }}
                    >
                      <span className="mr-1">{tag.emoji}</span>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
                  <span>{formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })}</span>
                  <span>{vent.reactions?.length || 0} reactions</span>
                  {onWall && (
                    <span>
                      Leaves Wall {formatDistanceToNow(new Date(vent.expires_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {showDeleteConfirm === vent.id ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteVent(vent.id)}
                        disabled={deletingVent === vent.id}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingVent === vent.id ? 'Deleting...' : 'Confirm'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(vent.id)}
                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Delete vent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {showDeleteConfirm === vent.id && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-red-800 dark:text-red-200 font-medium">
                        Delete this vent?
                      </p>
                      <p className="text-red-700 dark:text-red-300 mt-1">
                        This permanently removes the vent from your profile and the Wall. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}