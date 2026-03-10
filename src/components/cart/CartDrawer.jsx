import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import CartItem from './CartItem'
import CartSummary from './CartSummary'
import PromoCode from './PromoCode'
import Spinner from '../ui/Spinner'

export default function CartDrawer() {
  const {
    items, isOpen, isLoading, error,
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
          <span className="text-white font-bold">
            Cart {itemCount > 0 && <span className="text-you42-text-secondary font-normal text-sm">({itemCount})</span>}
          </span>
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
