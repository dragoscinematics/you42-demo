import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import CartItem from './CartItem'
import CartSummary from './CartSummary'
import PromoCode from './PromoCode'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatSlotTime, calcDurationHours, formatDuration } from '../../utils/formatTime'

function CartTimer({ expiresAt }) {
  const spanRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        if (spanRef.current) spanRef.current.textContent = '0:00 remaining'
        if (containerRef.current) containerRef.current.className = 'flex items-center gap-1.5 text-xs font-medium text-red-400'
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      if (spanRef.current) spanRef.current.textContent = `${mins}:${String(secs).padStart(2, '0')} remaining`
      if (containerRef.current) {
        containerRef.current.className = `flex items-center gap-1.5 text-xs font-medium ${mins < 2 ? 'text-red-400' : 'text-amber-400'}`
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!expiresAt) return null

  return (
    <div ref={containerRef} className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span ref={spanRef}></span>
    </div>
  )
}

// Group cart items: prefer bookingGroup, fall back to ticketType+date for time slots
function groupCartItems(items) {
  const groups = []
  const used = new Set()

  // First pass: group by bookingGroup
  const bgMap = {}
  for (let i = 0; i < items.length; i++) {
    const bg = items[i].bookingGroup
    if (bg) {
      if (!bgMap[bg]) bgMap[bg] = []
      bgMap[bg].push(i)
    }
  }
  for (const [bg, indices] of Object.entries(bgMap)) {
    const groupItems = indices.map(i => items[i])
    indices.forEach(i => used.add(i))
    groupItems.sort((a, b) => {
      const aTime = a.timeSlot?.startTime || ''
      const bTime = b.timeSlot?.startTime || ''
      return aTime.localeCompare(bTime)
    })
    groups.push({
      key: `bg-${bg}`,
      isTimeSlotGroup: groupItems.length > 1,
      items: groupItems,
    })
  }

  // Second pass: group remaining time slot items by ticketType+date
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue
    const item = items[i]
    const hasTimeSlot = item.timeSlot || item.timeSlotId

    if (hasTimeSlot) {
      const ticketTypeId = item.ticketTypeId || item.ticketType?.id
      const date = item.timeSlot?.date || item.timeSlotDate || ''
      const groupItems = [item]
      used.add(i)

      for (let j = i + 1; j < items.length; j++) {
        if (used.has(j)) continue
        const other = items[j]
        const otherTTId = other.ticketTypeId || other.ticketType?.id
        const otherDate = other.timeSlot?.date || other.timeSlotDate || ''
        if (otherTTId === ticketTypeId && otherDate === date) {
          groupItems.push(other)
          used.add(j)
        }
      }

      groupItems.sort((a, b) => {
        const aTime = a.timeSlot?.startTime || ''
        const bTime = b.timeSlot?.startTime || ''
        return aTime.localeCompare(bTime)
      })

      groups.push({
        key: `group-${ticketTypeId}-${date}`,
        isTimeSlotGroup: groupItems.length > 1,
        items: groupItems,
      })
    } else {
      used.add(i)
      groups.push({
        key: `single-${item.id}`,
        isTimeSlotGroup: false,
        items: [item],
      })
    }
  }

  return groups
}

function GroupedCartItem({ group }) {
  const { removeItems, ticketTypePriceMap } = useCart()
  const items = group.items
  const first = items[0]

  const eventName = first.event?.name || first.eventName || 'Event'
  const ticketName = first.ticketType?.name || first.ticketTypeName || 'Room'
  const ticketTypeId = first.ticketTypeId || first.ticketType?.id
  const priceInfo = ticketTypePriceMap[ticketTypeId]
  const pricePerHour = priceInfo?.allInPrice || first.priceAtTime || 0

  const firstSlot = first.timeSlot
  const lastSlot = items[items.length - 1].timeSlot
  const startTime = firstSlot?.startTime
  const endTime = lastSlot?.endTime
  const date = firstSlot?.date || first.timeSlotDate || ''
  const hours = calcDurationHours(startTime, endTime) || items.length
  const totalPrice = pricePerHour * hours

  let dateDisplay = date
  if (date) {
    try {
      const d = new Date(date + 'T00:00:00')
      dateDisplay = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } catch { /* use raw date */ }
  }

  const handleRemoveAll = (e) => {
    e.stopPropagation()
    const ids = items.map(item => item.id)
    removeItems(ids)
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{eventName}</p>
          <p className="text-you42-text-secondary text-sm">{ticketName}</p>
          {(startTime || date) && (
            <div className="text-slate-500 text-xs mt-1 space-y-0.5">
              {date && <p>{dateDisplay}</p>}
              {startTime && endTime && (
                <p>{formatSlotTime(startTime)} – {formatSlotTime(endTime)}</p>
              )}
            </div>
          )}
          <p className="text-you42-blue font-semibold text-sm mt-1">
            {formatDuration(hours)} × {formatCurrency(pricePerHour)}
          </p>
        </div>

        <button
          onClick={handleRemoveAll}
          className="text-you42-text-secondary hover:text-you42-error transition-colors p-1 shrink-0"
          aria-label="Remove booking"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-slate-400 text-xs">{formatDuration(hours)} booked</span>
        <span className="text-white font-semibold text-sm">
          {formatCurrency(totalPrice)}
        </span>
      </div>
    </div>
  )
}

export default function CartDrawer() {
  const {
    items, isOpen, error, expiresAt,
    closeDrawer, refreshCart,
  } = useCart()
  const navigate = useNavigate()
  const hasRefreshedRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true
        refreshCart()
      }
      document.body.style.overflow = 'hidden'
    } else {
      hasRefreshedRef.current = false
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, refreshCart])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = () => {
    closeDrawer()
    navigate('/checkout')
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-you42-bg z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-you42-border ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-you42-border">
          <div>
            <span className="text-white font-bold">
              Cart {itemCount > 0 && <span className="text-you42-text-secondary font-normal text-sm">({itemCount})</span>}
            </span>
            {items.length > 0 && expiresAt && (
              <div className="mt-0.5">
                <CartTimer expiresAt={expiresAt} />
              </div>
            )}
          </div>
          <button onClick={closeDrawer} className="text-you42-text-secondary hover:text-white transition-colors text-xl leading-none">
            &times;
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-white font-semibold text-sm mb-1">Your cart is empty</p>
              <p className="text-you42-text-muted text-sm">Add some tickets to get started</p>
            </div>
          ) : (
            <div>
              {groupCartItems(items).map(group => (
                group.isTimeSlotGroup ? (
                  <GroupedCartItem key={group.key} group={group} />
                ) : (
                  <CartItem key={group.items[0].id} item={group.items[0]} />
                )
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-you42-border px-5 py-4 space-y-4">
            <PromoCode />
            <CartSummary />
            {error && <p className="text-you42-error text-xs">{error}</p>}
            <button
              onClick={handleCheckout}
              className="w-full bg-you42-blue hover:bg-you42-blue-hover text-white text-sm font-medium py-2.5 rounded transition-colors"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  )
}
