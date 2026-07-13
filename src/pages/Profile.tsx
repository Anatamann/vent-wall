import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { usePostLimits } from '../hooks/usePostLimits'
import { Navigate, useNavigate } from 'react-router-dom'
import UsernameEditor from '../components/UsernameEditor'
import UserStats from '../components/UserStats'
import UserVentsList from '../components/UserVentsList'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingPostButton from '../components/FloatingPostButton'
import PostModal from '../components/PostModal'
import { ArrowLeft, LayoutList, Globe2 } from 'lucide-react'
import { Link } from 'react-router-dom'

function ProfilePageHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Link
          to="/?view=wall"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium
            border border-white/10 bg-slate-800/70 text-slate-200 backdrop-blur-sm
            hover:border-sky-400/30 hover:bg-slate-700/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <LayoutList className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vent Wall</span>
          <span className="sm:hidden">Wall</span>
        </Link>
        <Link
          to="/?view=globe"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium
            border border-white/10 bg-slate-800/70 text-slate-200 backdrop-blur-sm
            hover:border-sky-400/30 hover:bg-slate-700/80 transition-colors"
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vent Globe</span>
          <span className="sm:hidden">Globe</span>
        </Link>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-50">{title}</h1>
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
    refresh,
  } = useUserProfile()
  const { canPost, refresh: refreshPostLimits } = usePostLimits()
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)

  // Match Vent Wall / Globe dark translucent shell
  useEffect(() => {
    document.body.classList.add('profile-view-active')
    return () => document.body.classList.remove('profile-view-active')
  }, [])

  const handlePostClick = () => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    setIsPostModalOpen(true)
  }

  const handlePostCreated = useCallback(() => {
    void refresh()
    refreshPostLimits()
  }, [refresh, refreshPostLimits])

  if (authLoading) {
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-slate-400">Checking authentication...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-slate-400">Loading your profile...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" />
        <div className="glass-panel text-center py-8 px-4">
          <p className="text-red-400 mb-4">Failed to load profile: {error}</p>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Retry
            </button>
            <button type="button" onClick={() => navigate('/')} className="btn-glass">
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <ProfilePageHeader title="Profile" />
        <div className="glass-panel text-center py-8 px-4">
          <p className="text-slate-400 mb-4">
            Profile not found. Please try signing out and signing back in.
          </p>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => navigate('/auth')} className="btn-primary">
              Sign In Again
            </button>
            <button type="button" onClick={() => navigate('/')} className="btn-glass">
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <ProfilePageHeader title="Your Profile" />

      <UsernameEditor
        currentUsername={userProfile.username}
        currentStatus={userProfile.status}
        avatarUrl={userProfile.avatar_url}
        onUpdateUsername={updateUsername}
        onUpdateStatus={updateStatus}
        onSetAvatarFromGif={setAvatarFromGif}
        onRemoveAvatar={removeAvatar}
      />

      {userStats && <UserStats stats={userStats} />}

      <UserVentsList
        vents={userVents}
        onDeleteVent={deleteVent}
        onVentUpdated={() => {
          void refresh()
        }}
        loading={loading}
      />

      <FloatingPostButton
        onClick={handlePostClick}
        disabled={isAuthenticated && !canPost}
        stacked
      />
      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}
