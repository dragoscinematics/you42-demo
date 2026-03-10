import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import EventsListPage from './pages/EventsListPage'
import EventPage from './pages/EventPage'
import CheckoutPage from './pages/CheckoutPage'
import ConfirmationPage from './pages/ConfirmationPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<EventsListPage />} />
        <Route path="/events/:slug" element={<EventPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/confirmation/:orderNumber" element={<ConfirmationPage />} />
      </Route>
    </Routes>
  )
}
