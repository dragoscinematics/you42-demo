import { formatEventDateRange } from '../../utils/formatDate'

export default function EventHero({ event }) {
  const hasImage = !!event.imageUrl
  const bannerImage = event.bannerUrl || event.imageUrl

  return (
    <div className="relative w-full h-72 sm:h-96 overflow-hidden">
      {hasImage ? (
        <img
          src={bannerImage}
          alt={event.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a4e] via-[#1a3a5e] to-[#0a2a3e]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-you42-bg via-you42-bg/50 to-transparent" />

      <div className="relative z-10 h-full flex items-end">
        <div className="max-w-300 mx-auto px-4 sm:px-6 pb-8 w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
            {event.name}
          </h1>
          <p className="text-you42-text-secondary text-sm">
            {formatEventDateRange(event.startDate, event.endDate)}
            {event.venue && (
              <span> &middot; {event.venue.name}, {event.venue.city}, {event.venue.state}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
