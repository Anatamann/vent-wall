import { useEffect, useState } from 'react'
import { Image, X } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import type { KlipyGifItem, WorldCupTeamId } from '../../lib/types'
import GifPicker from '../GifPicker'
import LoadingSpinner from '../LoadingSpinner'
import TeamChip from './TeamChip'

interface SupportPostModalProps {
  isOpen: boolean
  teamId: WorldCupTeamId
  onClose: () => void
  onPosted: () => void
}

const TEAMS: Record<
  WorldCupTeamId,
  { id: WorldCupTeamId; name: string; emoji: string; color: string }
> = {
  spain: { id: 'spain', name: 'Spain', emoji: '🇪🇸', color: '#C60B1E' },
  argentina: { id: 'argentina', name: 'Argentina', emoji: '🇦🇷', color: '#74ACDF' },
}

export default function SupportPostModal({
  isOpen,
  teamId,
  onClose,
  onPosted,
}: SupportPostModalProps) {
  const team = TEAMS[teamId]
  const [content, setContent] = useState('')
  const [selectedGif, setSelectedGif] = useState<KlipyGifItem | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [contributeToGlobe, setContributeToGlobe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setContent('')
      setSelectedGif(null)
      setShowGifPicker(false)
      setContributeToGlobe(true)
      setError('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed && !selectedGif) {
      setError('Add text, a GIF, or both')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await api.worldcup.publish({
        team_id: teamId,
        content: trimmed || undefined,
        gif_id: selectedGif?.id,
        contribute_to_globe: contributeToGlobe,
      })
      onPosted()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to publish support')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitTone =
    teamId === 'spain'
      ? 'bg-worldcup-spain-soft text-worldcup-spain-text border border-[rgba(198,11,30,0.45)] hover:bg-[rgba(198,11,30,0.28)]'
      : 'bg-worldcup-argentina-soft text-worldcup-argentina-text border border-[rgba(116,172,223,0.45)] hover:bg-[rgba(116,172,223,0.28)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wc-post-title"
        className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900/85 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="wc-post-title" className="text-base sm:text-lg font-semibold text-slate-50">
              You&apos;re supporting {team.name}
            </h2>
            <div className="mt-2">
              <TeamChip team={team} selected static />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Why this team? (optional if you add a GIF)"
            className="w-full rounded-xl bg-slate-800/80 border border-white/10 text-slate-100 text-sm p-3
              placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
          />

          {selectedGif && (
            <div className="relative rounded-lg overflow-hidden border border-white/10">
              <img src={selectedGif.previewUrl || selectedGif.gifUrl} alt="" className="w-full max-h-48 object-cover" />
              <button
                type="button"
                onClick={() => setSelectedGif(null)}
                className="absolute top-2 right-2 rounded-full bg-slate-900/80 p-1 text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowGifPicker(true)}
            className="btn-glass gap-2"
          >
            <Image className="w-4 h-4" />
            {selectedGif ? 'Change GIF' : 'Add GIF'}
          </button>

          <div className="rounded-xl bg-slate-800/40 border border-white/5 p-3 space-y-2">
            <p className="text-[11px] text-slate-500 leading-snug">
              Approximate location from your connection (ISP) may be used to place this support on
              the Support Globe. We never store your exact GPS position. Votes are approximate by
              region.
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={contributeToGlobe}
                onChange={(e) => setContributeToGlobe(e.target.checked)}
                className="rounded border-white/20 bg-slate-800 text-sky-500 focus:ring-sky-400/40"
              />
              Show my support on the Support Globe
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-glass">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 disabled:opacity-60 ${submitTone}`}
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Post support'}
            </button>
          </div>
        </form>

        <GifPicker
          isOpen={showGifPicker}
          onGifSelect={(gif) => {
            setSelectedGif(gif)
            setShowGifPicker(false)
          }}
          onClose={() => setShowGifPicker(false)}
        />
      </div>
    </div>
  )
}
