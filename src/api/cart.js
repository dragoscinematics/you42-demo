import { api } from './client'
import { getSessionId } from '../utils/session'

export async function getCart() {
  const sessionId = getSessionId()
  const data = await api.get('/cart', { sessionId })
  const cart = data.data || data.cart
  return cart
}

export async function addToCart({ eventId, ticketTypeId, quantity, timeSlotId, timeSlotDate, bookingGroup }) {
  const sessionId = getSessionId()
  const body = { sessionId, eventId, ticketTypeId, quantity }
  if (timeSlotId) body.timeSlotId = timeSlotId
  if (timeSlotDate) body.timeSlotDate = timeSlotDate
  if (bookingGroup) body.bookingGroup = bookingGroup
  const data = await api.post('/cart/items', body)
  return data.data || data.cart
}

export async function addToCartBulk(items) {
  const sessionId = getSessionId()
  const data = await api.post('/cart/items/bulk', {
    sessionId,
    items: items.map(({ eventId, ticketTypeId, quantity, timeSlotId, timeSlotDate, bookingGroup }) => {
      const item = { eventId, ticketTypeId, quantity }
      if (timeSlotId) item.timeSlotId = timeSlotId
      if (timeSlotDate) item.timeSlotDate = timeSlotDate
      if (bookingGroup) item.bookingGroup = bookingGroup
      return item
    }),
  })
  return data
}

export async function updateCartItem(itemId, quantity) {
  const sessionId = getSessionId()
  const data = await api.patch(`/cart/items/${itemId}`, { quantity, sessionId })
  return data.data || data.cart
}

export async function removeCartItem(itemId) {
  const sessionId = getSessionId()
  const data = await api.delete(`/cart/items/${itemId}`, { sessionId })
  return data.data || data.cart
}

export async function clearCart() {
  const sessionId = getSessionId()
  const data = await api.delete('/cart', { sessionId })
  return data
}

export async function applyPromo(promoCode) {
  const sessionId = getSessionId()
  const data = await api.post('/cart/promo', { sessionId, promoCode })
  return data.data || data.cart
}

export async function removePromo() {
  const sessionId = getSessionId()
  const data = await api.deleteWithBody('/cart/promo', { sessionId })
  return data.data || data.cart
}
