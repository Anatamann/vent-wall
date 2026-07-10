import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { api } from '../lib/api'
import type { KlipyGifItem } from '../lib/types'
import MediaAttribution from './MediaAttribution'

interface GifPickerProps {
  onGifSelect: (gif: KlipyGifItem) => void
  onClose: () => void
  isOpen: boolean
}

export default function GifPicker({ onGifSelect, onClose, isOpen }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<KlipyGifItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await api.media.searchGifs({
          q: query.trim() || undefined,
          per_page: 20,
        })
        setItems(result.items)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load GIFs'
        setError(message)
        setItems([])
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [isOpen, query])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="input pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading GIFs...
            </div>
          )}

          {!loading && error && (
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 text-center py-8">{error}</p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No GIFs found. Try another search.
            </p>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => {
                    onGifSelect(gif)
                    onClose()
                  }}
                  className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-gray-100 dark:bg-gray-900"
                  title={gif.title || 'GIF'}
                >
                  <img
                    src={gif.previewUrl}
                    alt={gif.title || 'GIF preview'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <MediaAttribution />
        </div>
      </div>
    </>
  )
}