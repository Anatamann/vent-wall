import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, MessageSquare } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AdminOverviewPanel from '../components/admin/AdminOverview'
import AdminFeedbackInbox from '../components/admin/AdminFeedbackInbox'

type AdminTab = 'overview' | 'feedback'

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')

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
          <Link to="/" className="btn-secondary inline-flex items-center gap-2 self-start">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Back
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Admin</h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Signed in as {user.username}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs sm:text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-300 border border-b-0 border-gray-200 dark:border-gray-700 -mb-[1px]'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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