import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import EventsListPage from './pages/EventsListPage'
import EventPage from './pages/EventPage'
import CheckoutPage from './pages/CheckoutPage'
import ConfirmationPage from './pages/ConfirmationPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountPage from './pages/AccountPage'
import Auth0CallbackPage from './pages/Auth0CallbackPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<EventsListPage />} />
        <Route path="/events/:slug" element={<EventPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/confirmation/:orderNumber" element={<ConfirmationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/auth/callback" element={<Auth0CallbackPage />} />
      </Route>
    </Routes>
  )
}
