import { Link } from 'react-router-dom'
import { formatShortDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

export default function EventCard({ event }) {
  const hasImage = !!event.imageUrl
  const tickets = event.ticketTypes || []
  const prices = tickets.filter(t => t.isAvailable !== false && t.price > 0).map(t => t.allInPrice || t.price)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null

  return (
    <Link to={`/events/${event.slug}`} className="group block">
      {/* Image - no card wrapper, no border, no rounded corners - just like You42 content */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm mb-2">
        {hasImage ? (
          <img
            src={event.squareImageUrl || event.imageUrl}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2a1a4e] via-[#1a3a5e] to-[#1a2a3e]" />
        )}
        {event.status === 'SOLD_OUT' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-white/80 font-bold text-sm uppercase tracking-wider">Sold Out</span>
          </div>
        )}
      </div>

      {/* Text below image - You42 pattern: bold white title, gray subtitle */}
      <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 group-hover:text-you42-text-secondary transition-colors">
        {event.name}
      </h3>
      <p className="text-you42-text-secondary text-sm mt-0.5">
        {formatShortDate(event.startDate)}
        {event.venue && ` \u00B7 ${event.venue.city}, ${event.venue.state}`}
      </p>
      {minPrice !== null && (
        <p className="text-you42-text-muted text-sm mt-0.5">
          From {formatCurrency(minPrice)}
        </p>
      )}
    </Link>
  )
}
