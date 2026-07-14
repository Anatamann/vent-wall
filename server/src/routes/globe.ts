import { Router } from 'express'
import { isPublicId } from '../utils/validation.js'
import {
  fetchGlobeRegions,
  fetchGlobeVentsForMood,
  fetchGlobeVentsForRegion,
  parseHoursParam,
} from '../utils/globe.js'
import { MIN_VENTS_FOR_DOMINATING } from '../utils/dominating-emotion.js'

const router = Router()

/**
 * GET /api/globe/data?hours=24
 * Aggregated state-level mood points for the Vent Globe.
 */
router.get('/data', async (req, res) => {
  try {
    const hours = parseHoursParam(req.query.hours)
    const regions = await fetchGlobeRegions(hours)

    return res.json({
      hours,
      minVentsForReliable: MIN_VENTS_FOR_DOMINATING,
      regions,
      activeCount: regions.filter((r) => !r.isEmpty).length,
      emptyCount: regions.filter((r) => r.isEmpty).length,
    })
  } catch (err) {
    console.error('Globe data error:', err)
    return res.status(500).json({ error: 'Failed to load globe data' })
  }
})

/**
 * GET /api/globe/regions/:regionKey/vents?hours=24
 * Vents for a state/country region (last N hours, contribute_to_globe only).
 */
router.get('/regions/:regionKey/vents', async (req, res) => {
  try {
    const regionKey = decodeURIComponent(req.params.regionKey || '')
    if (!regionKey || !regionKey.includes(':')) {
      return res.status(400).json({ error: 'Invalid region key' })
    }

    const hours = parseHoursParam(req.query.hours)
    const data = await fetchGlobeVentsForRegion(regionKey, hours)
    return res.json({ hours, ...data })
  } catch (err) {
    console.error('Globe region vents error:', err)
    return res.status(500).json({ error: 'Failed to load region vents' })
  }
})

/**
 * GET /api/globe/moods/:tagId/vents?hours=24
 * On-Wall vents with this mood tag (last N hours). Location / globe opt-in not required.
 */
router.get('/moods/:tagId/vents', async (req, res) => {
  try {
    const tagId = req.params.tagId
    if (!isPublicId(tagId)) {
      return res.status(400).json({ error: 'Invalid mood tag id' })
    }

    const hours = parseHoursParam(req.query.hours)
    const data = await fetchGlobeVentsForMood(tagId, hours)
    if (!data.tagName) {
      return res.status(404).json({ error: 'Mood tag not found' })
    }

    return res.json({ hours, ...data })
  } catch (err) {
    console.error('Globe mood vents error:', err)
    return res.status(500).json({ error: 'Failed to load mood vents' })
  }
})

export default router
