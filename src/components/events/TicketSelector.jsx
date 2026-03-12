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

// Classify ticket types into rooms, passes, and hour add-ons
function classifyTicketTypes(ticketTypes) {
  const hourAddonPattern = /^\+\d+\s*(extra\s+)?hours?$/i
  const passPattern = /pass$/i
  const rooms = []
  const passes = []
  const addons = []

  for (const tt of ticketTypes) {
    if (tt.isVisible === false) continue
    if (hourAddonPattern.test(tt.name)) {
      addons.push(tt)
    } else if (passPattern.test(tt.name)) {
      passes.push(tt)
    } else {
      rooms.push(tt)
    }
  }

  rooms.sort((a, b) => a.name.localeCompare(b.name))
  passes.sort((a, b) => (a.price || 0) - (b.price || 0))
  return { rooms, passes, addons }
}

// Check how many consecutive slots are available for a given room starting at a slot index
function getMaxConsecutiveHours(slots, startIndex, roomTicketTypeId) {
  let count = 0
  for (let i = startIndex; i < slots.length; i++) {
    const avail = slots[i].availabilityByTicketType?.[roomTicketTypeId]
    if (!avail || avail.remaining <= 0) break
    // Check slots are actually consecutive (no gaps)
    if (i > startIndex) {
      const prevEnd = slots[i - 1].endTime
      const currStart = slots[i].startTime
      if (prevEnd !== currStart) break
    }
    count++
  }
  return count
}

