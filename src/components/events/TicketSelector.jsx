import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/formatCurrency'
import { getAvailableDates, getAvailableSlots } from '../../api/events'
import { format, parseISO, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, subMonths } from 'date-fns'
import SeatMap from './SeatMap'

// Fuzzy match category name to ticket type name
function matchCategoryToTicketType(categoryName, ticketTypes) {
  if (!categoryName || ticketTypes.length === 0) return ticketTypes[0] || null

  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const catNorm = normalize(categoryName)

  const exact = ticketTypes.find(t => t.name === categoryName)
  if (exact) return exact

  const contains = ticketTypes.find(t => {
    const tNorm = normalize(t.name)
    return catNorm.includes(tNorm) || tNorm.includes(catNorm)
  })
  if (contains) return contains

  let bestMatch = null
  let bestScore = -Infinity
  for (const tt of ticketTypes) {
    const catWords = catNorm.split(/\s+/)
    const ttWords = normalize(tt.name).split(/\s+/)
    let score = 0
    for (const cw of catWords) {
      let bestWordScore = 0
      for (const tw of ttWords) {
        const maxLen = Math.max(cw.length, tw.length)
        if (maxLen === 0) continue
        const m = cw.length, n = tw.length
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
        for (let i = 0; i <= m; i++) dp[i][0] = i
        for (let j = 0; j <= n; j++) dp[0][j] = j
        for (let i = 1; i <= m; i++)
          for (let j = 1; j <= n; j++)
            dp[i][j] = cw[i-1] === tw[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
        const similarity = 1 - dp[m][n] / maxLen
        if (similarity > bestWordScore) bestWordScore = similarity
      }
      score += bestWordScore
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = tt
    }
  }
  return bestMatch
}

function ReservedSeatingSelector({ event }) {
  const { addItem, isLoading, setTicketTypePrices } = useCart()
  const seatMapRef = useRef(null)
  const [selection, setSelection] = useState(null) // from PT_SEAT_SELECTION_CHANGED
  const [error, setError] = useState(null)
  const [addingSuccess, setAddingSuccess] = useState(false)

  const ticketTypes = event.ticketTypes || []

  useEffect(() => {
    if (ticketTypes.length === 0) return
    const priceMap = {}
    for (const tt of ticketTypes) {
      priceMap[tt.id] = { price: tt.price, allInPrice: tt.allInPrice || tt.price }
    }
    setTicketTypePrices(priceMap)
  }, [ticketTypes, setTicketTypePrices])

  const handleReady = useCallback((payload) => {
    // Embed is loaded — payload has categories, sections, totalSeats, etc.
  }, [])

  const handleSelectionChange = useCallback((payload) => {
    setSelection(payload)
  }, [])

  const selectedSeats = selection?.seats || []
  const summary = selection?.summary || { count: 0, subtotal: 0, allInTotal: 0 }

  // Group selected seats by category for cart
  const selectionGroups = useMemo(() => {
    const groups = {}
    for (const seat of selectedSeats) {
      const catName = seat.categoryName || 'Ticket'
      if (!groups[catName]) {
        groups[catName] = {
          categoryName: catName,
          price: seat.price || 0,
          allInPrice: seat.allInPrice || seat.price || 0,
          count: 0,
        }
      }
      groups[catName].count++
    }
    return Object.values(groups)
  }, [selectedSeats])

  const handleAddToCart = async () => {
    setError(null)
    setAddingSuccess(false)
    if (selectedSeats.length === 0) return

    try {
      for (const group of selectionGroups) {
        const matchedTicketType = matchCategoryToTicketType(group.categoryName, ticketTypes)
        if (!matchedTicketType) {
          throw new Error(`No matching ticket type found for "${group.categoryName}"`)
        }
        await addItem({
          eventId: event.id,
          ticketTypeId: matchedTicketType.id,
          quantity: group.count,
        })
      }
      seatMapRef.current?.clearSelection()
      setSelection(null)
      setAddingSuccess(true)
      setTimeout(() => setAddingSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-white">Select Your Seats</h3>
      <div className="border-b border-you42-border mt-2 mb-4" />

      <SeatMap
        ref={seatMapRef}
        eventId={event.id}
        onSelectionChange={handleSelectionChange}
        onReady={handleReady}
      />

      {selectedSeats.length > 0 && (
        <div className="mt-4 p-3 bg-you42-surface rounded-lg border border-you42-border">
          <p className="text-white text-sm font-semibold mb-2">Your Selection</p>
          {selectionGroups.map((group) => (
            <div key={group.categoryName} className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">{group.count}x {group.categoryName}</span>
              <span className="text-white font-medium">
                {formatCurrency(group.allInPrice * group.count)}
              </span>
            </div>
          ))}
          <div className="border-t border-you42-border mt-2 pt-2 flex justify-between">
            <span className="text-white text-sm font-semibold">Total</span>
            <span className="text-white text-sm font-bold">
              {formatCurrency(summary.allInTotal || summary.subtotal)}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      {addingSuccess && <p className="text-green-400 text-xs mt-3">Added to cart!</p>}

      <button
        onClick={handleAddToCart}
        disabled={selectedSeats.length === 0 || isLoading}
        className="w-full mt-4 bg-you42-blue hover:bg-you42-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
      >
        {isLoading ? 'Adding...' :
         selectedSeats.length > 0
           ? `Add ${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''} to Cart`
           : 'Select Seats'}
      </button>
    </div>
  )
}

function StandardTicketSelector({ event }) {
  const { addItem, isLoading, setTicketTypePrices } = useCart()
  const [quantities, setQuantities] = useState({})
  const [error, setError] = useState(null)
  const [addingSuccess, setAddingSuccess] = useState(false)

  const ticketTypes = event.ticketTypes || []

  useEffect(() => {
    if (ticketTypes.length === 0) return
    const priceMap = {}
    for (const tt of ticketTypes) {
      priceMap[tt.id] = { price: tt.price, allInPrice: tt.allInPrice || tt.price }
    }
    setTicketTypePrices(priceMap)
  }, [ticketTypes, setTicketTypePrices])

  const updateQuantity = (ticketTypeId, delta, min = 0, max = 10) => {
    setQuantities(prev => {
      const current = prev[ticketTypeId] || 0
      const next = Math.max(min, Math.min(max, current + delta))
      return { ...prev, [ticketTypeId]: next }
    })
  }

  const handleAddToCart = async () => {
    setError(null)
    setAddingSuccess(false)
    const selectedTickets = Object.entries(quantities).filter(([, qty]) => qty > 0)
    if (selectedTickets.length === 0) return

    try {
      for (const [ticketTypeId, quantity] of selectedTickets) {
        await addItem({ eventId: event.id, ticketTypeId, quantity })
      }
      setQuantities({})
      setAddingSuccess(true)
      setTimeout(() => setAddingSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const totalSelected = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)

  if (ticketTypes.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-white">Tickets</h3>
        <div className="border-b border-you42-border mt-2 mb-6" />
        <div className="text-center py-6">
          <p className="text-white font-semibold text-sm mb-1">Tickets Coming Soon</p>
          <p className="text-you42-text-muted text-sm">Check back shortly for ticket availability.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-white">Tickets</h3>
      <div className="border-b border-you42-border mt-2 mb-4" />

      <div className="space-y-4">
        {ticketTypes
          .filter(tt => tt.isVisible !== false)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map(ticket => {
            const qty = quantities[ticket.id] || 0
            const maxQty = ticket.maxQuantity || 10
            const isAvailable = ticket.isAvailable !== false && ticket.availableQuantity > 0

            return (
              <div key={ticket.id} className={`flex items-center justify-between gap-4 py-3 ${!isAvailable ? 'opacity-40' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{ticket.name}</span>
                    {ticket.badgeText && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: ticket.badgeColor || '#555' }}>
                        {ticket.badgeText}
                      </span>
                    )}
                  </div>
                  <span className="text-you42-text-secondary text-sm">
                    {formatCurrency(ticket.allInPrice || ticket.price)}
                    {ticket.allInPrice && ticket.allInPrice !== ticket.price && (
                      <span className="text-you42-text-muted text-xs ml-1">(all-in)</span>
                    )}
                  </span>
                </div>

                {isAvailable ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(ticket.id, -1, 0, maxQty)}
                      disabled={qty <= 0}
                      className="w-7 h-7 rounded bg-you42-surface text-white text-sm flex items-center justify-center hover:bg-you42-surface-hover disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >&minus;</button>
                    <span className="w-6 text-center text-white text-sm font-medium">{qty}</span>
                    <button
                      onClick={() => updateQuantity(ticket.id, 1, 0, maxQty)}
                      disabled={qty >= maxQty}
                      className="w-7 h-7 rounded bg-you42-surface text-white text-sm flex items-center justify-center hover:bg-you42-surface-hover disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >+</button>
                  </div>
                ) : (
                  <span className="text-you42-text-muted text-xs">Sold Out</span>
                )}
              </div>
            )
          })}
      </div>

      {error && <p className="text-you42-error text-xs mt-3">{error}</p>}
      {addingSuccess && <p className="text-you42-success text-xs mt-3">Added to cart!</p>}

      <button
        onClick={handleAddToCart}
        disabled={totalSelected === 0 || isLoading}
        className="w-full mt-5 bg-you42-blue hover:bg-you42-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
      >
        {isLoading ? 'Adding...' :
         totalSelected > 0 ? `Add ${totalSelected} Ticket${totalSelected > 1 ? 's' : ''} to Cart` :
         'Select Tickets'}
      </button>
    </div>
  )
}

function formatSlotTime(time) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function MiniCalendar({ availableDates, selectedDate, onSelect }) {
  const availableSet = useMemo(() => new Set(availableDates), [availableDates])
  const initialMonth = selectedDate ? parseISO(selectedDate) : new Date()
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialMonth))

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const rows = []
    let day = start
    while (day <= end) {
      const week = []
      for (let i = 0; i < 7; i++) {
        week.push(day)
        day = addDays(day, 1)
      }
      rows.push(week)
    }
    return rows
  }, [currentMonth])

  return (
    <div className="bg-you42-surface rounded-lg border border-you42-border p-3 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-slate-400 hover:text-white p-1 text-sm">&larr;</button>
        <span className="text-white text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-slate-400 hover:text-white p-1 text-sm">&rarr;</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-slate-500 text-[10px] font-medium py-1">{d}</div>
        ))}
        {weeks.flat().map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, currentMonth)
          const isAvailable = availableSet.has(dateStr)
          const isSelected = selectedDate === dateStr
          const isPast = day < new Date(new Date().toDateString())

          return (
            <button
              key={i}
              onClick={() => isAvailable && onSelect(dateStr)}
              disabled={!isAvailable || !inMonth}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                !inMonth ? 'text-transparent cursor-default' :
                isSelected ? 'bg-you42-blue text-white' :
                isAvailable ? 'text-white hover:bg-you42-blue/30 cursor-pointer' :
                isPast ? 'text-slate-700 cursor-default' :
                'text-slate-600 cursor-default'
              }`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimedEntrySelector({ event }) {
  const { addItem, isLoading, setTicketTypePrices } = useCart()
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [quantities, setQuantities] = useState({})
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState(null)
  const [addingSuccess, setAddingSuccess] = useState(false)

  const ticketTypes = event.ticketTypes || []

  useEffect(() => {
    if (ticketTypes.length === 0) return
    const priceMap = {}
    for (const tt of ticketTypes) {
      priceMap[tt.id] = { price: tt.price, allInPrice: tt.allInPrice || tt.price }
    }
    setTicketTypePrices(priceMap)
  }, [ticketTypes, setTicketTypePrices])

  // Load available dates
  useEffect(() => {
    let cancelled = false
    setLoadingDates(true)
    const today = new Date().toISOString().split('T')[0]
    const end = addMonths(new Date(), 2).toISOString().split('T')[0]
    getAvailableDates(event.id, today, end)
      .then(d => {
        if (!cancelled) {
          setDates(d || [])
          if (d?.length > 0) setSelectedDate(d[0])
        }
      })
      .catch(() => { if (!cancelled) setDates([]) })
      .finally(() => { if (!cancelled) setLoadingDates(false) })
    return () => { cancelled = true }
  }, [event.id])

  // Load time slots when date changes
  useEffect(() => {
    if (!selectedDate) { setSlots([]); setSelectedSlot(null); return }
    let cancelled = false
    setLoadingSlots(true)
    setSelectedSlot(null)
    setQuantities({})
    getAvailableSlots(event.id, selectedDate)
      .then(s => {
        if (!cancelled) {
          setSlots(s || [])
          if (s?.length > 0) setSelectedSlot(s[0])
        }
      })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [event.id, selectedDate])

  // Filter ticket types by slot availability
  const availableTicketTypes = useMemo(() => {
    if (!selectedSlot) return []
    const byTT = selectedSlot.availabilityByTicketType || {}
    return ticketTypes
      .filter(tt => tt.isVisible !== false)
      .filter(tt => {
        const avail = byTT[tt.id]
        return avail && avail.remaining > 0
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }, [ticketTypes, selectedSlot])

  const updateQuantity = (ticketTypeId, delta, max = 10) => {
    setQuantities(prev => {
      const current = prev[ticketTypeId] || 0
      const next = Math.max(0, Math.min(max, current + delta))
      return { ...prev, [ticketTypeId]: next }
    })
  }

  const totalSelected = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)

  const handleAddToCart = async () => {
    setError(null)
    setAddingSuccess(false)
    if (!selectedSlot || totalSelected === 0) return

    try {
      const selected = Object.entries(quantities).filter(([, qty]) => qty > 0)
      for (const [ticketTypeId, quantity] of selected) {
        await addItem({
          eventId: event.id,
          ticketTypeId,
          quantity,
          timeSlotId: selectedSlot.id,
          timeSlotDate: selectedDate,
        })
      }
      setQuantities({})
      setAddingSuccess(true)
      setTimeout(() => setAddingSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-white">Book Your Time</h3>
      <div className="border-b border-you42-border mt-2 mb-4" />

      {/* Date picker */}
      <div className="mb-4">
        <label className="text-white text-sm font-medium block mb-2">Select a Date</label>
        {loadingDates ? (
          <div className="flex items-center gap-2 py-3">
            <div className="w-4 h-4 border-2 border-you42-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Loading dates...</span>
          </div>
        ) : dates.length === 0 ? (
          <p className="text-slate-400 text-sm py-3">No dates available</p>
        ) : (
          <MiniCalendar
            availableDates={dates}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        )}
      </div>

      {/* Time slot picker */}
      {selectedDate && (
        <div className="mb-4">
          <label className="text-white text-sm font-medium block mb-2">Select a Time</label>
          {loadingSlots ? (
            <div className="flex items-center gap-2 py-3">
              <div className="w-4 h-4 border-2 border-you42-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 text-sm">Loading times...</span>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-slate-400 text-sm py-3">No time slots available for this date</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => {
                const isSelected = selectedSlot?.id === slot.id
                const isFull = slot.remaining <= 0
                return (
                  <button
                    key={slot.id}
                    onClick={() => { setSelectedSlot(slot); setQuantities({}) }}
                    disabled={isFull}
                    className={`py-2 px-2 rounded-lg border text-sm font-medium transition-colors ${
                      isFull
                        ? 'bg-you42-surface/50 border-you42-border/50 text-slate-600 cursor-not-allowed'
                        : isSelected
                          ? 'bg-you42-blue border-you42-blue text-white'
                          : 'bg-you42-surface border-you42-border text-slate-300 hover:border-you42-blue/50'
                    }`}
                  >
                    {formatSlotTime(slot.startTime)}
                    {isFull && <span className="block text-[10px] text-slate-500">Full</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Ticket types for selected slot */}
      {selectedSlot && (
        <div>
          <label className="text-white text-sm font-medium block mb-2">Select Tickets</label>
          {availableTicketTypes.length === 0 ? (
            <p className="text-slate-400 text-sm py-3">No tickets available for this time</p>
          ) : (
            <div className="space-y-3">
              {availableTicketTypes.map(ticket => {
                const qty = quantities[ticket.id] || 0
                const maxQty = ticket.maxQuantity || 10
                return (
                  <div key={ticket.id} className="flex items-center justify-between gap-4 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{ticket.name}</span>
                        {ticket.badgeText && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: ticket.badgeColor || ticket.backgroundColor || '#555' }}>
                            {ticket.badgeText}
                          </span>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{ticket.description}</p>
                      )}
                      <span className="text-you42-text-secondary text-sm">
                        {formatCurrency(ticket.allInPrice || ticket.price)}
                        {ticket.allInPrice && ticket.allInPrice !== ticket.price && (
                          <span className="text-you42-text-muted text-xs ml-1">(all-in)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(ticket.id, -1, maxQty)}
                        disabled={qty <= 0}
                        className="w-7 h-7 rounded bg-you42-surface text-white text-sm flex items-center justify-center hover:bg-you42-surface-hover disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >&minus;</button>
                      <span className="w-6 text-center text-white text-sm font-medium">{qty}</span>
                      <button
                        onClick={() => updateQuantity(ticket.id, 1, maxQty)}
                        disabled={qty >= maxQty}
                        className="w-7 h-7 rounded bg-you42-surface text-white text-sm flex items-center justify-center hover:bg-you42-surface-hover disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      {addingSuccess && <p className="text-green-400 text-xs mt-3">Added to cart!</p>}

      <button
        onClick={handleAddToCart}
        disabled={totalSelected === 0 || !selectedSlot || isLoading}
        className="w-full mt-5 bg-you42-blue hover:bg-you42-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
      >
        {isLoading ? 'Adding...' :
         totalSelected > 0
           ? `Add ${totalSelected} Ticket${totalSelected > 1 ? 's' : ''} to Cart`
           : 'Select Tickets'}
      </button>
    </div>
  )
}

export default function TicketSelector({ event }) {
  if (event.eventType === 'RESERVED_SEATING') {
    return <ReservedSeatingSelector event={event} />
  }
  if (event.eventType === 'TIMED_ENTRY') {
    return <TimedEntrySelector event={event} />
  }
  return <StandardTicketSelector event={event} />
}
