import { format, parseISO } from 'date-fns'

export function formatEventDate(dateString) {
  const date = parseISO(dateString)
  return format(date, 'EEEE, MMMM d, yyyy')
}

export function formatEventTime(dateString) {
  const date = parseISO(dateString)
  return format(date, 'h:mm a')
}

export function formatEventDateRange(startDate, endDate) {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const startStr = format(start, 'MMMM d')
  const endStr = format(end, 'd, yyyy')
  if (start.getMonth() === end.getMonth()) {
    return `${startStr}-${endStr}`
  }
  return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`
}

export function formatShortDate(dateString) {
  const date = parseISO(dateString)
  return format(date, 'MMM d, yyyy')
}
