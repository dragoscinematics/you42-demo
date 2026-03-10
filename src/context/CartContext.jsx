import { createContext, useContext, useReducer, useCallback, useRef } from 'react'
import * as cartApi from '../api/cart'

const CartContext = createContext()

const initialState = {
  items: [],
  subtotal: 0,
  fees: 0,
  tax: 0,
  discount: 0,
  total: 0,
  promoCode: null,
  cartId: null,
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
      if (!cart) return { ...state, ...initialState, isOpen: state.isOpen }
      const items = (cart.items || []).map(item => ({
        ...item,
        priceAtTime: Number(item.priceAtTime) || 0,
      }))
      const subtotal = items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)
      return {
        ...state,
        items,
        subtotal,
        cartId: cart.id,
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
    case 'CLEAR':
      return { ...initialState }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const skipNextRefresh = useRef(false)

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
      dispatch({ type: 'SET_CART', payload: cart })
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
