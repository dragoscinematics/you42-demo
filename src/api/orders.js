import { api } from './client'

export async function getOrder(orderNumber) {
  const data = await api.get(`/orders/${orderNumber}`)
  return data.data || data.order
}
