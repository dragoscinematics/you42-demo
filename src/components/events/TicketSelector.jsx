import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/formatCurrency'
import { getSeatMap, getSeatMapSvg } from '../../api/events'
import SeatMap from './SeatMap'

// Fuzzy match category name to ticket type name
function matchCategoryToTicketType(categoryName, ticketTypes) {
  if (!categoryName || ticketTypes.length === 0) return ticketTypes[0] || null

  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const catNorm = normalize(categoryName)

  // Exact match
  const exact = ticketTypes.find(t => t.name === categoryName)
  if (exact) return exact

  // Contains match
  const contains = ticketTypes.find(t => {
    const tNorm = normalize(t.name)
    return catNorm.includes(tNorm) || tNorm.includes(catNorm)
  })
  if (contains) return contains

  // Word similarity (handles typos like "resered" -> "reserved")
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
        let dist = 0
        const m = cw.length, n = tw.length
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
        for (let i = 0; i <= m; i++) dp[i][0] = i
        for (let j = 0; j <= n; j++) dp[0][j] = j
        for (let i = 1; i <= m; i++)
          for (let j = 1; j <= n; j++)
            dp[i][j] = cw[i-1] === tw[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
        dist = dp[m][n]
        const similarity = 1 - dist / maxLen
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
  const [seatMapData, setSeatMapData] = useState(null)
  const [svgContent, setSvgContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selectedSections, setSelectedSections] = useState({})
  const [error, setError] = useState(null)
  const [addingSuccess, setAddingSuccess] = useState(false)

  const ticketTypes = event.ticketTypes || []

  // Store price/allInPrice map in cart context
  useEffect(() => {
    if (ticketTypes.length === 0) return
    const priceMap = {}
    for (const tt of ticketTypes) {
      priceMap[tt.id] = { price: tt.price, allInPrice: tt.allInPrice || tt.price }
    }
    setTicketTypePrices(priceMap)
  }, [ticketTypes, setTicketTypePrices])

  // Fetch both seat map data (for metadata) and SVG (for rendering)
  useEffect(() => {
    let cancelled = false
    async function fetch() {
      try {
        setLoading(true)
        const [data, svg] = await Promise.all([
          getSeatMap(event.id),
          getSeatMapSvg(event.id),
        ])
        if (!cancelled) {
          setSeatMapData(data)
          setSvgContent(svg)
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [event.id])

  const handleSelectionChange = useCallback((sections) => {
    setSelectedSections(sections)
  }, [])

  // Build summary from selections
  const selectionSummary = useMemo(() => {
    const groups = []
    const sectionLookup = {}
    for (const s of (seatMapData?.sections || [])) {
      sectionLookup[s.sectionKey] = s
    }
    const categoryLookup = {}
    for (const c of (seatMapData?.categories || [])) {
      categoryLookup[c.id] = c
    }

    for (const [sectionKey, qty] of Object.entries(selectedSections)) {
      if (qty <= 0) continue
      const meta = sectionLookup[sectionKey]
      const cat = meta ? categoryLookup[meta.categoryId] : null
      groups.push({
        sectionKey,
        categoryId: meta?.categoryId,
        categoryName: cat?.name || meta?.name || 'Ticket',
        sectionType: meta?.sectionType || 'SEATED',
        price: cat?.price || 0,
        count: qty,
      })
    }
    return groups
  }, [selectedSections, seatMapData])

  const totalPrice = useMemo(() => {
    return selectionSummary.reduce((sum, g) => sum + g.price * g.count, 0)
  }, [selectionSummary])

  const totalCount = useMemo(() => {
    return selectionSummary.reduce((sum, g) => sum + g.count, 0)
  }, [selectionSummary])

  const handleAddToCart = async () => {
    setError(null)
    setAddingSuccess(false)
    if (totalCount === 0) return

    try {
      for (const group of selectionSummary) {
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

      setSelectedSections({})
      setAddingSuccess(true)
      setTimeout(() => setAddingSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-bold text-white">Select Your Seats</h3>
        <div className="border-b border-you42-border mt-2 mb-4" />
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-you42-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-you42-text-muted text-sm ml-3">Loading seat map...</span>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div>
        <h3 className="text-lg font-bold text-white">Select Your Seats</h3>
        <div className="border-b border-you42-border mt-2 mb-4" />
        <p className="text-you42-error text-sm py-6 text-center">Failed to load seat map: {loadError}</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-white">Select Your Seats</h3>
      <div className="border-b border-you42-border mt-2 mb-4" />

      <SeatMap
        svgContent={svgContent}
        seatMapData={seatMapData}
        onSelectionChange={handleSelectionChange}
        selectedSections={selectedSections}
      />

      {/* Selection summary */}
      {totalCount > 0 && (
        <div className="mt-4 p-3 bg-you42-surface rounded-lg border border-you42-border">
          <p className="text-white text-sm font-semibold mb-2">Your Selection</p>
          {selectionSummary.map((group) => (
            <div key={group.sectionKey} className="flex justify-between text-sm mb-1">
              <span className="text-you42-text-secondary">
                {group.count}x {group.categoryName}
              </span>
              <span className="text-white font-medium">
                {formatCurrency(group.price * group.count)}
              </span>
            </div>
          ))}
          <div className="border-t border-you42-border mt-2 pt-2 flex justify-between">
            <span className="text-white text-sm font-semibold">Total</span>
            <span className="text-white text-sm font-bold">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-you42-error text-xs mt-3">{error}</p>}
      {addingSuccess && <p className="text-you42-success text-xs mt-3">Added to cart!</p>}

      <button
        onClick={handleAddToCart}
        disabled={totalCount === 0 || isLoading}
        className="w-full mt-4 bg-you42-blue hover:bg-you42-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
      >
        {isLoading ? 'Adding...' :
         totalCount > 0
           ? `Add ${totalCount} Seat${totalCount > 1 ? 's' : ''} to Cart`
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
          <p className="text-you42-text-muted text-sm">
            Check back shortly for ticket availability.
          </p>
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
                    >
                      &minus;
                    </button>
                    <span className="w-6 text-center text-white text-sm font-medium">{qty}</span>
                    <button
                      onClick={() => updateQuantity(ticket.id, 1, 0, maxQty)}
                      disabled={qty >= maxQty}
                      className="w-7 h-7 rounded bg-you42-surface text-white text-sm flex items-center justify-center hover:bg-you42-surface-hover disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
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

export default function TicketSelector({ event }) {
  const isReservedSeating = event.eventType === 'RESERVED_SEATING'

  if (isReservedSeating) {
    return <ReservedSeatingSelector event={event} />
  }

  return <StandardTicketSelector event={event} />
}
