import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getEventBySlug } from '../api/events'
import EventHero from '../components/events/EventHero'
import EventInfo from '../components/events/EventInfo'
import TicketSelector from '../components/events/TicketSelector'
import Spinner from '../components/ui/Spinner'

export default function EventPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setEvent(null)
    setError(null)

    getEventBySlug(slug)
      .then(found => { if (!cancelled) setEvent(found) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-you42-error text-lg font-semibold mb-2">Unable to load event</p>
          <p className="text-you42-text-secondary">{error}</p>
        </div>
      </div>
    )
  }

  const needsFullWidth = event.eventType === 'RESERVED_SEATING' || event.eventType === 'TIMED_ENTRY'

  return (
    <div>
      <EventHero event={event} />

      <div className="max-w-300 mx-auto px-4 sm:px-6 py-8">
        {needsFullWidth ? (
          <div className="space-y-10">
            <TicketSelector event={event} />
            <EventInfo event={event} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <EventInfo event={event} />
            </div>
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-20">
                <TicketSelector event={event} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
