import { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react'
import { API_BASE_URL, API_KEY } from '../config/constants'

const AuthContext = createContext()

// ---------------------------------------------------------------------------
// Internal fetch helper with credentials: 'include' for JWT cookie auth
// ---------------------------------------------------------------------------
async function authRequest(endpoint, options = {}) {
  const { method = 'GET', body } = options

  const url = `${API_BASE_URL}${endpoint}`

  const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  }

  const config = { method, headers, credentials: 'include' }
  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(url, config)

  // Handle 204 No Content (e.g. logout)
  if (response.status === 204) {
    return null
  }

  const data = await response.json()

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `API error: ${response.status}`)
  }

  return data
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
const initialState = {
  customer: null,
  isAuthenticated: false,
  isLoading: true, // true on mount while checking session
  error: null,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true, error: null }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        customer: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        customer: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload || null,
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'LOGOUT':
      return { ...initialState, isLoading: false }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // --- Check existing session on mount ---
  const checkAuth = useCallback(async () => {
    dispatch({ type: 'SET_LOADING' })
    try {
      const data = await authRequest('/accounts/me')
      dispatch({ type: 'AUTH_SUCCESS', payload: data.customer || data })
    } catch {
      dispatch({ type: 'AUTH_FAILURE' })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // --- Register ---
  const register = useCallback(async (email, password, firstName, lastName) => {
    dispatch({ type: 'SET_LOADING' })
    try {
      await authRequest('/accounts/register', {
        method: 'POST',
        body: { email, password, firstName, lastName },
      })
      // After registration the API sets cookies; fetch the user profile
      const data = await authRequest('/accounts/me')
      dispatch({ type: 'AUTH_SUCCESS', payload: data.customer || data })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  // --- Login ---
  const login = useCallback(async (email, password) => {
    dispatch({ type: 'SET_LOADING' })
    try {
      await authRequest('/accounts/login', {
        method: 'POST',
        body: { email, password },
      })
      // Cookies are set by the API; fetch user data
      const data = await authRequest('/accounts/me')
      dispatch({ type: 'AUTH_SUCCESS', payload: data.customer || data })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  // --- Logout ---
  const logout = useCallback(async () => {
    try {
      await authRequest('/accounts/logout', { method: 'POST' })
    } catch {
      // Even if the API call fails, clear local state
    }
    dispatch({ type: 'LOGOUT' })
  }, [])

  // --- Update profile ---
  const updateProfile = useCallback(async (data) => {
    dispatch({ type: 'SET_LOADING' })
    try {
      const result = await authRequest('/accounts/profile', {
        method: 'PUT',
        body: data,
      })
      dispatch({ type: 'AUTH_SUCCESS', payload: result.customer || result })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  // --- Forgot password ---
  const forgotPassword = useCallback(async (email) => {
    dispatch({ type: 'SET_LOADING' })
    try {
      await authRequest('/accounts/forgot-password', {
        method: 'POST',
        body: { email },
      })
      dispatch({ type: 'CLEAR_ERROR' })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  // --- Reset password ---
  const resetPassword = useCallback(async (token, password) => {
    dispatch({ type: 'SET_LOADING' })
    try {
      await authRequest('/accounts/reset-password', {
        method: 'POST',
        body: { token, password },
      })
      dispatch({ type: 'CLEAR_ERROR' })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  // --- Auth0 SSO ---
  const loginWithAuth0 = useCallback(() => {
    const returnUrl = encodeURIComponent(window.location.origin)
    window.location.href = `${API_BASE_URL}/accounts/auth0/login?returnUrl=${returnUrl}`
  }, [])

  const handleAuth0Complete = useCallback(async () => {
    dispatch({ type: 'SET_LOADING' })
    try {
      await authRequest('/accounts/auth0/complete')
      const data = await authRequest('/accounts/me')
      dispatch({ type: 'AUTH_SUCCESS', payload: data.customer || data })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }, [])

  // --- Clear error helper ---
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const value = useMemo(() => ({
    ...state,
    register,
    login,
    logout,
    checkAuth,
    updateProfile,
    forgotPassword,
    resetPassword,
    loginWithAuth0,
    handleAuth0Complete,
    clearError,
  }), [
    state,
    register, login, logout, checkAuth, updateProfile,
    forgotPassword, resetPassword, loginWithAuth0, handleAuth0Complete,
    clearError,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
