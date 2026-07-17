import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUsernameAvailability } from '../hooks/useUsernameAvailability'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { MessageSquare, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export default function Auth() {
  const { isAuthenticated, signIn, signUp, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = useMemo(() => safeNextPath(searchParams.get('next')), [searchParams])
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    status: usernameStatus,
    message: usernameMessage,
    canUseUsername,
    isChecking: isCheckingUsername,
  } = useUsernameAvailability({
    username: formData.username,
    enabled: isSignUp,
  })

  if (isAuthenticated) {
    return <Navigate to={nextPath} replace />
  }

  const usernameInputClass = (() => {
    if (!isSignUp || !formData.username.trim()) return 'mt-1 input'
    if (usernameStatus === 'available') {
      return 'mt-1 input border-green-500 dark:border-green-500 focus:ring-green-500 focus:border-green-500'
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      return 'mt-1 input border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500'
    }
    return 'mt-1 input'
  })()

  const isSignUpDisabled =
    isSubmitting ||
    (isSignUp &&
      (!canUseUsername ||
        isCheckingUsername ||
        usernameStatus === 'taken' ||
        usernameStatus === 'invalid'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (isSignUp) {
        if (!formData.username.trim()) {
          throw new Error('Username is required')
        }

        const username = formData.username.trim()
        if (username.length < 3 || username.length > 30) {
          throw new Error('Username must be between 3 and 30 characters long')
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          throw new Error('Username can only contain letters, numbers, underscores, and hyphens')
        }
        if (!canUseUsername) {
          throw new Error(usernameMessage || 'Please choose a different username')
        }

        if (!formData.email.trim()) {
          throw new Error('Email is required')
        }

        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long')
        }

        await signUp(formData.username, formData.password, formData.email)
        navigate(nextPath, { replace: true })
      } else {
        if (!formData.username.trim()) {
          throw new Error('Username is required')
        }

        await signIn(formData.username, formData.password)
        navigate(nextPath, { replace: true })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    if (e.target.name === 'username') {
      setError('')
    }
  }

  const renderUsernameFeedback = () => {
    if (!isSignUp || !formData.username.trim()) return null

    if (isCheckingUsername) {
      return (
        <p className="mt-1.5 flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          Checking availability...
        </p>
      )
    }

    if (!usernameMessage) return null

    const isPositive = usernameStatus === 'available'

    return (
      <p
        className={`mt-1.5 flex items-center text-xs sm:text-sm${
          isPositive
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {isPositive ? (
          <CheckCircle2 className="w-4 h-4 mr-1.5 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
        )}
        {usernameMessage}
      </p>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-primary-600 dark:text-primary-400" />
          <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {isSignUp ? 'Join Vent Wall' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {isSignUp
              ? 'Create your account to start sharing'
              : 'Sign in to your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={formData.username}
                onChange={handleInputChange}
                className={usernameInputClass}
                placeholder={isSignUp ? 'Choose a username' : 'Enter your username'}
                aria-invalid={usernameStatus === 'taken' || usernameStatus === 'invalid'}
                aria-describedby={isSignUp ? 'username-feedback' : undefined}
              />
              <div id="username-feedback">{renderUsernameFeedback()}</div>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required={isSignUp}
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  placeholder="Email address"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-xs sm:text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSignUpDisabled}
              className="btn-primary w-full flex justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setFormData({ username: '', password: '', email: '' })
              }}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 text-xs sm:text-sm font-medium transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}