import { useState } from 'react'
import { useCart } from '../../context/CartContext'

export default function PromoCode() {
  const { promoCode, applyPromo, removePromo, isLoading } = useCart()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)

  const handleApply = async () => {
    if (!code.trim()) return
    setError(null)
    try {
      await applyPromo(code.trim())
      setCode('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (promoCode) {
    return (
      <div className="flex items-center justify-between bg-you42-success/10 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-you42-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-you42-success text-sm font-medium">{promoCode}</span>
        </div>
        <button
          onClick={removePromo}
          disabled={isLoading}
          className="text-you42-text-secondary hover:text-white text-sm transition-colors"
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
          placeholder="Promo code"
          className="flex-1 bg-you42-bg border border-you42-border rounded-lg px-3 py-2 text-sm text-white placeholder-you42-text-secondary focus:outline-none focus:border-you42-blue transition-colors"
        />
        <button
          onClick={handleApply}
          disabled={!code.trim() || isLoading}
          className="px-4 py-2 bg-you42-surface border border-you42-border rounded-lg text-sm text-white font-medium hover:bg-you42-surface-hover disabled:opacity-50 transition-colors"
        >
          Apply
        </button>
      </div>
      {error && <p className="text-you42-error text-xs mt-1">{error}</p>}
    </div>
  )
}
