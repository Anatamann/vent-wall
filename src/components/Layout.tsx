import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, MessageSquare, Trophy, User, LogOut, LogIn } from 'lucide-react'
import FloatingFeedbackButton from './FloatingFeedbackButton'
import FeedbackModal from './FeedbackModal'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, isAuthenticated, profileExists, loading } = useAuth()
  const location = useLocation()
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const showFeedbackFab =
    isAuthenticated && location.pathname !== '/auth' && location.pathname !== '/admin'

  /** Prefer returning to current page after auth; default landing is World Cup. */
  const authHref = (fallbackNext = '/worldcup') => {
    const path = `${location.pathname}${location.search}`
    const next =
      path.startsWith('/auth') || path === '' ? fallbackNext : path
    return `/auth?next=${encodeURIComponent(next)}`
  }

  const handleFeedbackClick = () => {
    if (!isAuthenticated) {
      window.location.href = authHref('/worldcup')
      return
    }
    setIsFeedbackOpen(true)
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      window.location.href = authHref('/profile')
      return
    }

    if (!profileExists && !loading) {
      e.preventDefault()
      console.log('Profile does not exist, redirecting to auth')
      window.location.href = authHref('/profile')
      return
    }
  }

  return (
    <div className="globe-shell-root min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="globe-shell-header shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 min-w-0 gap-2">
            {/* Vent Wall + World Cup Finals — primary destinations side by side */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <Link
                to="/"
                title="Vent Wall"
                className={`flex items-center gap-1.5 sm:gap-2 min-w-0 shrink px-1.5 sm:px-2 py-1 rounded-lg transition-colors ${
                  location.pathname === '/' ||
                  location.pathname.startsWith('/post/')
                    ? 'bg-primary-100/80 dark:bg-primary-900/25'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/80'
                }`}
              >
                <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 dark:text-primary-400 shrink-0" />
                <span className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  Vent Wall
                </span>
              </Link>

              <span
                className="text-gray-300 dark:text-gray-600 select-none shrink-0"
                aria-hidden
              >
                |
              </span>

              <Link
                to="/worldcup"
                title="World Cup Finals 2026 — Spain vs Argentina"
                className={`flex items-center gap-1 sm:gap-1.5 shrink-0 max-w-[9.5rem] sm:max-w-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                  location.pathname.startsWith('/worldcup')
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Trophy className="w-4 h-4 sm:w-[1.125rem] sm:h-[1.125rem] shrink-0" />
                <span className="truncate">World Cup Finals</span>
              </Link>
            </div>

            {/* Account navigation */}
            <nav className="flex items-center gap-0.5 sm:gap-2 shrink-0" aria-label="Account">
              {isAuthenticated ? (
                <>
                  {user?.is_admin && (
                    <Link
                      to="/admin"
                      title="Admin"
                      className={`flex items-center gap-1 px-2 py-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        location.pathname === '/admin'
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={handleProfileClick}
                    title="Profile"
                    className={`flex items-center gap-1 px-2 py-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      location.pathname === '/profile'
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                  <button
                    onClick={signOut}
                    title="Sign Out"
                    className="flex items-center gap-1 px-2 py-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <Link
                  to={authHref('/worldcup')}
                  className="flex items-center gap-1 px-3 py-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Sign In</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="globe-shell-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 transition-[max-width] duration-300">
        {children}
      </main>

      {showFeedbackFab && (
        <>
          <FloatingFeedbackButton onClick={handleFeedbackClick} />
          <FeedbackModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
          />
        </>
      )}

      {/* Footer */}
      <footer className="globe-shell-footer bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>&copy; 2026 Vent Wall. A safe space for emotional expression.</p>
            <p className="text-[10px] sm:text-xs max-w-2xl mx-auto leading-relaxed">
              ISP region is derived from connection data solely to power the Global Mood Globe
              visualization when users choose to contribute. Approximate region only — never exact
              position. Raw IP is not stored on vents.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}