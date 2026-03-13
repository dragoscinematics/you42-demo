import { API_BASE_URL, API_KEY } from '../config/constants'

async function request(endpoint, options = {}) {
  const { method = 'GET', body, params } = options

  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  }

  // Only send credentials on account/auth endpoints (JWT cookies)
  const needsCredentials = endpoint.startsWith('/accounts')
  const config = { method, headers }
  if (needsCredentials) {
    config.credentials = 'include'
  }
  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(url, config)

  // Handle 204 No Content
  if (response.status === 204) {
    return {}
  }

  const data = await response.json()

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `API error: ${response.status}`)
  }

  return data
}

export const api = {
  get: (endpoint, params) => request(endpoint, { params }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint, params) => request(endpoint, { method: 'DELETE', params }),
  deleteWithBody: (endpoint, body) => request(endpoint, { method: 'DELETE', body }),
}
