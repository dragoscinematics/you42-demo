import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../api/events'
import { formatShortDate } from '../utils/formatDate'
import { formatCurrency } from '../utils/formatCurrency'
import { ALLOWED_EVENT_SLUGS } from '../config/constants'
import EventCard from '../components/events/EventCard'
import Spinner from '../components/ui/Spinner'

export default function EventsListPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await getEvents()
        const sorted = data
          .filter(e => ALLOWED_EVENT_SLUGS.includes(e.slug))
          .filter(e => e.status === 'ON_SALE' || e.status === 'PUBLISHED')
          .sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1
            if (!a.isFeatured && b.isFeatured) return 1
            return new Date(a.startDate) - new Date(b.startDate)
          })
        setEvents(sorted)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-you42-error text-lg font-semibold mb-2">Unable to load events</p>
          <p className="text-you42-text-secondary">{error}</p>
        </div>
      </div>
    )
  }

  const featured = events.filter(e => e.isFeatured)
  const rest = events.filter(e => !e.isFeatured)

  // Pick the first featured event for the hero spotlight
  const spotlight = featured[0]
  const spotlightImage = spotlight?.bannerUrl || spotlight?.imageUrl
  const hasSpotlightImage = !!spotlightImage
  const remainingFeatured = featured.slice(1)

  return (
    <div>
      {/* Hero spotlight - large featured event like You42's hero carousel */}
      {spotlight && (
        <Link to={`/events/${spotlight.slug}`} className="block relative group">
          <div className="relative w-full h-[300px] sm:h-[400px] overflow-hidden">
            {hasSpotlightImage ? (
              <img
                src={spotlightImage}
                alt={spotlight.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#2a1a4e] via-[#1a3a5e] to-[#0a2a3e]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-you42-bg via-you42-bg/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
              <div className="max-w-300 mx-auto">
                <p className="text-you42-blue text-sm font-semibold mb-2 uppercase tracking-wide">Featured Event</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{spotlight.name}</h2>
                <p className="text-you42-text-secondary text-sm">
                  {formatShortDate(spotlight.startDate)}
                  {spotlight.venue && ` \u00B7 ${spotlight.venue.name}, ${spotlight.venue.city}, ${spotlight.venue.state}`}
                </p>
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="max-w-300 mx-auto px-4 sm:px-6">
        {/* Live Events section - You42 pattern: big bold header + thin rule + sub-header + grid */}
        <section className="py-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Live Events</h1>
          <div className="border-b border-you42-border mt-3 mb-2" />

          {/* Featured sub-section */}
          {remainingFeatured.length > 0 && (
            <>
              <h2 className="font-bold text-white text-base mb-5">Featured</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-6 mb-10">
                {remainingFeatured.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}

          {/* All events sub-section */}
          {rest.length > 0 && (
            <>
              <h2 className="font-bold text-white text-base mb-5">Upcoming</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-6">
                {rest.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}

          {events.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white text-lg font-semibold mb-2">No events available</p>
              <p className="text-you42-text-secondary text-sm">Check back soon for upcoming events.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
