import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export type UsernameAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'

interface UseUsernameAvailabilityOptions {
  username: string
  enabled?: boolean
  debounceMs?: number
}

export function useUsernameAvailability({
  username,
  enabled = true,
  debounceMs = 400,
}: UseUsernameAvailabilityOptions) {
  const [status, setStatus] = useState<UsernameAvailabilityStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setMessage(null)
      return
    }

    const trimmed = username.trim()
    if (!trimmed) {
      setStatus('idle')
      setMessage(null)
      return
    }

    setStatus('checking')
    setMessage(null)

    const timer = window.setTimeout(async () => {
      try {
        const result = await api.auth.checkUsername(trimmed)
        if (result.available) {
          setStatus('available')
          setMessage('Username is available')
        } else if (result.reason === 'This username is already taken') {
          setStatus('taken')
          setMessage(result.reason)
        } else {
          setStatus('invalid')
          setMessage(result.reason || 'Invalid username')
        }
      } catch {
        setStatus('idle')
        setMessage(null)
      }
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [username, enabled, debounceMs])

  const canUseUsername = status === 'available'

  return {
    status,
    message,
    canUseUsername,
    isChecking: status === 'checking',
  }
}