interface UserAvatarProps {
  username: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs sm:text-sm',
  md: 'w-10 h-10 text-sm sm:text-base',
  lg: 'w-16 h-16 text-lg sm:text-xl',
}

export default function UserAvatar({
  username,
  avatarUrl,
  size = 'sm',
  className = '',
}: UserAvatarProps) {
  const initial = username?.charAt(0).toUpperCase() || 'A'
  const dimensions = sizeClasses[size]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${username}'s profile`}
        className={`${dimensions} rounded-full object-cover bg-gray-200 dark:bg-gray-700 flex-shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${dimensions} bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <span className="text-white font-medium">{initial}</span>
    </div>
  )
}