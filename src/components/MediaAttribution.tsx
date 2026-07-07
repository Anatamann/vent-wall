import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function MediaAttribution() {
  const [disclaimer, setDisclaimer] = useState<string | null>(null)

  useEffect(() => {
    api.media
      .gifDisclaimer()
      .then((data) => setDisclaimer(data.disclaimer))
      .catch(() => {
        setDisclaimer(
          'GIFs are shown temporarily in comments while a post is on the Wall and are removed after 24 hours.'
        )
      })
  }, [])

  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
      <span className="font-medium text-gray-600 dark:text-gray-300">Powered by KLIPY</span>
      {' · '}
      {disclaimer}
      {' '}
      <a
        href="https://klipy.com/support/api-terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-primary-600 dark:hover:text-primary-400"
      >
        KLIPY Terms
      </a>
    </p>
  )
}