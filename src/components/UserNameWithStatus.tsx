interface UserNameWithStatusProps {
  username: string
  status?: string | null
  usernameClassName?: string
}

export default function UserNameWithStatus({
  username,
  status,
  usernameClassName = 'text-sm font-medium text-gray-900 dark:text-gray-100',
}: UserNameWithStatusProps) {
  const name = username.trim() || 'Anonymous'
  const trimmedStatus = status?.trim()

  return (
    <div>
      <p className={`${usernameClassName} break-words`}>{name}</p>
      {trimmedStatus && (
        <p className="mt-0.5 text-[11px] leading-snug text-gray-600 dark:text-gray-300 break-words">
          {trimmedStatus}
        </p>
      )}
    </div>
  )
}