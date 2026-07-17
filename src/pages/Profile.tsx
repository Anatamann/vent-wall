import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
import PostDestinationChooser from '../components/PostDestinationChooser'
import ProfileWorldCupSection from '../components/worldcup/ProfileWorldCupSection'
import SupportPostModal from '../components/worldcup/SupportPostModal'
import { api } from '../lib/api'
import type { WorldCupSupport, WorldCupTeamId } from '../lib/types'
import { ArrowLeft, LayoutList, Globe2, Trophy } from 'lucide-react'
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
        <Link
          to="/worldcup"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium
            border border-white/10 bg-slate-800/70 text-slate-200 backdrop-blur-sm
            hover:border-sky-400/30 hover:bg-slate-700/80 transition-colors"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">World Cup Finals</span>
          <span className="sm:hidden">Finals</span>
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
  const [showPostChooser, setShowPostChooser] = useState(false)
  const [pickWcTeam, setPickWcTeam] = useState(false)
  const [wcPostTeam, setWcPostTeam] = useState<WorldCupTeamId | null>(null)
  const [postChooserError, setPostChooserError] = useState<string | null>(null)
  const [wcSupport, setWcSupport] = useState<WorldCupSupport | null>(null)
  const [wcWallPosts, setWcWallPosts] = useState<WorldCupSupport[]>([])
  const [wcVoteBound, setWcVoteBound] = useState(false)
  const [wcWallPostsToday, setWcWallPostsToday] = useState(0)
  const [wcMaxWallPosts, setWcMaxWallPosts] = useState(5)
  const [wcLoading, setWcLoading] = useState(true)

  // Match Vent Wall / Globe dark translucent shell
  useEffect(() => {
    document.body.classList.add('profile-view-active')
    return () => document.body.classList.remove('profile-view-active')
  }, [])

  const loadWorldCup = useCallback(async () => {
    if (!isAuthenticated) {
      setWcSupport(null)
      setWcWallPosts([])
      setWcLoading(false)
      return
    }
    setWcLoading(true)
    try {
      const me = await api.worldcup.me()
      setWcSupport(me.support)
      setWcWallPosts(me.wall_posts ?? [])
      setWcVoteBound(Boolean(me.vote_bound_to_account))
      setWcWallPostsToday(me.wall_posts_today ?? 0)
      setWcMaxWallPosts(me.max_wall_posts_per_day ?? 5)
    } catch {
      setWcSupport(null)
      setWcWallPosts([])
      setWcVoteBound(false)
      setWcWallPostsToday(0)
    } finally {
      setWcLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadWorldCup()
  }, [loadWorldCup])

  const closePostChooser = useCallback(() => {
    setShowPostChooser(false)
    setPickWcTeam(false)
    setPostChooserError(null)
  }, [])

  const handlePostClick = () => {
    if (!isAuthenticated) {
      navigate('/auth?next=' + encodeURIComponent('/profile'))
      return
    }
    setPostChooserError(null)
    setPickWcTeam(false)
    setShowPostChooser(true)
  }

  const openVentWallPost = () => {
    if (!canPost) {
      setPostChooserError('Vent Wall daily post limit reached. Try again tomorrow.')
      return
    }
    closePostChooser()
    // Next tick so chooser unmount doesn't fight modal mount
    window.setTimeout(() => setIsPostModalOpen(true), 0)
  }

  const openWorldCupPost = (teamId?: WorldCupTeamId) => {
    if (wcWallPostsToday >= wcMaxWallPosts) {
      setPostChooserError(
        `World Cup wall limit reached (${wcMaxWallPosts}/day). Try again tomorrow.`
      )
      return
    }
    const locked =
      wcSupport?.team_id === 'spain' || wcSupport?.team_id === 'argentina'
        ? (wcSupport.team_id as WorldCupTeamId)
        : null
    if (locked) {
      closePostChooser()
      window.setTimeout(() => setWcPostTeam(locked), 0)
      return
    }
    if (teamId) {
      closePostChooser()
      window.setTimeout(() => setWcPostTeam(teamId), 0)
      return
    }
    setPostChooserError(null)
    setPickWcTeam(true)
  }

  const handlePostCreated = useCallback(() => {
    void refresh()
    refreshPostLimits()
  }, [refresh, refreshPostLimits])

  const handleWcPosted = useCallback(() => {
    void loadWorldCup()
  }, [loadWorldCup])

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

      <ProfileWorldCupSection
        support={wcSupport}
        wallPosts={wcWallPosts}
        loading={wcLoading}
        voteBoundToAccount={wcVoteBound}
      />

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
        stacked
        ariaLabel="Create a post — Vent Wall or World Cup"
      />

      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <PostDestinationChooser
              open={showPostChooser}
              onClose={closePostChooser}
              canPostVent={canPost}
              wcPostsToday={wcWallPostsToday}
              wcMaxPosts={wcMaxWallPosts}
              wcTeamId={
                wcSupport?.team_id === 'spain' || wcSupport?.team_id === 'argentina'
                  ? wcSupport.team_id
                  : null
              }
              pickTeam={pickWcTeam}
              onPickTeamChange={(picking) => {
                setPickWcTeam(picking)
                setPostChooserError(null)
              }}
              onChooseVent={openVentWallPost}
              onChooseWorldCup={openWorldCupPost}
              error={postChooserError}
            />

            {isPostModalOpen ? (
              <PostModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                onPostCreated={handlePostCreated}
              />
            ) : null}

            {wcPostTeam ? (
              <SupportPostModal
                isOpen={Boolean(wcPostTeam)}
                teamId={wcPostTeam}
                onClose={() => setWcPostTeam(null)}
                onPosted={handleWcPosted}
              />
            ) : null}
          </>,
          document.body
        )}
    </div>
  )
}
