import { cleanupExpiredMediaAssets } from '../utils/media-assets.js'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

export function startMediaCleanupJob(): void {
  const run = async () => {
    try {
      const removed = await cleanupExpiredMediaAssets()
      if (removed > 0) {
        console.log(`Media cleanup: removed ${removed} expired asset(s)`)
      }
    } catch (err) {
      console.error('Media cleanup failed:', err)
    }
  }

  run()
  setInterval(run, CLEANUP_INTERVAL_MS)
}