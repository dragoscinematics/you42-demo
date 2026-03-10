import { formatEventDate, formatEventTime } from '../../utils/formatDate'

export default function EventInfo({ event }) {
  const descriptionHtml = event.description || ''
  const isHtml = descriptionHtml.includes('<')

  return (
    <div>
      {/* Description */}
      <section className="mb-8">
        {isHtml ? (
          <div
            className="text-you42-text-secondary text-sm leading-relaxed
              [&_h1]:text-white [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4
              [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4
              [&_h3]:text-white [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3
              [&_p]:mb-3 [&_p]:text-you42-text-secondary
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
              [&_li]:text-you42-text-secondary
              [&_strong]:text-white [&_strong]:font-semibold
              [&_a]:text-you42-blue [&_a]:hover:underline"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="text-you42-text-secondary text-sm leading-relaxed whitespace-pre-line">
            {descriptionHtml}
          </p>
        )}
      </section>

      {/* Details - simple list, no cards */}
      <section>
        <h2 className="text-lg font-bold text-white">Details</h2>
        <div className="border-b border-you42-border mt-2 mb-4" />

        <dl className="space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="text-you42-text-muted w-20 shrink-0">Date</dt>
            <dd className="text-white">{formatEventDate(event.startDate)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-you42-text-muted w-20 shrink-0">Time</dt>
            <dd className="text-white">{formatEventTime(event.startDate)} &ndash; {formatEventTime(event.endDate)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-you42-text-muted w-20 shrink-0">Type</dt>
            <dd className="text-white">
              {event.eventType === 'GENERAL_ADMISSION' ? 'General Admission' :
               event.eventType === 'RESERVED_SEATING' ? 'Reserved Seating' : 'Timed Entry'}
            </dd>
          </div>
          {event.venue && (
            <>
              <div className="flex gap-3">
                <dt className="text-you42-text-muted w-20 shrink-0">Venue</dt>
                <dd className="text-white">{event.venue.name}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-you42-text-muted w-20 shrink-0">Address</dt>
                <dd className="text-you42-text-secondary">
                  {event.venue.address}, {event.venue.city}, {event.venue.state}
                </dd>
              </div>
            </>
          )}
        </dl>
      </section>
    </div>
  )
}
