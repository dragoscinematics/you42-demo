import { formatCurrency } from '../../utils/formatCurrency'
import { useCart } from '../../context/CartContext'

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

  return (
    <div className="bg-you42-surface rounded-xl border border-you42-border overflow-hidden">
      <div className="p-5 border-b border-you42-border">
        <h3 className="text-lg font-bold text-white">Order Summary</h3>
      </div>

      <div className="p-5 space-y-3">
        {items.map(item => {
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
