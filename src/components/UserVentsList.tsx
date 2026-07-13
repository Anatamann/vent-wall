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
  Pencil,
} from 'lucide-react'
import type { Vent } from '../lib/types'
import VentContentDisplay from './VentContentDisplay'
import MoodTagChip from './MoodTagChip'
import EditVentModal from './EditVentModal'
import { MAX_VENT_EDITS } from '../lib/constants'

interface UserVentsListProps {
  vents: Vent[]
  onDeleteVent: (ventId: string) => Promise<void>
  onVentUpdated?: (vent: Vent) => void
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

interface ProfileVentCardProps {
  vent: Vent
  onWall: boolean
  compact?: boolean
  deletingVent: string | null
  showDeleteConfirm: string | null
  onRequestDelete: (id: string) => void
  onCancelDelete: () => void
  onConfirmDelete: (id: string) => void
  onRequestEdit: (vent: Vent) => void
}

function ProfileVentCard({
  vent,
  onWall,
  compact = false,
  deletingVent,
  showDeleteConfirm,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onRequestEdit,
}: ProfileVentCardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-slate-800/50 backdrop-blur-sm
        hover:border-sky-400/25 hover:bg-slate-800/70 transition-colors ${
          compact ? 'p-3' : 'p-4'
        }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 min-w-0 ${
          compact ? 'mb-2' : 'mb-3'
        }`}
      >
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shrink-0 border ${
            onWall
              ? 'bg-sky-500/15 text-sky-200 border-sky-400/30'
              : 'bg-slate-700/60 text-slate-400 border-white/10'
          }`}
        >
          {onWall ? 'On Wall' : 'Archived'}
        </span>
        {!onWall && (
          <span className="text-[10px] sm:text-xs text-slate-500">Only visible to you</span>
        )}
      </div>

      <div className={compact ? 'mb-2' : 'mb-3'}>
        {onWall ? (
          <Link
            to={`/post/${vent.slug}`}
            className="block hover:text-sky-300 transition-colors no-underline text-inherit"
          >
            <VentContentDisplay
              content={vent.content}
              asset={vent.asset}
              compact={compact}
              showReadMore={compact}
              textClassName="text-slate-100 leading-relaxed"
            />
          </Link>
        ) : (
          <VentContentDisplay
            content={vent.content}
            asset={vent.asset}
            compact={compact}
            textClassName="text-slate-100 leading-relaxed"
          />
        )}
      </div>

