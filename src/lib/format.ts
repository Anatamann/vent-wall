import { VENT_CARD_PREVIEW_LENGTH } from './constants'

export function truncateVentContent(
  content: string,
  maxLength = VENT_CARD_PREVIEW_LENGTH
): { preview: string; isTruncated: boolean } {
  const trimmed = content.trim()
  if (!trimmed) {
    return { preview: '', isTruncated: false }
  }
  if (trimmed.length <= maxLength) {
    return { preview: trimmed, isTruncated: false }
  }

  const slice = trimmed.slice(0, maxLength)
  const lastSpace = slice.lastIndexOf(' ')
  const preview =
    lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice

  return { preview: `${preview}…`, isTruncated: true }
}