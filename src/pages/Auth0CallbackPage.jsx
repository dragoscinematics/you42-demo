import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Auth0CallbackPage() {
  const { handleAuth0Complete } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    handleAuth0Complete()
      .then(() => navigate('/account', { replace: true }))
      .catch(() => navigate('/login', { replace: true }))
  }, [handleAuth0Complete, navigate])

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-you42-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Completing sign in...</p>
      </div>
    </div>
  )
}