      {vent.mood_tags && vent.mood_tags.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 ${compact ? 'mb-2' : 'mb-3'}`}>
          {vent.mood_tags.map((tag) => (
            <MoodTagChip key={tag.id} tag={tag} static />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm min-w-0">
        <span className="text-slate-400 shrink-0">{vent.reactions?.length || 0} reactions</span>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto min-w-0">
          <div className="flex flex-col items-start sm:items-end gap-0.5 text-[10px] sm:text-xs text-slate-500 min-w-0">
            <span className="whitespace-nowrap">
              {formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })}
            </span>
            {onWall && (
              <span className="truncate max-w-[12rem] sm:max-w-none">
                Leaves Wall {formatDistanceToNow(new Date(vent.expires_at), { addSuffix: true })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {showDeleteConfirm === vent.id ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onCancelDelete}
                  className="px-2 py-1 text-[10px] sm:text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onConfirmDelete(vent.id)}
                  disabled={deletingVent === vent.id}
                  className="px-2 py-1 text-[10px] sm:text-xs bg-red-600 text-white rounded-full hover:bg-red-500 disabled:opacity-50"
                >
                  {deletingVent === vent.id ? 'Deleting...' : 'Confirm'}
                </button>
              </div>
            ) : (
              <>
                {onWall &&
                  (() => {
                    const max = vent.max_edits ?? MAX_VENT_EDITS
                    const used = vent.edit_count ?? 0
                    const left =
                      typeof vent.edits_remaining === 'number'
                        ? vent.edits_remaining
                        : Math.max(0, max - used)
                    if (left <= 0) {
                      return (
                        <span
                          className="px-1.5 text-[10px] text-slate-500"
                          title={`Edit limit reached (${max}/${max})`}
                        >
                          No edits left
                        </span>
                      )
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => onRequestEdit(vent)}
                        className="p-1.5 rounded-full text-slate-500 hover:text-sky-300 hover:bg-white/5 transition-colors"
                        title={`Edit vent · ${left} of ${max} left`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )
                  })()}
                <button
                  onClick={() => onRequestDelete(vent.id)}
                  className="p-1.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                  title="Delete vent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm === vent.id && (
        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-400/25">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="text-red-200 font-medium">Delete this vent?</p>
              <p className="text-red-300/80 mt-1">
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

export default function UserVentsList({
  vents,
  onDeleteVent,
  onVentUpdated,
  loading = false,
}: UserVentsListProps) {
  const [activeTab, setActiveTab] = useState<ListTab>('posts')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [deletingVent, setDeletingVent] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingVent, setEditingVent] = useState<Vent | null>(null)

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
    onRequestEdit: setEditingVent,
  }

  if (loading) {
    return (
      <div className="glass-panel p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-slate-50 mb-4">Your Vents</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-700/70 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-700/50 rounded w-1/2 mb-2" />
              <div className="flex space-x-2">
                <div className="h-6 bg-slate-700/60 rounded-full w-16" />
                <div className="h-6 bg-slate-700/60 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (vents.length === 0) {
    return (
      <div className="glass-panel text-center py-10 px-4">
        <div className="text-slate-500 mb-2">
          <MoreHorizontal className="w-12 h-12 mx-auto mb-2 opacity-60" />
          <h3 className="text-base sm:text-lg font-medium text-slate-100 mb-2">No vents yet</h3>
          <p className="text-slate-400 text-sm">
            Your vents will appear here. They stay on the Wall for 24 hours, then move to your
            private archive.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-50">Your Vents</h2>
        <p className="text-xs sm:text-sm text-slate-400">
          {onWallVents.length} on Wall · {archivedVents.length} archived
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'posts'
              ? 'bg-sky-500/15 text-sky-100 border border-sky-400/35'
              : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Posts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-sky-500/15 text-sky-100 border border-sky-400/35'
              : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5'
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
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                On the Wall
              </h3>
              <div className="space-y-3">
                {onWallVents.map((vent) => (
                  <ProfileVentCard key={vent.id} vent={vent} onWall {...cardProps} />
                ))}
              </div>
            </section>
          )}

          {archivedByDate.length > 0 && (
            <section>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100 mb-3">Archive</h3>
              <div className="space-y-2">
                {archivedByDate.map(({ dateKey, heading, vents: dateVents }) => {
                  const expanded = expandedDates[dateKey] ?? false
                  return (
                    <div
                      key={dateKey}
                      className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/30"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDate(dateKey)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {expanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className="font-medium text-slate-100 truncate">{heading}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-slate-500 flex-shrink-0 ml-3">
                          {dateVents.length} {dateVents.length === 1 ? 'vent' : 'vents'}
                        </span>
                      </button>

                      {expanded && (
                        <div className="p-3 space-y-3 border-t border-white/10">
                          {dateVents.map((vent) => (
                            <ProfileVentCard
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
            <p className="text-xs sm:text-sm text-slate-500 text-center py-6">
              No vents match the current view.
            </p>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your vents by text or mood tag..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-full border border-white/10
                  bg-slate-800/80 text-slate-100 placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[10rem]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-full border border-white/10
                    bg-slate-800/80 text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/40
                    [color-scheme:dark]"
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              {(searchQuery || filterDate) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="btn-glass inline-flex items-center gap-1.5 text-xs sm:text-sm py-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            {availableDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] sm:text-xs text-slate-500 self-center mr-1">
                  Quick dates:
                </span>
                {availableDates.slice(0, 6).map((dateKey) => (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setFilterDate(filterDate === dateKey ? '' : dateKey)}
                    className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors border ${
                      filterDate === dateKey
                        ? 'bg-sky-500/20 text-sky-100 border-sky-400/40'
                        : 'bg-slate-800/70 text-slate-300 border-white/10 hover:border-sky-400/25'
                    }`}
                  >
                    {formatDateHeading(`${dateKey}T12:00:00`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs sm:text-sm text-slate-400 mb-3">
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              {searchQuery && (
                <span>
                  {' '}
                  for &ldquo;<span className="text-slate-200">{searchQuery}</span>
                  &rdquo;
                </span>
              )}
              {filterDate && <span> on {formatDateHeading(`${filterDate}T12:00:00`)}</span>}
            </p>

            {searchResults.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs sm:text-sm">No vents match your search.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((vent) => (
                  <ProfileVentCard
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

      <EditVentModal
        isOpen={Boolean(editingVent)}
        vent={editingVent}
        onClose={() => setEditingVent(null)}
        onUpdated={(updated) => {
          onVentUpdated?.(updated)
          setEditingVent(null)
        }}
      />
    </div>
  )
}
