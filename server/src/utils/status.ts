export const MAX_STATUS_LENGTH = 30
const STATUS_TEXT_REGEX = /^[a-zA-Z0-9 ]+$/

export function normalizeStatus(value: string): string {
  return value.trim()
}

export function validateStatusFormat(status: string): {
  valid: boolean
  error?: string
} {
  if (!status) {
    return { valid: true }
  }

  if (status.length > MAX_STATUS_LENGTH) {
    return { valid: false, error: `Status must be ${MAX_STATUS_LENGTH} characters or less` }
  }

  if (!STATUS_TEXT_REGEX.test(status)) {
    return {
      valid: false,
      error: 'Status can only contain letters, numbers, and spaces',
    }
  }

  return { valid: true }
}