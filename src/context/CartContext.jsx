import { createContext, useContext, useReducer, useCallback, useRef, useEffect, useMemo } from 'react'
import * as cartApi from '../api/cart'
import { api } from '../api/client'

const CartContext = createContext()

const CART_TIMEOUT_MINUTES = 15
const EXPIRES_AT_KEY = 'pt_cart_expires_at'

function getSavedExpiresAt() {
  try {
    const saved = localStorage.getItem(EXPIRES_AT_KEY)
    if (!saved) return null
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
  expiresAt: getSavedExpiresAt(),
  isOpen: false,
  isLoading: false,
  error: null,
  ticketTypePriceMap: {},
  // IDs that are pending deletion — SET_CART will filter these out
  _pendingDeletes: new Set(),
  // Local cache of time slot metadata (API doesn't expand timeSlot on cart items)
  _slotMeta: {},
}

function buildCartState(state, cart, extra = {}) {
  if (!cart || !cart.items || cart.items.length === 0) {
    saveExpiresAt(null)
    return {
      ...state,
      items: [],
      subtotal: 0,
      cartId: cart?.id || null,
      expiresAt: null,
      promoCode: null,
      discount: 0,
      isLoading: false,
      error: null,
    }
  }

  // Filter out any items that are pending deletion
  const pendingDeletes = state._pendingDeletes
  const slotMeta = state._slotMeta || {}
  let items = cart.items.map(item => {
    const enriched = { ...item, priceAtTime: Number(item.priceAtTime) || 0 }
    // Enrich with local slot metadata if API didn't expand timeSlot
    if (item.timeSlotId && !item.timeSlot && slotMeta[item.timeSlotId]) {
      enriched.timeSlot = slotMeta[item.timeSlotId]
    }
    return enriched
  })
  if (pendingDeletes.size > 0) {
    items = items.filter(item => !pendingDeletes.has(item.id))
  }

  if (items.length === 0) {
    saveExpiresAt(null)
    return {
      ...state,
      items: [],
      subtotal: 0,
      cartId: cart.id,
      expiresAt: null,
      promoCode: null,
      discount: 0,
      isLoading: false,
      error: null,
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

  let expiresAt = state.expiresAt
  if (cart.expiresAt) {
    expiresAt = cart.expiresAt
  } else if (extra.isNewAdd && items.length > 0) {
    const timeout = extra.timeoutMinutes || CART_TIMEOUT_MINUTES
    expiresAt = new Date(Date.now() + timeout * 60 * 1000).toISOString()
  }
  if (items.length > 0 && !expiresAt && cart.updatedAt) {
    const timeout = extra.timeoutMinutes || CART_TIMEOUT_MINUTES
    const expiry = new Date(new Date(cart.updatedAt).getTime() + timeout * 60 * 1000)
    if (expiry <= new Date()) {
      saveExpiresAt(null)
      return { ...state, ...initialState, _pendingDeletes: state._pendingDeletes, isOpen: state.isOpen, error: 'Your cart has expired.' }
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

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }

    case 'MARK_PENDING_DELETE': {
      const next = new Set(state._pendingDeletes)
      for (const id of action.payload) next.add(id)
      // Also immediately remove from visible items
      const remaining = state.items.filter(item => !next.has(item.id))
      const subtotal = remaining.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)
      if (remaining.length === 0) {
        saveExpiresAt(null)
        return { ...state, _pendingDeletes: next, items: [], subtotal: 0, expiresAt: null, promoCode: null, discount: 0 }
      }
      return { ...state, _pendingDeletes: next, items: remaining, subtotal }
    }

    case 'FINISH_DELETE': {
      const next = new Set(state._pendingDeletes)
      for (const id of action.payload) next.delete(id)
      return { ...state, _pendingDeletes: next }
    }

    case 'SET_CART':
      return buildCartState(state, action.payload, action)

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
    case 'SET_SLOT_META':
      return {
        ...state,
        _slotMeta: { ...state._slotMeta, ...action.payload },
      }
    case 'CART_EXPIRED':
      saveExpiresAt(null)
      return { ...initialState, _pendingDeletes: state._pendingDeletes, isOpen: state.isOpen, error: 'Your cart has expired.' }
    case 'CLEAR':
      saveExpiresAt(null)
      return { ...initialState, _pendingDeletes: new Set() }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const cartTimeoutRef = useRef(CART_TIMEOUT_MINUTES)

  useEffect(() => {
    api.get('/checkout/settings')
      .then(data => {
        if (data.settings?.cartTimeoutMinutes) {
          cartTimeoutRef.current = data.settings.cartTimeoutMinutes
        }
      })
      .catch(() => {})
  }, [])

  // Expiration timer
  useEffect(() => {
    if (!state.expiresAt || state.items.length === 0) return
    const expiresAtMs = new Date(state.expiresAt).getTime()
    const checkExpiry = () => {
      if (Date.now() >= expiresAtMs) {
        dispatch({ type: 'CART_EXPIRED' })
      }
    }
    checkExpiry()
    const interval = setInterval(checkExpiry, 1000)
    return () => clearInterval(interval)
  }, [state.expiresAt, state.items.length])

  const refreshCart = useCallback(async () => {
    try {
      const cart = await cartApi.getCart()
      dispatch({ type: 'SET_CART', payload: cart })
    } catch {
      dispatch({ type: 'SET_CART', payload: null })
    }
  }, [])

  const addItem = useCallback(async ({ eventId, ticketTypeId, quantity, timeSlotId, timeSlotDate, bookingGroup, slotMeta }) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      // Store slot metadata locally so we can display times (API doesn't expand timeSlot on cart items)
      if (slotMeta && timeSlotId) {
        dispatch({ type: 'SET_SLOT_META', payload: { [timeSlotId]: slotMeta } })
      }
      const cart = await cartApi.addToCart({ eventId, ticketTypeId, quantity, timeSlotId, timeSlotDate, bookingGroup })
      dispatch({ type: 'SET_CART', payload: cart, timeoutMinutes: cartTimeoutRef.current, isNewAdd: true })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  const addItems = useCallback(async (itemsToAdd) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      // Cache all slot metadata upfront
      const slotMetaPayload = {}
      for (const item of itemsToAdd) {
        if (item.slotMeta && item.timeSlotId) {
          slotMetaPayload[item.timeSlotId] = item.slotMeta
        }
      }
      if (Object.keys(slotMetaPayload).length > 0) {
        dispatch({ type: 'SET_SLOT_META', payload: slotMetaPayload })
      }
      // Use bulk endpoint for speed — single request for all items
      const result = await cartApi.addToCartBulk(itemsToAdd)
      if (!result.success) {
        const failed = result.data?.results?.filter(r => !r.success) || []
        const errorMsg = failed.length > 0 ? failed[0].error : (result.message || 'Failed to add items')
        throw new Error(errorMsg)
      }
      // Fetch full cart after bulk add
      const cart = await cartApi.getCart()
      dispatch({ type: 'SET_CART', payload: cart, timeoutMinutes: cartTimeoutRef.current, isNewAdd: true })
    } catch (err) {
      // If any fail, refresh to get accurate state
      try { const cart = await cartApi.getCart(); dispatch({ type: 'SET_CART', payload: cart }) } catch {}
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
    // Mark as pending delete — removes from UI AND filters from any future SET_CART
    dispatch({ type: 'MARK_PENDING_DELETE', payload: [itemId] })
    try {
      await cartApi.removeCartItem(itemId)
    } catch (err) {
      console.error('removeItem DELETE failed:', err)
    }
    // Delete is done on server, clear from pending set
    dispatch({ type: 'FINISH_DELETE', payload: [itemId] })
  }, [])

  const removeItems = useCallback(async (itemIds) => {
    // Mark all as pending delete — removes from UI AND filters from any future SET_CART
    dispatch({ type: 'MARK_PENDING_DELETE', payload: itemIds })
    for (const id of itemIds) {
      try {
        await cartApi.removeCartItem(id)
      } catch (err) {
        console.error('removeItems DELETE failed:', id, err)
      }
    }
    // All deletes done on server, clear from pending set
    dispatch({ type: 'FINISH_DELETE', payload: itemIds })
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

  const value = useMemo(() => ({
    ...state,
    refreshCart,
    addItem,
    addItems,
    updateItem,
    removeItem,
    removeItems,
    applyPromo,
    removePromo,
    clearCartState,
    toggleDrawer,
    openDrawer,
    closeDrawer,
    setTotals,
    setTicketTypePrices,
  }), [
    state,
    refreshCart, addItem, addItems, updateItem, removeItem, removeItems,
    applyPromo, removePromo, clearCartState,
    toggleDrawer, openDrawer, closeDrawer, setTotals, setTicketTypePrices,
  ])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
