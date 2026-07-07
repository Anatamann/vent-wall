import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isSameDay, parseISO } from 'date-fns'
import {
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  LayoutList,
  X,
  Calendar,
} from 'lucide-react'
import type { Vent } from '../lib/types'
import VentContentDisplay from './VentContentDisplay'

interface UserVentsListProps {
  vents: Vent[]
  onDeleteVent: (ventId: string) => Promise<void>
  loading?: boolean
}

type ListTab = 'posts' | 'search'

function isOnWall(vent: Vent): boolean {
  return vent.is_on_wall ?? new Date(vent.expires_at) >= new Date()
}

function ventDateKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd')
}

function formatDateHeading(iso: string): string {
  const date = parseISO(iso)
  const now = new Date()
  if (isSameDay(date, now)) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d, yyyy')
}

function groupByDate(vents: Vent[]): Array<{ dateKey: string; heading: string; vents: Vent[] }> {
  const map = new Map<string, Vent[]>()

  for (const vent of vents) {
    const key = ventDateKey(vent.created_at)
    const group = map.get(key) ?? []
    group.push(vent)
    map.set(key, group)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupVents]) => ({
      dateKey,
      heading: formatDateHeading(groupVents[0].created_at),
      vents: groupVents.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
}

function ventMatchesSearch(vent: Vent, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (vent.content.toLowerCase().includes(q)) return true
  return (vent.mood_tags ?? []).some((tag) => tag.name.toLowerCase().includes(q))
}

interface VentCardProps {
  vent: Vent
  onWall: boolean
  compact?: boolean
  deletingVent: string | null
  showDeleteConfirm: string | null
  onRequestDelete: (id: string) => void
  onCancelDelete: () => void
  onConfirmDelete: (id: string) => void
}

function VentCard({
  vent,
  onWall,
  compact = false,
  deletingVent,
  showDeleteConfirm,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: VentCardProps) {
  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
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
          <span className="text-xs text-gray-500 dark:text-gray-400">Only visible to you</span>
        )}
      </div>

      <div className={compact ? 'mb-2' : 'mb-3'}>
        {onWall ? (
          <Link
            to={`/post/${vent.slug}`}
            className="block hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <VentContentDisplay
              content={vent.content}
              asset={vent.asset}
              compact={compact}
              showReadMore={compact}
              textClassName="text-gray-800 dark:text-gray-200 leading-relaxed"
            />
          </Link>
        ) : (
          <VentContentDisplay
            content={vent.content}
            asset={vent.asset}
            compact={compact}
            textClassName="text-gray-800 dark:text-gray-200 leading-relaxed"
          />
        )}
      </div>

      {vent.mood_tags && vent.mood_tags.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
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

      <div className="flex items-center justify-between text-sm gap-3">
        <span className="text-gray-500 dark:text-gray-400">
          {vent.reactions?.length || 0} reactions
        </span>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-end gap-0.5 text-xs text-gray-500 dark:text-gray-400 text-right">
            <span>{formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })}</span>
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
                  onClick={onCancelDelete}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onConfirmDelete(vent.id)}
                  disabled={deletingVent === vent.id}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingVent === vent.id ? 'Deleting...' : 'Confirm'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => onRequestDelete(vent.id)}
                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Delete vent"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm === vent.id && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-red-800 dark:text-red-200 font-medium">Delete this vent?</p>
              <p className="text-red-700 dark:text-red-300 mt-1">
                This permanently removes the vent from your profile and the Wall. This action cannot
                be undone.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UserVentsList({ vents, onDeleteVent, loading = false }: UserVentsListProps) {
  const [activeTab, setActiveTab] = useState<ListTab>('posts')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [deletingVent, setDeletingVent] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const { onWallVents, archivedVents, archivedByDate } = useMemo(() => {
    const wall: Vent[] = []
    const archived: Vent[] = []

    for (const vent of vents) {
      if (isOnWall(vent)) wall.push(vent)
      else archived.push(vent)
    }

    wall.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return {
      onWallVents: wall,
      archivedVents: archived,
      archivedByDate: groupByDate(archived),
    }
  }, [vents])

  const searchResults = useMemo(() => {
    return vents
      .filter((vent) => ventMatchesSearch(vent, searchQuery))
      .filter((vent) => !filterDate || ventDateKey(vent.created_at) === filterDate)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [vents, searchQuery, filterDate])

  const availableDates = useMemo(() => {
    const keys = new Set(vents.map((v) => ventDateKey(v.created_at)))
    return Array.from(keys).sort((a, b) => b.localeCompare(a))
  }, [vents])

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

  const toggleDate = (dateKey: string) => {
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }))
  }

  const clearSearch = () => {
    setSearchQuery('')
    setFilterDate('')
  }

  const cardProps = {
    deletingVent,
    showDeleteConfirm,
    onRequestDelete: setShowDeleteConfirm,
    onCancelDelete: () => setShowDeleteConfirm(null),
    onConfirmDelete: handleDeleteVent,
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Vents</h2>
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No vents yet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your vents will appear here. They stay on the Wall for 24 hours, then move to your
            private archive.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Vents</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {onWallVents.length} on Wall · {archivedVents.length} archived
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'posts'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-b-0 border-gray-200 dark:border-gray-700 -mb-[1px]'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Posts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-b-0 border-gray-200 dark:border-gray-700 -mb-[1px]'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {activeTab === 'posts' && (
        <div className="space-y-8">
          {onWallVents.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                On the Wall
              </h3>
              <div className="space-y-4">
                {onWallVents.map((vent) => (
                  <VentCard key={vent.id} vent={vent} onWall {...cardProps} />
                ))}
              </div>
            </section>
          )}

          {archivedByDate.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Archive
              </h3>
              <div className="space-y-2">
                {archivedByDate.map(({ dateKey, heading, vents: dateVents }) => {
                  const expanded = expandedDates[dateKey] ?? false
                  return (
                    <div
                      key={dateKey}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDate(dateKey)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {expanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {heading}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-3">
                          {dateVents.length} {dateVents.length === 1 ? 'vent' : 'vents'}
                        </span>
                      </button>

                      {expanded && (
                        <div className="p-3 space-y-3 border-t border-gray-200 dark:border-gray-700">
                          {dateVents.map((vent) => (
                            <VentCard
                              key={vent.id}
                              vent={vent}
                              onWall={false}
                              compact
                              {...cardProps}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {onWallVents.length === 0 && archivedByDate.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              No vents match the current view.
            </p>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your vents by text or mood tag..."
                className="input pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[10rem]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="input pl-10"
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              {(searchQuery || filterDate) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="btn-secondary inline-flex items-center gap-1.5 text-sm py-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            {availableDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 self-center mr-1">
                  Quick dates:
                </span>
                {availableDates.slice(0, 6).map((dateKey) => (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setFilterDate(filterDate === dateKey ? '' : dateKey)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterDate === dateKey
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {formatDateHeading(`${dateKey}T12:00:00`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              {searchQuery && (
                <span>
                  {' '}
                  for &ldquo;<span className="text-gray-700 dark:text-gray-300">{searchQuery}</span>
                  &rdquo;
                </span>
              )}
              {filterDate && (
                <span>
                  {' '}
                  on {formatDateHeading(`${filterDate}T12:00:00`)}
                </span>
              )}
            </p>

            {searchResults.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No vents match your search.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((vent) => (
                  <VentCard
                    key={vent.id}
                    vent={vent}
                    onWall={isOnWall(vent)}
                    compact={!isOnWall(vent)}
                    {...cardProps}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}