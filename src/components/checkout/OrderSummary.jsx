import { formatCurrency } from '../../utils/formatCurrency'
import { formatSlotTime, calcDurationHours, formatDuration } from '../../utils/formatTime'
import { useCart } from '../../context/CartContext'

function groupOrderItems(items) {
  const groups = []
  const used = new Set()

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

      groups.push({ isGroup: groupItems.length > 1, items: groupItems })
    } else {
      used.add(i)
      groups.push({ isGroup: false, items: [item] })
    }
  }
  return groups
}

export default function OrderSummary({ items, totals, promoCode }) {
  const { ticketTypePriceMap } = useCart()

  // Calculate service fees from the price map
  let serviceFees = 0
  let allInTotal = 0
  for (const item of items) {
    const ticketTypeId = item.ticketTypeId || item.ticketType?.id
    const priceInfo = ticketTypePriceMap[ticketTypeId]
    const allInPrice = priceInfo?.allInPrice || item.priceAtTime || 0
    const basePrice = priceInfo?.price || item.priceAtTime || 0
    serviceFees += (allInPrice - basePrice) * item.quantity
    allInTotal += allInPrice * item.quantity
  }

  const baseSubtotal = totals.subtotal || items.reduce((sum, item) => sum + ((item.priceAtTime || 0) * item.quantity), 0)
  const displayTotal = allInTotal - (totals.discount || 0)

  const grouped = groupOrderItems(items)

  return (
    <div className="bg-you42-surface rounded-xl border border-you42-border overflow-hidden">
      <div className="p-5 border-b border-you42-border">
        <h3 className="text-lg font-bold text-white">Order Summary</h3>
      </div>

      <div className="p-5 space-y-3">
        {grouped.map((group, gi) => {
          if (group.isGroup) {
            const first = group.items[0]
            const ticketTypeId = first.ticketTypeId || first.ticketType?.id
            const priceInfo = ticketTypePriceMap[ticketTypeId]
            const allInPrice = priceInfo?.allInPrice || first.priceAtTime || 0
            const firstSlot = first.timeSlot
            const lastSlot = group.items[group.items.length - 1].timeSlot
            const hours = calcDurationHours(firstSlot?.startTime, lastSlot?.endTime) || group.items.length
            return (
              <div key={`group-${gi}`} className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {first.ticketType?.name || first.ticketTypeName}
                  </p>
                  <p className="text-you42-text-secondary text-xs">
                    {formatDuration(hours)}
                    {firstSlot?.startTime && lastSlot?.endTime && (
                      <> &middot; {formatSlotTime(firstSlot.startTime)} – {formatSlotTime(lastSlot.endTime)}</>
                    )}
                  </p>
                </div>
                <span className="text-white text-sm font-medium shrink-0 ml-3">
                  {formatCurrency(allInPrice * hours)}
                </span>
              </div>
            )
          }
          const item = group.items[0]
          const ticketTypeId = item.ticketTypeId || item.ticketType?.id
          const priceInfo = ticketTypePriceMap[ticketTypeId]
          const allInPrice = priceInfo?.allInPrice || item.priceAtTime || 0
          return (
            <div key={item.id} className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {item.event?.name || item.eventName}
                </p>
                <p className="text-you42-text-secondary text-xs">
                  {item.ticketType?.name || item.ticketTypeName} x {item.quantity}
                </p>
              </div>
              <span className="text-white text-sm font-medium shrink-0 ml-3">
                {formatCurrency(allInPrice * item.quantity)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="p-5 border-t border-you42-border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-you42-text-secondary">Subtotal</span>
          <span className="text-white">{formatCurrency(baseSubtotal)}</span>
        </div>
        {serviceFees > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-you42-text-secondary">Service Fees</span>
            <span className="text-white">{formatCurrency(serviceFees)}</span>
          </div>
        )}
        {(totals.tax > 0) && (
          <div className="flex justify-between text-sm">
            <span className="text-you42-text-secondary">Tax</span>
            <span className="text-white">{formatCurrency(totals.tax)}</span>
          </div>
        )}
        {(totals.discount > 0) && (
          <div className="flex justify-between text-sm text-you42-success">
            <span>Discount {promoCode && `(${promoCode})`}</span>
            <span>-{formatCurrency(totals.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold pt-2 border-t border-you42-border">
          <span className="text-white">Total</span>
          <span className="text-white">{formatCurrency(displayTotal)}</span>
        </div>
      </div>
    </div>
  )
}
