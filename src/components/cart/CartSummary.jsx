import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/formatCurrency'

export default function CartSummary() {
  const { items, subtotal, discount, promoCode, ticketTypePriceMap } = useCart()

  if (items.length === 0) return null

  const baseSubtotal = subtotal || items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

  // Calculate all-in subtotal and service fees from price map
  let allInSubtotal = 0
  let serviceFees = 0
  for (const item of items) {
    const ticketTypeId = item.ticketTypeId || item.ticketType?.id
    const priceInfo = ticketTypePriceMap[ticketTypeId]
    const allInPrice = priceInfo?.allInPrice || item.priceAtTime || 0
    const basePrice = priceInfo?.price || item.priceAtTime || 0
    allInSubtotal += allInPrice * item.quantity
    serviceFees += (allInPrice - basePrice) * item.quantity
  }

  const displayTotal = allInSubtotal - discount

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-you42-text-secondary">
        <span>Subtotal</span>
        <span className="text-white">{formatCurrency(baseSubtotal)}</span>
      </div>
      {serviceFees > 0 && (
        <div className="flex justify-between text-you42-text-secondary">
          <span>Service Fees</span>
          <span className="text-white">{formatCurrency(serviceFees)}</span>
        </div>
      )}
      {discount > 0 && (
        <div className="flex justify-between text-you42-success">
          <span>Discount {promoCode && `(${promoCode})`}</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-you42-border">
        <span>Estimated Total</span>
        <span>{formatCurrency(displayTotal)}</span>
      </div>
    </div>
  )
}
