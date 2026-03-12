import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import CartItem from './CartItem'
import CartSummary from './CartSummary'
import PromoCode from './PromoCode'
import Spinner from '../ui/Spinner'

function CartTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const now = Date.now()
      const exp = new Date(expiresAt).getTime()
      const diff = exp - now
      if (diff <= 0) {
        setTimeLeft('0:00')
        setUrgent(true)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${mins}:${String(secs).padStart(2, '0')}`)
      setUrgent(mins < 2)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!expiresAt || !timeLeft) return null

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{timeLeft} remaining</span>
    </div>
  )
}

export default function CartDrawer() {
  const {
    items, isOpen, isLoading, error, expiresAt,
    closeDrawer, refreshCart,
  } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      refreshCart()
      document.body.style.overflow = 'hidden'
    } else {
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
          {isLoading && items.length === 0 ? (
            <div className="py-12"><Spinner /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-white font-semibold text-sm mb-1">Your cart is empty</p>
              <p className="text-you42-text-muted text-sm">Add some tickets to get started</p>
            </div>
          ) : (
            <div>
              {items.map(item => (
                <CartItem key={item.id} item={item} />
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
