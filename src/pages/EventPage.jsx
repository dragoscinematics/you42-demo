import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getEvents } from '../api/events'
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
    async function fetchEvent() {
      try {
        const events = await getEvents()
        const found = events.find(e => e.slug === slug)
        if (found) {
          setEvent(found)
        } else {
          setError('Event not found')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
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

  const isReservedSeating = event.eventType === 'RESERVED_SEATING'

  return (
    <div>
      <EventHero event={event} />

      <div className="max-w-300 mx-auto px-4 sm:px-6 py-8">
        {isReservedSeating ? (
          // Reserved seating: seat map needs full width, details below
          <div className="space-y-10">
            <TicketSelector event={event} />
            <EventInfo event={event} />
          </div>
        ) : (
          // Standard: side-by-side layout
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
