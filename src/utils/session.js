const SESSION_KEY = 'pt_session_id'

export function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}
