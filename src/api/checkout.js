import { api } from './client'
import { getSessionId } from '../utils/session'

export async function getStripeConfig() {
  const data = await api.get('/checkout/stripe-config')
  return {
    publishableKey: data.publishableKey,
    connectAccountId: data.connectAccountId,
  }
}

export async function getCheckoutSettings() {
  const data = await api.get('/checkout/settings')
  return data.settings
}

export async function describeCheckout({ items, subtotal, sessionId, promoCode }) {
  const body = { items, subtotal, sessionId }
  if (promoCode) body.promoCode = promoCode
  const data = await api.post('/checkout/describe', body)
  return data
}

export async function createPaymentIntent({ cartId, amount, customerInfo, sessionId }) {
  const body = { cartId, amount, customerInfo }
  if (sessionId) body.sessionId = sessionId
  const data = await api.post('/checkout/create-payment-intent', body)
  return data
}

export async function processPayment({ paymentIntentId, cartId, customerInfo, sessionId }) {
  const data = await api.post('/checkout/process-payment', {
    paymentIntentId,
    cartId,
    customerInfo,
    sessionId: sessionId || getSessionId(),
  })
  return data
}
