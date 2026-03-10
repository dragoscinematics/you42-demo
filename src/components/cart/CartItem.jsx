import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/formatCurrency'

export default function CartItem({ item }) {
  const { updateItem, removeItem, ticketTypePriceMap } = useCart()

  const eventName = item.event?.name || item.eventName || 'Event'
  const ticketName = item.ticketType?.name || item.ticketTypeName || 'Ticket'
  const basePrice = item.priceAtTime || item.ticketType?.price || 0
  const ticketTypeId = item.ticketTypeId || item.ticketType?.id
  const priceInfo = ticketTypePriceMap[ticketTypeId]
  const displayPrice = priceInfo?.allInPrice || basePrice
  const maxQty = item.ticketType?.maxQuantity || 10

  return (
    <div className="p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{eventName}</p>
          <p className="text-you42-text-secondary text-sm">{ticketName}</p>
          <p className="text-you42-blue font-semibold text-sm mt-1">
            {formatCurrency(displayPrice)} each
            {priceInfo?.allInPrice && priceInfo.allInPrice !== priceInfo.price && (
              <span className="text-you42-text-muted text-xs font-normal ml-1">(all-in)</span>
            )}
          </p>
        </div>

        <button
          onClick={() => removeItem(item.id)}
          className="text-you42-text-secondary hover:text-you42-error transition-colors p-1 shrink-0"
          aria-label="Remove item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
            disabled={item.quantity <= 1}
            className="w-7 h-7 rounded bg-you42-surface border border-you42-border flex items-center justify-center text-white text-sm hover:bg-you42-surface-hover disabled:opacity-30 transition-colors"
          >
            -
          </button>
          <span className="w-6 text-center text-white text-sm font-semibold">{item.quantity}</span>
          <button
            onClick={() => updateItem(item.id, Math.min(maxQty, item.quantity + 1))}
            disabled={item.quantity >= maxQty}
            className="w-7 h-7 rounded bg-you42-surface border border-you42-border flex items-center justify-center text-white text-sm hover:bg-you42-surface-hover disabled:opacity-30 transition-colors"
          >
            +
          </button>
        </div>
        <span className="text-white font-semibold text-sm">
          {formatCurrency(displayPrice * item.quantity)}
        </span>
      </div>
    </div>
  )
}
