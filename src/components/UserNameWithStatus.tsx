interface UserNameWithStatusProps {
  username: string
  status?: string | null
  usernameClassName?: string
  statusClassName?: string
}

export default function UserNameWithStatus({
  username,
  status,
  usernameClassName = 'text-xs sm:text-sm font-medium text-slate-100',
  statusClassName = 'mt-0.5 text-[11px] sm:text-sm leading-snug text-slate-400 truncate',
}: UserNameWithStatusProps) {
  const name = username.trim() || 'Anonymous'
  const trimmedStatus = status?.trim()

  return (
    <div className="min-w-0">
      <p className={`${usernameClassName} truncate`}>{name}</p>
      {trimmedStatus && <p className={statusClassName}>{trimmedStatus}</p>}
    </div>
  )
}