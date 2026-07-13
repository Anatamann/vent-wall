interface ViewSwitcherProps {
  view: 'wall' | 'globe'
  onChange: (view: 'wall' | 'globe') => void
  /** Match concept UI: light chrome on wall, dark chrome on globe */
  variant?: 'light' | 'dark'
}

export default function ViewSwitcher({
  view,
  onChange,
  variant = 'light',
}: ViewSwitcherProps) {
  const dark = variant === 'dark'

  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Switch between Vent Wall and Vent Globe"
        className={`inline-flex items-center gap-1 rounded-full p-1 ${
          dark
            ? 'bg-slate-800/80 border border-white/10 shadow-[0_0_24px_rgba(56,189,248,0.08)]'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm'
        }`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === 'wall'}
          onClick={() => onChange('wall')}
          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
            view === 'wall'
              ? dark
                ? 'bg-white text-slate-900 shadow-sm'
                : 'bg-primary-600 dark:bg-primary-500 text-white shadow-sm'
              : dark
                ? 'text-slate-300 hover:text-white hover:bg-white/5'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Vent Wall
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'globe'}
          onClick={() => onChange('globe')}
          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
            view === 'globe'
              ? dark
                ? 'bg-white text-slate-900 shadow-sm'
                : 'bg-primary-600 dark:bg-primary-500 text-white shadow-sm'
              : dark
                ? 'text-slate-300 hover:text-white hover:bg-white/5'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Vent Globe{view === 'globe' ? ' →' : ' 🌍'}
        </button>
      </div>
    </div>
  )
}
