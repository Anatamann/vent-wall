import { useEffect, useState } from 'react'
import { X, MessageSquarePlus } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import LoadingSpinner from './LoadingSpinner'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [tagRequest, setTagRequest] = useState('')
  const [message, setMessage] = useState('')
  const [submittedToday, setSubmittedToday] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let active = true
    setLoadingStatus(true)
    setError(null)
    setSuccess(false)

    api.feedback
      .status()
      .then((data) => {
        if (!active) return
        setSubmittedToday(data.submitted_today)
      })
      .catch(() => {
        if (!active) return
        setSubmittedToday(false)
      })
      .finally(() => {
        if (active) setLoadingStatus(false)
      })

    return () => {
      active = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setTagRequest('')
      setMessage('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittedToday || !message.trim()) return

    try {
      setIsSubmitting(true)
      setError(null)
      await api.feedback.submit({
        tag_request: tagRequest.trim(),
        message: message.trim(),
      })
      setSuccess(true)
      setSubmittedToday(true)
      setTagRequest('')
      setMessage('')
    } catch (err: unknown) {
      const text = err instanceof ApiError ? err.message : 'Failed to send feedback'
      setError(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2
              id="feedback-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Send Feedback
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close feedback"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Request a mood tag or share ideas for Vent Wall. One message per day.
          </p>

          {loadingStatus ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {submittedToday && !success && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 mb-4">
                  You already sent feedback today. Come back tomorrow.
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-200 mb-4">
                  Thanks — your feedback was sent to the team.
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="tag-request"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Tag request
                  </label>
                  <input
                    id="tag-request"
                    type="text"
                    value={tagRequest}
                    onChange={(e) => setTagRequest(e.target.value)}
                    placeholder="e.g. Grateful, Burnout, Hopeful..."
                    maxLength={80}
                    disabled={submittedToday || isSubmitting}
                    className="input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedback-message"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share feedback or ideas for the platform..."
                    rows={4}
                    maxLength={1000}
                    disabled={submittedToday || isSubmitting}
                    className="input resize-y min-h-[6rem]"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submittedToday || isSubmitting || !message.trim()}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}