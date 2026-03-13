import { api } from './client'
import { API_BASE_URL } from '../config/constants'

// ---------------------------------------------------------------------------
// NOTE: The login and register endpoints set JWT cookies. The api client in
// client.js does NOT currently include `credentials: 'include'` in its fetch
// calls, which means the browser will not send or store those cookies. For
// account endpoints to work correctly, `credentials: 'include'` must be added
// to the fetch config in client.js's `request` function.
// ---------------------------------------------------------------------------

// ---- Customer Registration & Auth ----------------------------------------

export async function register({ email, password, firstName, lastName }) {
  const data = await api.post('/accounts/register', {
    email,
    password,
    firstName,
    lastName,
  })
  return data.data || data
}

export async function login({ email, password }) {
  const data = await api.post('/accounts/login', { email, password })
  return data.data || data
}

export async function logout() {
  const data = await api.post('/accounts/logout')
  return data
}

export async function getMe() {
  const data = await api.get('/accounts/me')
  return data.data || data
}

// ---- Profile -------------------------------------------------------------

export async function getProfile() {
  const data = await api.get('/accounts/profile')
  return data.data || data
}

export async function updateProfile({ firstName, lastName, phone, ...rest }) {
  const data = await api.put('/accounts/profile', {
    firstName,
    lastName,
    phone,
    ...rest,
  })
  return data.data || data
}

// ---- Orders & Tickets ----------------------------------------------------

export async function getOrders() {
  const data = await api.get('/accounts/orders')
  return data.data || data
}

export async function getTickets() {
  const data = await api.get('/accounts/tickets')
  return data.data || data
}

// ---- Ticket Transfers ----------------------------------------------------

export async function getTransfers() {
  const data = await api.get('/accounts/transfers')
  return data.data || data
}

export async function transferTicket({ ticketId, recipientEmail }) {
  const data = await api.post('/accounts/transfers', {
    ticketId,
    recipientEmail,
  })
  return data.data || data
}

// ---- Password Reset ------------------------------------------------------

export async function forgotPassword({ email }) {
  const data = await api.post('/accounts/forgot-password', { email })
  return data
}

export async function resetPassword({ token, password }) {
  const data = await api.post('/accounts/reset-password', { token, password })
  return data
}

// ---- Email Verification --------------------------------------------------

export async function verifyEmail({ token }) {
  const data = await api.post('/accounts/verify-email', { token })
  return data
}

export async function resendVerification({ email }) {
  const data = await api.post('/accounts/resend-verification', { email })
  return data
}

// ---- Member-Gated Events -------------------------------------------------

export async function getMemberEvents() {
  const data = await api.get('/accounts/member-events')
  return data.data || data
}

// ---- SSO (Auth0) ---------------------------------------------------------
// These endpoints redirect the browser rather than returning JSON, so we use
// window.location instead of fetch.

export function auth0Login(returnUrl) {
  const ret = encodeURIComponent(returnUrl || window.location.href)
  window.location.href = `${API_BASE_URL}/accounts/auth0/login?returnUrl=${ret}`
}

export function auth0Callback() {
  window.location.href = `${API_BASE_URL}/accounts/auth0/callback`
}

export function auth0Complete() {
  window.location.href = `${API_BASE_URL}/accounts/auth0/complete`
}

// ---- Customer Tags (admin) -----------------------------------------------

export async function syncCustomerTags(body) {
  const data = await api.post('/v1/customers/tags', body)
  return data.data || data
}
