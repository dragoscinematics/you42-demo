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

  const config = { method, headers }
  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(url, config)
  const data = await response.json()

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `API error: ${response.status}`)
  }

  return data
}

export const api = {
  get: (endpoint, params) => request(endpoint, { params }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint, params) => request(endpoint, { method: 'DELETE', params }),
  deleteWithBody: (endpoint, body) => request(endpoint, { method: 'DELETE', body }),
}
