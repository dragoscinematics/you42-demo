import { useState, useEffect } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

export default function PaymentForm({ error }) {
  const stripe = useStripe()
  const [paymentRequest, setPaymentRequest] = useState(null)
  const [canMakePayment, setCanMakePayment] = useState(false)

  // Set up Payment Request for Apple Pay / Google Pay detection
  useEffect(() => {
    if (!stripe) return

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'Total',
        amount: 0, // Will be updated by parent via PaymentElement
      },
      requestPayerName: true,
      requestPayerEmail: true,
    })

    pr.canMakePayment().then(result => {
      if (result) {
        setCanMakePayment(true)
      }
    })

    setPaymentRequest(pr)
  }, [stripe])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Payment</h2>

      {canMakePayment && (
        <div className="text-you42-text-secondary text-xs flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-you42-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Apple Pay and Google Pay available</span>
        </div>
      )}

      <div className="bg-you42-bg border border-you42-border rounded-lg px-4 py-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {error && (
        <p className="text-you42-error text-sm">{error}</p>
      )}
      <div className="flex items-center gap-2 text-you42-text-secondary text-xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Secured by Stripe. Your payment details are encrypted.</span>
      </div>
    </div>
  )
}
