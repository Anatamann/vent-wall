import { truncateVentContent } from '../lib/format'
import type { CommentAsset } from '../lib/types'
import MediaAttribution from './MediaAttribution'

interface VentContentDisplayProps {
  content: string
  asset?: CommentAsset
  compact?: boolean
  showReadMore?: boolean
  textClassName?: string
}

export default function VentContentDisplay({
  content,
  asset,
  compact = false,
  showReadMore = false,
  textClassName = 'text-gray-800 dark:text-gray-200 leading-relaxed',
}: VentContentDisplayProps) {
  const trimmed = content.trim()
  const { preview, isTruncated } = truncateVentContent(trimmed)
  const hasText = trimmed.length > 0
  const hasAsset = Boolean(asset?.url)

  if (!hasText && !hasAsset) {
    return null
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {hasAsset && (
        <div className={compact ? '' : 'flex justify-center'}>
          <img
            src={asset!.url}
            alt="GIF attachment"
            className={`rounded-lg object-contain ${
              compact ? 'max-h-32 max-w-full' : 'max-h-80 max-w-full'
            }`}
            loading="lazy"
          />
        </div>
      )}

      {hasText && (
        <p
          className={`${textClassName} ${
            compact ? 'text-sm line-clamp-3 whitespace-pre-wrap break-words' : 'text-lg whitespace-pre-wrap break-words'
          }`}
        >
          {compact ? preview : trimmed}
        </p>
      )}

      {showReadMore && isTruncated && (
        <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
          Read full post →
        </p>
      )}

      {hasAsset && !compact && <MediaAttribution />}
    </div>
  )
}