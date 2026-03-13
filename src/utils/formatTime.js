/**
 * Format a time string like "09:00" or "14:30" to "9 AM" or "2:30 PM"
 */
export function formatSlotTime(time) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * Calculate duration in hours between two HH:MM time strings.
 * Returns a number (e.g. 3 for "09:00" to "12:00", 1.5 for "09:00" to "10:30").
 */
export function calcDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em - sh * 60 - sm) / 60
}

/**
 * Format duration as a human-readable string.
 * e.g. 3 -> "3 hrs", 1 -> "1 hr", 1.5 -> "1.5 hrs"
 */
export function formatDuration(hours) {
  if (!hours || hours <= 0) return ''
  return `${hours} hr${hours !== 1 ? 's' : ''}`
}
