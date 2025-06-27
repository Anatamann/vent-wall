import React, { useState } from 'react'
import { Flag, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface ContentModerationToolsProps {
  ventId: string
  ventContent: string
  onContentHidden?: () => void
}

export default function ContentModerationTools({ 
  ventId, 
  ventContent, 
  onContentHidden 
}: ContentModerationToolsProps) {
  const { user } = useAuth()
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  const reportReasons = [
    'Spam or repetitive content',
    'Harassment or bullying',
    'Inappropriate content',
    'False information',
    'Hate speech',
    'Self-harm content',
    'Other'
  ]

  const handleReport = async () => {
    if (!user || !reportReason) return

    try {
      setIsSubmitting(true)

      // In a real app, this would go to a moderation queue
      // For now, we'll store it in a simple reports table structure
      const reportData = {
        vent_id: ventId,
        reporter_id: user.id,
        reason: reportReason,
        details: reportDetails,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      // Log the report (in production, this would be stored in a reports table)
      console.log('Content reported:', reportData)

      // Show success message
      alert('Thank you for your report. Our moderation team will review this content.')
      
      setShowReportModal(false)
      setReportReason('')
      setReportDetails('')
    } catch (error) {
      console.error('Failed to submit report:', error)
      alert('Failed to submit report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHideContent = () => {
    setIsHidden(true)
    onContentHidden?.()
  }

  if (isHidden) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
        <EyeOff className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Content hidden by user preference
        </p>
        <button
          onClick={() => setIsHidden(false)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          Show content
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Report Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Report content"
        >
          <Flag className="w-3 h-3" />
          <span>Report</span>
        </button>

        <button
          onClick={handleHideContent}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          title="Hide content"
        >
          <EyeOff className="w-3 h-3" />
          <span>Hide</span>
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Report Content
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Help us keep the community safe
                  </p>
                </div>
              </div>

              {/* Content Preview */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {ventContent}
                </p>
              </div>

              {/* Report Reason */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Why are you reporting this content?
                </label>
                <div className="space-y-2">
                  {reportReasons.map((reason) => (
                    <label key={reason} className="flex items-center">
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason}
                        checked={reportReason === reason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {reason}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Provide any additional context..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason || isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}