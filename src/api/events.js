import { api } from './client'
import { API_BASE_URL, API_KEY } from '../config/constants'

export async function getEvents() {
  const data = await api.get('/events/public', { includeTickets: 'true' })
  return data.events
}

export async function getEvent(id) {
  const data = await api.get(`/events/${id}`)
  return data.event
}

export async function getEventBySlug(slug) {
  const data = await api.get('/events/public', { includeTickets: 'true' })
  const found = data.events?.find(e => e.slug === slug)
  if (!found) throw new Error('Event not found')
  return found
}

export async function getAvailableDates(eventId, from, to) {
  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  const data = await api.get(`/events/${eventId}/available-dates`, params)
  return data.dates
}

export async function getAvailableSlots(eventId, date) {
  const data = await api.get(`/events/${eventId}/available-slots`, { date })
  return data.slots
}

export async function getSeatMap(eventId) {
  const data = await api.get(`/events/${eventId}/seat-map`)
  return data.data
}

export async function getSeatMapSvg(eventId) {
  const res = await fetch(`${API_BASE_URL}/events/${eventId}/seat-map/svg`, {
    headers: { 'X-API-Key': API_KEY },
  })
  if (!res.ok) throw new Error('Failed to load seat map SVG')
  return res.text()
}
