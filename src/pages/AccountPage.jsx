import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getOrders, getTickets } from '../api/accounts'
import { formatCurrency } from '../utils/formatCurrency'

function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrders()
      .then(data => setOrders(Array.isArray(data) ? data : data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-sm py-4">Loading orders...</p>
  if (orders.length === 0) return <p className="text-slate-400 text-sm py-4">No orders yet.</p>

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <div key={order.id || order.orderNumber} className="bg-you42-surface border border-you42-border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white text-sm font-medium">Order #{order.orderNumber}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
              </p>
            </div>
            <span className="text-you42-blue text-sm font-semibold">
              {formatCurrency(order.total || order.grandTotal || 0)}
            </span>
          </div>
          {order.items && (
            <div className="mt-2 space-y-1">
              {order.items.map((item, i) => (
                <p key={i} className="text-slate-400 text-xs">
                  {item.quantity}x {item.ticketType?.name || item.ticketTypeName || 'Ticket'}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TicketsTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTickets()
      .then(data => setTickets(Array.isArray(data) ? data : data.tickets || []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-sm py-4">Loading tickets...</p>
  if (tickets.length === 0) return <p className="text-slate-400 text-sm py-4">No tickets yet.</p>

  return (
    <div className="space-y-3">
      {tickets.map(ticket => (
        <div key={ticket.id || ticket.ticketNumber} className="bg-you42-surface border border-you42-border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white text-sm font-medium">{ticket.event?.name || ticket.eventName || 'Event'}</p>
              <p className="text-slate-400 text-xs">{ticket.ticketType?.name || ticket.ticketTypeName || 'Ticket'}</p>
              {ticket.ticketNumber && (
                <p className="text-slate-500 text-xs mt-1">#{ticket.ticketNumber}</p>
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              ticket.status === 'VALID' ? 'bg-green-500/20 text-green-400' :
              ticket.status === 'USED' ? 'bg-slate-500/20 text-slate-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {ticket.status || 'Active'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AccountPage() {
  const { customer, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('orders')

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div className="w-6 h-6 border-2 border-you42-blue border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!isAuthenticated) {
    navigate('/login', { replace: true })
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const tabs = [
    { key: 'orders', label: 'Orders' },
    { key: 'tickets', label: 'Tickets' },
  ]

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            {customer?.firstName} {customer?.lastName}
          </h1>
          <p className="text-slate-400 text-sm">{customer?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Log Out
        </button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-you42-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-you42-blue text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <OrdersTab />}
      {tab === 'tickets' && <TicketsTab />}
    </div>
  )
}
