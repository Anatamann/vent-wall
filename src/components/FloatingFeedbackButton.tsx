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
        stacked ? 'bottom-[4.25rem] sm:bottom-24' : 'bottom-4 sm:bottom-6'
      } right-3 sm:right-6 w-11 h-11 sm:w-14 sm:h-14 rounded-full shadow-md sm:shadow-lg transition-all duration-300 z-40 bg-white dark:bg-gray-800 border-2 border-primary-200 dark:border-primary-800 hover:border-primary-400 dark:hover:border-primary-500 hover:scale-110 active:scale-95`}
      aria-label="Send feedback"
    >
      <MessageSquarePlus className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400 mx-auto" />
    </button>
  )
}