import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'
import * as cartApi from '../api/cart'
import { api } from '../api/client'

const CartContext = createContext()

const CART_TIMEOUT_MINUTES = 15 // default, overridden by API
const EXPIRES_AT_KEY = 'pt_cart_expires_at'

function getSavedExpiresAt() {
  try {
    const saved = localStorage.getItem(EXPIRES_AT_KEY)
    if (!saved) return null
    // If already expired, clear it
    if (new Date(saved) <= new Date()) {
      localStorage.removeItem(EXPIRES_AT_KEY)
      return null
    }
    return saved
  } catch { return null }
}

function saveExpiresAt(expiresAt) {
  try {
    if (expiresAt) {
      localStorage.setItem(EXPIRES_AT_KEY, expiresAt)
    } else {
      localStorage.removeItem(EXPIRES_AT_KEY)
    }
  } catch {}
}

const initialState = {
  items: [],
  subtotal: 0,
  fees: 0,
  tax: 0,
  discount: 0,
  total: 0,
  promoCode: null,
  cartId: null,
  expiresAt: getSavedExpiresAt(), // restore from localStorage
  isOpen: false,
  isLoading: false,
  error: null,
  ticketTypePriceMap: {}, // ticketTypeId -> { price, allInPrice }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_CART': {
      const cart = action.payload
      if (!cart) {
        saveExpiresAt(null)
        return { ...state, ...initialState, isOpen: state.isOpen }
      }
      const items = (cart.items || []).map(item => ({
        ...item,
        priceAtTime: Number(item.priceAtTime) || 0,
      }))
      const subtotal = items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

      let expiresAt = state.expiresAt
      if (cart.expiresAt) {
        // API provides expiration — use it
        expiresAt = cart.expiresAt
      } else if (action.isNewAdd && items.length > 0) {
        // Only reset timer on explicit add-to-cart, not on refresh
        const timeout = action.timeoutMinutes || CART_TIMEOUT_MINUTES
        expiresAt = new Date(Date.now() + timeout * 60 * 1000).toISOString()
      } else if (items.length === 0) {
        expiresAt = null
      }
      // If we loaded a cart from API but have no saved expiration, calculate from updatedAt
      if (items.length > 0 && !expiresAt && cart.updatedAt) {
        const timeout = action.timeoutMinutes || CART_TIMEOUT_MINUTES
        const expiry = new Date(new Date(cart.updatedAt).getTime() + timeout * 60 * 1000)
        if (expiry <= new Date()) {
          // Already expired — clear it
          saveExpiresAt(null)
          return { ...state, ...initialState, isOpen: state.isOpen, error: 'Your cart has expired. Please add items again.' }
        }
        expiresAt = expiry.toISOString()
      }

      saveExpiresAt(expiresAt)
      return {
        ...state,
        items,
        subtotal,
        cartId: cart.id,
        expiresAt,
        promoCode: cart.promoCode || null,
        discount: cart.discount || 0,
        isLoading: false,
        error: null,
      }
    }
    case 'TOGGLE_DRAWER':
      return { ...state, isOpen: !state.isOpen }
    case 'OPEN_DRAWER':
      return { ...state, isOpen: true }
    case 'CLOSE_DRAWER':
      return { ...state, isOpen: false }
    case 'SET_TOTALS':
      return {
        ...state,
        fees: action.payload.fees || 0,
        tax: action.payload.tax || 0,
        discount: action.payload.discount || 0,
        total: action.payload.total || 0,
      }
    case 'SET_TICKET_TYPE_PRICES':
      return {
        ...state,
        ticketTypePriceMap: { ...state.ticketTypePriceMap, ...action.payload },
      }
    case 'SET_EXPIRES_AT':
      return { ...state, expiresAt: action.payload }
    case 'CART_EXPIRED':
      saveExpiresAt(null)
      return { ...initialState, isOpen: state.isOpen, error: 'Your cart has expired. Please add items again.' }
    case 'CLEAR':
      saveExpiresAt(null)
      return { ...initialState }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const skipNextRefresh = useRef(false)
  const cartTimeoutRef = useRef(CART_TIMEOUT_MINUTES)

  // Fetch cart timeout from checkout settings
  useEffect(() => {
    api.get('/checkout/settings')
      .then(data => {
        if (data.settings?.cartTimeoutMinutes) {
          cartTimeoutRef.current = data.settings.cartTimeoutMinutes
        }
      })
      .catch(() => {}) // fallback to default
  }, [])

  // Expiration timer — check every second when cart has items
  useEffect(() => {
    if (!state.expiresAt || state.items.length === 0) return
    const checkExpiry = () => {
      if (new Date(state.expiresAt) <= new Date()) {
        dispatch({ type: 'CART_EXPIRED' })
      }
    }
    checkExpiry()
    const interval = setInterval(checkExpiry, 1000)
    return () => clearInterval(interval)
  }, [state.expiresAt, state.items.length])

  const refreshCart = useCallback(async () => {
    if (skipNextRefresh.current) {
      skipNextRefresh.current = false
      return
    }
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const cart = await cartApi.getCart()
      dispatch({ type: 'SET_CART', payload: cart })
    } catch (err) {
      dispatch({ type: 'SET_CART', payload: null })
    }
  }, [])

  const addItem = useCallback(async ({ eventId, ticketTypeId, quantity, timeSlotId, timeSlotDate }) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const cart = await cartApi.addToCart({ eventId, ticketTypeId, quantity, timeSlotId, timeSlotDate })
      dispatch({ type: 'SET_CART', payload: cart, timeoutMinutes: cartTimeoutRef.current, isNewAdd: true })
      skipNextRefresh.current = true
      dispatch({ type: 'OPEN_DRAWER' })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  const updateItem = useCallback(async (itemId, quantity) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const cart = await cartApi.updateCartItem(itemId, quantity)
      dispatch({ type: 'SET_CART', payload: cart })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }, [])

  const removeItem = useCallback(async (itemId) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const cart = await cartApi.removeCartItem(itemId)
      dispatch({ type: 'SET_CART', payload: cart })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }, [])

  const applyPromo = useCallback(async (code) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const cart = await cartApi.applyPromo(code)
      dispatch({ type: 'SET_CART', payload: cart })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  const removePromo = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const cart = await cartApi.removePromo()
      dispatch({ type: 'SET_CART', payload: cart })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }, [])

  const clearCartState = useCallback(() => {
    dispatch({ type: 'CLEAR' })
  }, [])

  const toggleDrawer = useCallback(() => dispatch({ type: 'TOGGLE_DRAWER' }), [])
  const openDrawer = useCallback(() => dispatch({ type: 'OPEN_DRAWER' }), [])
  const closeDrawer = useCallback(() => dispatch({ type: 'CLOSE_DRAWER' }), [])
  const setTotals = useCallback((totals) => dispatch({ type: 'SET_TOTALS', payload: totals }), [])
  const setTicketTypePrices = useCallback((priceMap) => dispatch({ type: 'SET_TICKET_TYPE_PRICES', payload: priceMap }), [])

  return (
    <CartContext.Provider value={{
      ...state,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      applyPromo,
      removePromo,
      clearCartState,
      toggleDrawer,
      openDrawer,
      closeDrawer,
      setTotals,
      setTicketTypePrices,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
