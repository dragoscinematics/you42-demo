import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrder } from '../api/orders'
import { formatCurrency } from '../utils/formatCurrency'
import { formatEventDate } from '../utils/formatDate'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function ConfirmationPage() {
  const { orderNumber } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const data = await getOrder(orderNumber)
        setOrder(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderNumber])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-you42-error text-lg font-semibold mb-2">Unable to load order</p>
        <p className="text-you42-text-secondary mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>Back to Event</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="bg-you42-surface rounded-xl border border-you42-border p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-you42-success/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-you42-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-you42-text-secondary mb-6">
          Thank you for your purchase. Your tickets are on the way!
        </p>

        <div className="bg-you42-bg rounded-lg p-4 mb-8 inline-block">
          <p className="text-you42-text-secondary text-xs uppercase tracking-wider mb-1">Order Number</p>
          <p className="text-you42-blue text-xl font-bold">{order?.orderNumber || orderNumber}</p>
        </div>

        {order?.tickets && order.tickets.length > 0 && (
          <div className="text-left border-t border-you42-border pt-6 mt-6">
            <h2 className="text-white font-semibold mb-4">Your Tickets</h2>
            <div className="space-y-3">
              {order.tickets.map((ticket, idx) => (
                <div key={idx} className="flex justify-between items-center bg-you42-bg rounded-lg p-3">
                  <div>
                    <p className="text-white text-sm font-medium">{ticket.ticketTypeName}</p>
                    <p className="text-you42-text-secondary text-xs">
                      {ticket.event?.name}
                    </p>
                    {ticket.ticketNumber && (
                      <p className="text-you42-text-secondary text-xs mt-1">
                        Ticket #{ticket.ticketNumber}
                      </p>
                    )}
                  </div>
                  <span className="text-white text-sm font-medium">
                    {formatCurrency(ticket.ticketTypePrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {order?.totalAmount != null && (
          <div className="border-t border-you42-border pt-4 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Total Paid</span>
              <span className="text-white font-bold text-lg">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        )}

        {order?.customerEmail && (
          <p className="text-you42-text-secondary text-sm mt-6">
            A confirmation email has been sent to{' '}
            <span className="text-white font-medium">{order.customerEmail}</span>
          </p>
        )}

        <div className="mt-8">
          <Button onClick={() => navigate('/')} size="lg">
            Back to Event
          </Button>
        </div>
      </div>
    </div>
  )
}
