import { api } from './client'
import { getSessionId } from '../utils/session'

export async function getCart() {
  const sessionId = getSessionId()
  const data = await api.get('/cart', { sessionId })
  return data.data || data.cart
}

export async function addToCart({ eventId, ticketTypeId, quantity, timeSlotId, timeSlotDate }) {
  const sessionId = getSessionId()
  const body = { sessionId, eventId, ticketTypeId, quantity }
  if (timeSlotId) body.timeSlotId = timeSlotId
  if (timeSlotDate) body.timeSlotDate = timeSlotDate
  const data = await api.post('/cart/items', body)
  return data.data || data.cart
}

export async function updateCartItem(itemId, quantity) {
  const sessionId = getSessionId()
  const data = await api.patch(`/cart/items/${itemId}`, { quantity, sessionId })
  return data.data || data.cart
}

export async function removeCartItem(itemId) {
  const sessionId = getSessionId()
  await api.delete(`/cart/items/${itemId}`, { sessionId })
  // API returns stale data with the item still present, so fetch fresh cart
  const fresh = await api.get('/cart', { sessionId })
  return fresh.data || fresh.cart
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
