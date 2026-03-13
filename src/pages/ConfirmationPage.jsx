import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrder } from '../api/orders'
import { formatCurrency } from '../utils/formatCurrency'
import { formatSlotTime, calcDurationHours, formatDuration } from '../utils/formatTime'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'


function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Group tickets that share the same event + ticket type + date into booking groups
function groupTickets(tickets) {
  if (!tickets || tickets.length === 0) return []

  const groups = []
  const used = new Set()

  // First pass: group by bookingGroup when present
  const bgMap = {}
  for (let i = 0; i < tickets.length; i++) {
    const bg = tickets[i].bookingGroup
    if (bg) {
      if (!bgMap[bg]) bgMap[bg] = []
      bgMap[bg].push(i)
    }
  }
  for (const [, indices] of Object.entries(bgMap)) {
    const groupTickets = indices.map(i => tickets[i])
    indices.forEach(i => used.add(i))
    groupTickets.sort((a, b) => {
      const aTime = a.timeSlot?.startTime || a.startTime || ''
      const bTime = b.timeSlot?.startTime || b.startTime || ''
      return aTime.localeCompare(bTime)
    })
    groups.push({ isTimeSlotGroup: true, tickets: groupTickets })
  }

  // Second pass: group remaining by ticketType+date
  for (let i = 0; i < tickets.length; i++) {
    if (used.has(i)) continue
    const ticket = tickets[i]
    const hasTimeSlot = ticket.timeSlot || ticket.timeSlotDate

    if (hasTimeSlot) {
      const typeName = ticket.ticketTypeName || ticket.ticketType?.name || ''
      const date = ticket.timeSlot?.date || ticket.timeSlotDate || ''
      const groupTickets = [ticket]
      used.add(i)

      for (let j = i + 1; j < tickets.length; j++) {
        if (used.has(j)) continue
        const other = tickets[j]
        const otherType = other.ticketTypeName || other.ticketType?.name || ''
        const otherDate = other.timeSlot?.date || other.timeSlotDate || ''
        if (otherType === typeName && otherDate === date) {
          groupTickets.push(other)
          used.add(j)
        }
      }

      groupTickets.sort((a, b) => {
        const aTime = a.timeSlot?.startTime || a.startTime || ''
        const bTime = b.timeSlot?.startTime || b.startTime || ''
        return aTime.localeCompare(bTime)
      })

      groups.push({ isTimeSlotGroup: true, tickets: groupTickets })
    } else {
      used.add(i)
      groups.push({ isTimeSlotGroup: false, tickets: [ticket] })
    }
  }

  return groups
}