function TimedEntrySelector({ event }) {
  const { addItem, isLoading, setTicketTypePrices } = useCart()
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(1)
  const [selectedStartSlotIndex, setSelectedStartSlotIndex] = useState(null)
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState(null)
  const [addingSuccess, setAddingSuccess] = useState(false)
  const [showMap, setShowMap] = useState(false)
  // Flow: 1=room, 2=date, 3=time+duration
  const [step, setStep] = useState(1)

  const ticketTypes = event.ticketTypes || []
  const { rooms, passes } = useMemo(() => classifyTicketTypes(ticketTypes), [ticketTypes])

  useEffect(() => {
    if (ticketTypes.length === 0) return
    const priceMap = {}
    for (const tt of ticketTypes) {
      priceMap[tt.id] = { price: tt.price, allInPrice: tt.allInPrice || tt.price }
    }
    setTicketTypePrices(priceMap)
  }, [ticketTypes, setTicketTypePrices])

  // Preload available dates on mount
  useEffect(() => {
    let cancelled = false
    setLoadingDates(true)
    const today = new Date().toISOString().split('T')[0]
    const end = addMonths(new Date(), 2).toISOString().split('T')[0]
    getAvailableDates(event.id, today, end)
      .then(d => { if (!cancelled) setDates(d || []) })
      .catch(() => { if (!cancelled) setDates([]) })
      .finally(() => { if (!cancelled) setLoadingDates(false) })
    return () => { cancelled = true }
  }, [event.id])

  // Load time slots when date changes
  useEffect(() => {
    if (!selectedDate) { setSlots([]); return }
    let cancelled = false
    setLoadingSlots(true)
    setSelectedStartSlotIndex(null)
    getAvailableSlots(event.id, selectedDate)
      .then(s => {
        if (!cancelled) {
          const sorted = (s || []).sort((a, b) => a.startTime.localeCompare(b.startTime))
          setSlots(sorted)
        }
      })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [event.id, selectedDate])

  // For the selected room, figure out which start times work
  const startTimeOptions = useMemo(() => {
    if (!selectedRoom || slots.length === 0) return []
    return slots.map((slot, index) => {
      const maxHours = getMaxConsecutiveHours(slots, index, selectedRoom.id)
      return { slot, index, maxHours }
    }).filter(opt => opt.maxHours > 0)
  }, [selectedRoom, slots])

  const maxDurationForStart = useMemo(() => {
    if (selectedStartSlotIndex === null) return 0
    const opt = startTimeOptions.find(o => o.index === selectedStartSlotIndex)
    return Math.min(opt?.maxHours || 0, 5)
  }, [selectedStartSlotIndex, startTimeOptions])

  useEffect(() => {
    if (selectedDuration > maxDurationForStart && maxDurationForStart > 0) {
      setSelectedDuration(maxDurationForStart)
    }
  }, [maxDurationForStart, selectedDuration])

  const roomPrice = selectedRoom?.allInPrice || selectedRoom?.price || 0
  const totalPrice = roomPrice * selectedDuration

  const bookingSummary = useMemo(() => {
    if (selectedStartSlotIndex === null || !selectedRoom || selectedDuration === 0) return null
    const startSlot = slots[selectedStartSlotIndex]
    const endSlot = slots[selectedStartSlotIndex + selectedDuration - 1]
    if (!startSlot || !endSlot) return null
    return {
      room: selectedRoom.name,
      date: selectedDate,
      startTime: startSlot.startTime,
      endTime: endSlot.endTime,
      duration: selectedDuration,
      pricePerHour: roomPrice,
      total: totalPrice,
      slotIds: slots.slice(selectedStartSlotIndex, selectedStartSlotIndex + selectedDuration).map(s => s.id),
    }
  }, [selectedStartSlotIndex, selectedRoom, selectedDuration, slots, selectedDate, roomPrice, totalPrice])

  const handleSelectRoom = (room) => {
    setSelectedRoom(room)
    setSelectedDate(null)
    setSelectedDuration(1)
    setSelectedStartSlotIndex(null)
    setSlots([])
    setStep(2)
  }

  const handleSelectDate = (date) => {
    setSelectedDate(date)
    setSelectedDuration(1)
    setSelectedStartSlotIndex(null)
    setStep(3)
  }

  const handleSelectStartTime = (index) => {
    setSelectedStartSlotIndex(index)
    const opt = startTimeOptions.find(o => o.index === index)
    const max = Math.min(opt?.maxHours || 1, 5)
    if (selectedDuration > max) setSelectedDuration(max)
    if (selectedDuration === 0) setSelectedDuration(1)
  }

  const handleAddToCart = async () => {
    setError(null)
    setAddingSuccess(false)
    if (!bookingSummary) return

    try {
      for (const slotId of bookingSummary.slotIds) {
        await addItem({
          eventId: event.id,
          ticketTypeId: selectedRoom.id,
          quantity: 1,
          timeSlotId: slotId,
          timeSlotDate: selectedDate,
        })
      }
      setAddingSuccess(true)
      // Reset to room selection for another booking
      setSelectedDate(null)
      setSelectedDuration(1)
      setSelectedStartSlotIndex(null)
      setSlots([])
      setStep(1)
      setSelectedRoom(null)
      setTimeout(() => setAddingSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  // Pass purchase
  const [passQuantities, setPassQuantities] = useState({})
  const updatePassQty = (id, delta, max = 4) => {
    setPassQuantities(prev => {
      const cur = prev[id] || 0
      return { ...prev, [id]: Math.max(0, Math.min(max, cur + delta)) }
    })
  }
  const totalPassesSelected = Object.values(passQuantities).reduce((s, q) => s + q, 0)

  const handleAddPasses = async () => {
    setError(null)
    const selected = Object.entries(passQuantities).filter(([, qty]) => qty > 0)
    if (selected.length === 0) return
    try {
      for (const [ticketTypeId, quantity] of selected) {
        await addItem({ eventId: event.id, ticketTypeId, quantity })
      }
      setPassQuantities({})
      setAddingSuccess(true)
      setTimeout(() => setAddingSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── STUDIO MAP ── */}
      <div>
        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 text-you42-blue text-sm font-medium hover:underline mb-3"
        >
          <svg className={`w-4 h-4 transition-transform ${showMap ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {showMap ? 'Hide Studio Map' : 'View Studio Map'}
        </button>
        {showMap && (
          <div className="rounded-xl overflow-hidden border border-you42-border mb-4">
            <img
              src="/you42-studios-map.webp"
              alt="You42 Studios 3D Floor Plan"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* ── ROOM BOOKING ── */}
      <div>
        <h3 className="text-lg font-bold text-white">Book a Room</h3>
        <p className="text-slate-400 text-xs mt-1">Choose your room, pick a date, then select your time.</p>
        <div className="border-b border-you42-border mt-2 mb-4" />

        {/* Step 1: Room */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${step >= 1 ? 'bg-you42-blue text-white' : 'bg-you42-surface text-slate-500'}`}>1</span>
            <label className="text-white text-sm font-medium">Choose a Room</label>
            {selectedRoom && step > 1 && (
              <button onClick={() => { setStep(1); setSelectedRoom(null); setSelectedDate(null); setSelectedStartSlotIndex(null); setSlots([]) }} className="text-you42-blue text-xs ml-auto hover:underline">Change</button>
            )}
          </div>
          {step === 1 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className="p-3 rounded-lg border text-left transition-all bg-you42-surface border-you42-border hover:border-you42-blue/60 hover:bg-you42-surface-hover cursor-pointer group"
                >
                  <span className="text-white text-sm font-medium block group-hover:text-you42-blue transition-colors">{room.name}</span>
                  <span className="text-you42-blue text-xs font-semibold">{formatCurrency(room.allInPrice || room.price)}/hr</span>
                </button>
              ))}
            </div>
          ) : selectedRoom && (
            <div className="ml-7 flex items-center gap-2">
              <span className="text-white text-sm font-medium">{selectedRoom.name}</span>
              <span className="text-you42-blue text-xs font-semibold">{formatCurrency(roomPrice)}/hr</span>
            </div>
          )}
        </div>

        {/* Step 2: Date */}
        {step >= 2 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${step >= 2 ? 'bg-you42-blue text-white' : 'bg-you42-surface text-slate-500'}`}>2</span>
              <label className="text-white text-sm font-medium">Select a Date</label>
              {selectedDate && step > 2 && (
                <button onClick={() => { setStep(2); setSelectedDate(null); setSelectedStartSlotIndex(null); setSlots([]) }} className="text-you42-blue text-xs ml-auto hover:underline">Change</button>
              )}
            </div>
            {step === 2 ? (
              loadingDates ? (
                <div className="flex items-center gap-2 py-3 ml-7">
                  <div className="w-4 h-4 border-2 border-you42-blue border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm">Loading dates...</span>
                </div>
              ) : dates.length === 0 ? (
                <p className="text-slate-400 text-sm py-3 ml-7">No dates available</p>
              ) : (
                <div className="ml-7">
                  <MiniCalendar
                    availableDates={dates}
                    selectedDate={selectedDate}
                    onSelect={handleSelectDate}
                  />
                </div>
              )
            ) : selectedDate && (
              <p className="text-slate-300 text-sm ml-7">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
            )}
          </div>
        )}

        {/* Step 3: Start Time + Duration */}
        {step >= 3 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${step >= 3 ? 'bg-you42-blue text-white' : 'bg-you42-surface text-slate-500'}`}>3</span>
              <label className="text-white text-sm font-medium">Start Time & Duration</label>
            </div>

            <div className="ml-7 space-y-3">
              {loadingSlots ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-you42-blue border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm">Loading availability...</span>
                </div>
              ) : (
                <>
                  {/* Start time grid */}
                  <div>
                    <span className="text-slate-400 text-xs block mb-1.5">Start time</span>
                    {startTimeOptions.length === 0 ? (
                      <p className="text-slate-400 text-sm py-2">No availability for {selectedRoom?.name} on this date</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {startTimeOptions.map(({ slot, index, maxHours }) => {
                          const isSelected = selectedStartSlotIndex === index
                          return (
                            <button
                              key={slot.id}
                              onClick={() => handleSelectStartTime(index)}
                              className={`py-2 px-2 rounded-lg border text-sm font-medium transition-colors ${
                                isSelected
                                  ? 'bg-you42-blue border-you42-blue text-white'
                                  : 'bg-you42-surface border-you42-border text-slate-300 hover:border-you42-blue/50'
                              }`}
                            >
                              {formatSlotTime(slot.startTime)}
                              <span className={`block text-[10px] font-normal ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>up to {maxHours}hr</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Duration selector */}
                  {selectedStartSlotIndex !== null && maxDurationForStart > 0 && (
                    <div>
                      <span className="text-slate-400 text-xs block mb-1.5">How long do you need?</span>
                      <div className="flex gap-2">
                        {Array.from({ length: maxDurationForStart }, (_, i) => i + 1).map(hrs => (
                          <button
                            key={hrs}
                            onClick={() => setSelectedDuration(hrs)}
                            className={`flex-1 py-2.5 rounded-lg border text-center transition-colors ${
                              selectedDuration === hrs
                                ? 'bg-you42-blue border-you42-blue text-white'
                                : 'bg-you42-surface border-you42-border text-slate-300 hover:border-you42-blue/50'
                            }`}
                          >
                            <span className="text-sm font-semibold block">{hrs} hr{hrs > 1 ? 's' : ''}</span>
                            <span className={`text-[10px] font-normal ${selectedDuration === hrs ? 'text-blue-200' : 'text-slate-500'}`}>{formatCurrency(roomPrice * hrs)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Booking Summary + Add to Cart */}
        {bookingSummary && (
          <div className="bg-you42-surface rounded-lg border border-you42-border p-4">
            <p className="text-white text-sm font-semibold mb-2">Booking Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Room</span>
                <span className="text-white">{bookingSummary.room}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="text-white">{format(parseISO(bookingSummary.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time</span>
                <span className="text-white">{formatSlotTime(bookingSummary.startTime)} – {formatSlotTime(bookingSummary.endTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration</span>
                <span className="text-white">{bookingSummary.duration} hour{bookingSummary.duration > 1 ? 's' : ''}</span>
              </div>
              <div className="border-t border-you42-border mt-2 pt-2 flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-you42-blue font-bold">{formatCurrency(bookingSummary.total)}</span>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isLoading}
              className="w-full mt-3 bg-you42-blue hover:bg-you42-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
            >
              {isLoading ? 'Booking...' : `Book ${bookingSummary.room} – ${formatCurrency(bookingSummary.total)}`}
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        {addingSuccess && <p className="text-green-400 text-xs mt-3">Added to cart!</p>}
      </div>

      {/* ── PASSES SECTION ── */}
      {passes.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white">Studio Passes</h3>
          <p className="text-slate-400 text-xs mt-1">Premium all-access bundles with extended time and perks.</p>
          <div className="border-b border-you42-border mt-2 mb-4" />

          <div className="space-y-3">
            {passes.map(pass => {
              const qty = passQuantities[pass.id] || 0
              const maxQty = pass.maxQuantity || 4
              return (
                <div key={pass.id} className="flex items-center justify-between gap-4 p-3 bg-you42-surface rounded-lg border border-you42-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{pass.name}</span>
                      {pass.badgeText && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: pass.badgeColor || '#555' }}>
                          {pass.badgeText}
                        </span>
                      )}
                    </div>
                    {pass.description && (
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{pass.description}</p>
                    )}
                    <span className="text-you42-blue text-sm font-semibold">{formatCurrency(pass.allInPrice || pass.price)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updatePassQty(pass.id, -1, maxQty)}
                      disabled={qty <= 0}
                      className="w-7 h-7 rounded bg-you42-bg text-white text-sm flex items-center justify-center hover:bg-you42-surface-hover disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >&minus;</button>
                    <span className="w-6 text-center text-white text-sm font-medium">{qty}</span>
                    <button
                      onClick={() => updatePassQty(pass.id, 1, maxQty)}
                      disabled={qty >= maxQty}
                      className="w-7 h-7 rounded bg-you42-bg text-white text-sm flex items-center justify-center hover:bg-you42-surface-hover disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >+</button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleAddPasses}
            disabled={totalPassesSelected === 0 || isLoading}
            className="w-full mt-4 bg-you42-blue hover:bg-you42-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
          >
            {isLoading ? 'Adding...' :
             totalPassesSelected > 0
               ? `Add ${totalPassesSelected} Pass${totalPassesSelected > 1 ? 'es' : ''} to Cart`
               : 'Select a Pass'}
          </button>
        </div>
      )}
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
