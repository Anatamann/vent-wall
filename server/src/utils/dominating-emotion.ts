/**
 * Dominating emotion resolution for Vent Globe regions.
 *
 * Rules (locked):
 * 1. Count each mood tag attached to original vents (reactions ignored).
 * 2. Sort by count desc, then tag name asc (stable ties).
 * 3. Clear lead: top tag wins if it leads #2 by more than 10% of its own count:
 *      (c1 - c2) / c1 > 0.10
 * 4. Close race (margin ≤ 10%): look at the top 3 tags only ("cumulative"):
 *      - If any tag has a strict majority among the top-3 total (count > sum of the other two),
 *        that tag wins.
 *      - Otherwise the highest-count tag among top 3 wins (stable name tie-break).
 *
 * Minimum activity: callers may treat results with totalVents < MIN_VENTS_FOR_DOMINATING
 * as less reliable via `isReliable`. Emotion is still computed when any tags exist.
 */

import { MIN_VENTS_FOR_DOMINATING as MIN_VENTS } from '../constants.js'

export const DOMINATING_LEAD_MARGIN = 0.1

/** Re-export for API consumers. */
export const MIN_VENTS_FOR_DOMINATING = MIN_VENTS

export interface MoodTagCount {
  id: string
  name: string
  emoji: string
  color: string
  count: number
}

export interface DominatingEmotionResult {
  tag: MoodTagCount
  /** True when total vent count in the region meets MIN_VENTS_FOR_DOMINATING. */
  isReliable: boolean
  /** How the winner was chosen. */
  method: 'sole' | 'clear_lead' | 'top3_majority' | 'top3_plurality'
}

export function resolveDominatingEmotion(
  tagCounts: MoodTagCount[],
  totalVents: number
): DominatingEmotionResult | null {
  const sorted = [...tagCounts]
    .filter((t) => t.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name)
    })

  if (sorted.length === 0) return null

  const isReliable = totalVents >= MIN_VENTS_FOR_DOMINATING

  if (sorted.length === 1) {
    return { tag: sorted[0], isReliable, method: 'sole' }
  }

  const first = sorted[0]
  const second = sorted[1]
  const margin = (first.count - second.count) / first.count

  if (margin > DOMINATING_LEAD_MARGIN) {
    return { tag: first, isReliable, method: 'clear_lead' }
  }

  // Close race: cumulative decision among top 3
  const top3 = sorted.slice(0, 3)
  const sumTop3 = top3.reduce((sum, t) => sum + t.count, 0)

  for (const candidate of top3) {
    const others = sumTop3 - candidate.count
    if (candidate.count > others) {
      return { tag: candidate, isReliable, method: 'top3_majority' }
    }
  }

  // No majority within top 3 — plurality (highest count, already stable-sorted)
  return { tag: top3[0], isReliable, method: 'top3_plurality' }
}