export default function ConfirmationPage() {
  const { orderNumber } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const data = await getOrder(orderNumber)
        console.log('[ORDER RESPONSE]', JSON.stringify(data, null, 2))
        setOrder(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderNumber])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-you42-error text-lg font-semibold mb-2">Unable to load order</p>
        <p className="text-you42-text-secondary mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>Back to Event</Button>
      </div>
    )
  }

  const ticketGroups = groupTickets(order?.tickets)

  // Detect if this is a studio/time-slot booking
  const isStudioBooking = order?.tickets?.some(t => t.bookingGroup || t.timeSlot || t.timeSlotDate)
    || order?.event?.eventType === 'TIMED_ENTRY'
    || order?.items?.some(i => i.bookingGroup || i.timeSlot || i.timeSlotId)
    || false

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="bg-you42-surface rounded-xl border border-you42-border p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-you42-success/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-you42-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {isStudioBooking ? 'Booking Confirmed!' : 'Order Confirmed!'}
        </h1>
        <p className="text-you42-text-secondary mb-6">
          {isStudioBooking
            ? 'Thank you for your booking. Your confirmation is on the way!'
            : 'Thank you for your purchase. Your tickets are on the way!'}
        </p>

        <div className="bg-you42-bg rounded-lg p-4 mb-8 inline-block">
          <p className="text-you42-text-secondary text-xs uppercase tracking-wider mb-1">
            {isStudioBooking ? 'Booking Number' : 'Order Number'}
          </p>
          <p className="text-you42-blue text-xl font-bold">{order?.orderNumber || orderNumber}</p>
        </div>

        {/* Event info */}
        {order?.event && (
          <div className="text-left border-t border-you42-border pt-6 mt-6">
            <h2 className="text-white font-semibold mb-1">{order.event.name}</h2>
            {order.event.startDate && (
              <p className="text-you42-text-secondary text-sm">{formatDate(order.event.startDate)}</p>
            )}
            {order.event.venue && (
              <p className="text-you42-text-secondary text-sm">{order.event.venue.name}</p>
            )}
          </div>
        )}

        {ticketGroups.length > 0 && (
          <div className="text-left border-t border-you42-border pt-6 mt-6">
            <h2 className="text-white font-semibold mb-4">
              {isStudioBooking ? 'Your Booking' : 'Your Tickets'}
            </h2>
            <div className="space-y-3">
              {ticketGroups.map((group, gIdx) => {
                if (group.isTimeSlotGroup) {
                  const tickets = group.tickets
                  const first = tickets[0]
                  const last = tickets[tickets.length - 1]
                  const typeName = first.ticketTypeName || first.ticketType?.name || 'Booking'
                  const date = first.timeSlotDate || first.timeSlot?.date
                  // Use flat startTime/endTime/duration from consolidated ticket first
                  const startTime = first.startTime || first.timeSlot?.startTime
                  const endTime = last.endTime || last.startTime || last.timeSlot?.endTime
                  const hours = first.duration || calcDurationHours(startTime, endTime) || tickets.length
                  const totalPrice = tickets.reduce((sum, t) => sum + (t.ticketTypePrice || 0), 0)

                  return (
                    <div key={gIdx} className="bg-you42-bg rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white text-sm font-medium">{typeName}</p>
                          <p className="text-you42-text-secondary text-xs">
                            {first.eventName || first.event?.name || order?.event?.name}
                          </p>
                          {date && (
                            <p className="text-you42-text-secondary text-xs mt-1">
                              {formatDate(date)}
                            </p>
                          )}
                          {startTime && endTime && (
                            <p className="text-you42-blue text-xs font-medium mt-0.5">
                              {formatSlotTime(startTime)} – {formatSlotTime(endTime)} ({formatDuration(hours)})
                            </p>
                          )}
                        </div>
                        <span className="text-white text-sm font-medium">
                          {formatCurrency(totalPrice)}
                        </span>
                      </div>
                    </div>
                  )
                }

                // Standard ticket (non-time-slot)
                const ticket = group.tickets[0]
                const ticketStart = ticket.startTime || ticket.timeSlot?.startTime
                const ticketEnd = ticket.endTime || ticket.timeSlot?.endTime
                return (
                  <div key={gIdx} className="bg-you42-bg rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white text-sm font-medium">{ticket.ticketTypeName || ticket.ticketType?.name}</p>
                        <p className="text-you42-text-secondary text-xs">
                          {ticket.eventName || ticket.event?.name || order?.event?.name}
                        </p>
                        {(ticket.event?.startDate || ticket.eventDate) && (
                          <p className="text-you42-text-secondary text-xs mt-1">
                            {formatDate(ticket.event?.startDate || ticket.eventDate)}
                          </p>
                        )}
                        {ticketStart && (
                          <p className="text-you42-blue text-xs font-medium mt-0.5">
                            {formatSlotTime(ticketStart)}
                            {ticketEnd && ` – ${formatSlotTime(ticketEnd)}`}
                          </p>
                        )}
                        {ticket.seatLabel && (
                          <p className="text-you42-text-secondary text-xs mt-0.5">
                            Seat: {ticket.seatLabel}
                          </p>
                        )}
                        {ticket.ticketNumber && (
                          <p className="text-slate-500 text-xs mt-1">
                            Ticket #{ticket.ticketNumber}
                          </p>
                        )}
                      </div>
                      <span className="text-white text-sm font-medium">
                        {formatCurrency(ticket.ticketTypePrice)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Order items fallback if no tickets yet */}
        {(!order?.tickets || order.tickets.length === 0) && order?.items && order.items.length > 0 && (
          <div className="text-left border-t border-you42-border pt-6 mt-6">
            <h2 className="text-white font-semibold mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-you42-bg rounded-lg p-3">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {item.ticketType?.name || item.ticketTypeName || 'Ticket'}
                    </p>
                    <p className="text-you42-text-secondary text-xs">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {formatCurrency(item.price || item.total || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {order?.totalAmount != null && (() => {
          const subtotal = order.subtotal
            ?? order.tickets?.reduce((sum, t) => sum + (t.ticketTypePrice || 0), 0)
            ?? 0
          const fees = order.fees || order.serviceFees || 0
          const tax = order.tax || 0
          const discount = order.discount || 0
          const hasFeeBreakdown = order.feeBreakdown?.length > 0

          return (
            <div className="border-t border-you42-border pt-4 mt-6 text-left space-y-2">
              {subtotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-you42-text-secondary text-sm">Subtotal</span>
                  <span className="text-you42-text-secondary text-sm">{formatCurrency(subtotal)}</span>
                </div>
              )}
              {hasFeeBreakdown ? (
                order.feeBreakdown.map((fee, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-you42-text-secondary text-sm">{fee.name}</span>
                    <span className="text-you42-text-secondary text-sm">{formatCurrency(fee.amount)}</span>
                  </div>
                ))
              ) : fees > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-you42-text-secondary text-sm">Fees</span>
                  <span className="text-you42-text-secondary text-sm">{formatCurrency(fees)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-you42-text-secondary text-sm">Tax</span>
                  <span className="text-you42-text-secondary text-sm">{formatCurrency(tax)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-you42-text-secondary text-sm">Discount</span>
                  <span className="text-you42-success text-sm">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-you42-border">
                <span className="text-white font-bold">Total Paid</span>
                <span className="text-white font-bold text-lg">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          )
        })()}

        {order?.customerEmail && (
          <p className="text-you42-text-secondary text-sm mt-6">
            A confirmation email has been sent to{' '}
            <span className="text-white font-medium">{order.customerEmail}</span>
          </p>
        )}

        <div className="mt-8">
          <Button onClick={() => navigate('/')} size="lg">
            Back to Event
          </Button>
        </div>
      </div>
    </div>
  )
}
