import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, MessageSquare, LayoutList, Globe2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AdminOverviewPanel from '../components/admin/AdminOverview'
import AdminFeedbackInbox from '../components/admin/AdminFeedbackInbox'

type AdminTab = 'overview' | 'feedback'

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')

  useEffect(() => {
    document.body.classList.add('admin-view-active')
    return () => document.body.classList.remove('admin-view-active')
  }, [])

  if (loading) {
    return null
  }

  if (!isAuthenticated || !user?.is_admin) {
    return <Navigate to="/" replace />
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-50">Admin</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">Signed in as {user.username}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-sky-500/15 text-sky-100 border border-sky-400/35'
                : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AdminOverviewPanel />}
      {tab === 'feedback' && <AdminFeedbackInbox />}
    </div>
  )
}
