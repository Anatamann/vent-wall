import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, MessageSquare, User, LogOut, LogIn } from 'lucide-react'
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

  const handleFeedbackClick = () => {
    if (!isAuthenticated) {
      window.location.href = '/auth'
      return
    }
    setIsFeedbackOpen(true)
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      window.location.href = '/auth'
      return
    }
    
    if (!profileExists && !loading) {
      e.preventDefault()
      console.log('Profile does not exist, redirecting to auth')
      window.location.href = '/auth'
      return
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="globe-shell-header bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 min-w-0 gap-2">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 dark:text-primary-400 shrink-0" />
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                Vent Wall
              </span>
            </Link>

            {/* Navigation — icon-only on mobile */}
            <nav className="flex items-center gap-0.5 sm:gap-2 shrink-0">
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
                  to="/auth"
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
          <FloatingFeedbackButton
            onClick={handleFeedbackClick}
            stacked={location.pathname === '/'}
          />
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
            <p>&copy; 2024 Vent Wall. A safe space for emotional expression.</p>
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