interface UserNameWithStatusProps {
  username: string
  status?: string | null
  usernameClassName?: string
}

export default function UserNameWithStatus({
  username,
  status,
  usernameClassName = 'text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100',
}: UserNameWithStatusProps) {
  const name = username.trim() || 'Anonymous'
  const trimmedStatus = status?.trim()

  return (
    <div className="min-w-0">
      <p className={`${usernameClassName} truncate`}>{name}</p>
      {trimmedStatus && (
        <p className="mt-0.5 text-[11px] sm:text-sm leading-snug text-gray-600 dark:text-gray-300 truncate">
          {trimmedStatus}
        </p>
      )}
    </div>
  )
}