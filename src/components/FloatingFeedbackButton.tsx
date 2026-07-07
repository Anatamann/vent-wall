import { MessageSquarePlus } from 'lucide-react'

interface FloatingFeedbackButtonProps {
  onClick: () => void
  stacked?: boolean
}

export default function FloatingFeedbackButton({
  onClick,
  stacked = false,
}: FloatingFeedbackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed ${
        stacked ? 'bottom-24' : 'bottom-6'
      } right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-40 bg-white dark:bg-gray-800 border-2 border-primary-200 dark:border-primary-800 hover:border-primary-400 dark:hover:border-primary-500 hover:scale-110 active:scale-95`}
      aria-label="Send feedback"
    >
      <MessageSquarePlus className="w-6 h-6 text-primary-600 dark:text-primary-400 mx-auto" />
    </button>
  )
}