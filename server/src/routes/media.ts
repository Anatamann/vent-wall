import { Router } from 'express'
import { pipeline } from 'stream/promises'
import { isKlipyConfigured, searchKlipyGifs } from '../providers/klipy.js'
import { requireAuth } from '../middleware/auth.js'
import {
  getMediaAsset,
  openMediaReadStream,
} from '../utils/media-assets.js'
import { isPublicId } from '../utils/validation.js'

const router = Router()

router.get('/gifs/search', requireAuth, async (req, res) => {
  if (!isKlipyConfigured()) {
    return res.status(503).json({
      error: 'GIF search is not configured. Add KLIPY_API_KEY to server/.env',
    })
  }

  try {
    const queryText = String(req.query.q || '').trim()
    const page = Math.max(1, Number(req.query.page || 1))
    const perPage = Math.min(30, Math.max(8, Number(req.query.per_page || 20)))

    const result = await searchKlipyGifs({
      query: queryText || undefined,
      page,
      perPage,
    })

    return res.json({
      items: result.items,
      page: result.page,
      per_page: result.perPage,
      has_next: result.hasNext,
      attribution: 'Powered by KLIPY',
    })
  } catch (err) {
    console.error('GIF search error:', err)
    return res.status(502).json({ error: 'Failed to search GIFs' })
  }
})

router.get('/assets/:id', async (req, res) => {
  if (!isPublicId(req.params.id)) {
    return res.status(404).json({ error: 'Media not found' })
  }

  try {
    const asset = await getMediaAsset(req.params.id)
    if (!asset) {
      return res.status(404).json({ error: 'Media not found' })
    }

    if (new Date(asset.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Media expired' })
    }

    res.setHeader('Content-Type', asset.mime_type)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    await pipeline(openMediaReadStream(asset.file_path), res)
  } catch (err) {
    console.error('Serve media error:', err)
    if (!res.headersSent) {
      return res.status(404).json({ error: 'Media not found' })
    }
  }
})

router.get('/legal/gif-disclaimer', (_req, res) => {
  return res.json({
    provider: 'KLIPY',
    ads_enabled: false,
    disclaimer:
      'GIFs are provided via KLIPY for short-term display in comments while a post is on the Wall. ' +
      'Vent Wall caches GIFs temporarily (up to 24 hours) for reliability and removes them when the post leaves the Wall. ' +
      'GIFs remain the property of their respective creators and KLIPY partners. ' +
      'Do not redistribute cached GIFs outside this app.',
    terms_url: 'https://klipy.com/support/api-terms',
    privacy_url: 'https://klipy.com/support/privacy-policy',
  })
})

export default router