import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { Navigate, useNavigate } from 'react-router-dom'
import UsernameEditor from '../components/UsernameEditor'
import UserStats from '../components/UserStats'
import UserVentsList from '../components/UserVentsList'
import LoadingSpinner from '../components/LoadingSpinner'
import { ArrowLeft } from 'lucide-react'

function ProfilePageHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        onClick={onBack}
        className="btn-secondary inline-flex items-center gap-2 self-start"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Back to Home</span>
        <span className="sm:hidden">Back</span>
      </button>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
    </div>
  )
}

export default function Profile() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { 
    userProfile, 
    userVents, 
    userStats, 
    loading, 
    error, 
    updateUsername,
    deleteVent,
    setAvatarFromGif,
    removeAvatar,
    updateStatus,
  } = useUserProfile()

  // Wait for auth to finish loading
  if (authLoading) {
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" onBack={() => navigate('/')} />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Checking authentication...</span>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    console.log('Profile: User not authenticated, redirecting to auth')
    return <Navigate to="/auth" replace />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" onBack={() => navigate('/')} />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your profile...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" onBack={() => navigate('/')} />
        <div className="card text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Failed to load profile: {error}
          </p>
          <div className="flex justify-center space-x-3">
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Retry
            </button>
            <button 
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    console.log('Profile: No user profile found')
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" onBack={() => navigate('/')} />
        <div className="card text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            Profile not found. Please try signing out and signing back in.
          </p>
          <div className="flex justify-center space-x-3">
            <button 
              onClick={() => navigate('/auth')}
              className="btn-primary"
            >
              Sign In Again
            </button>
            <button 
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <ProfilePageHeader title="Your Profile" onBack={() => navigate('/')} />

      {/* Username Editor */}
      <UsernameEditor
        currentUsername={userProfile.username}
        currentStatus={userProfile.status}
        avatarUrl={userProfile.avatar_url}
        onUpdateUsername={updateUsername}
        onUpdateStatus={updateStatus}
        onSetAvatarFromGif={setAvatarFromGif}
        onRemoveAvatar={removeAvatar}
      />

      {/* User Stats */}
      {userStats && <UserStats stats={userStats} />}

      {/* User Vents List */}
      <UserVentsList
        vents={userVents}
        onDeleteVent={deleteVent}
        loading={loading}
      />
    </div>
  )
}