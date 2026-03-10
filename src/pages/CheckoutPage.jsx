import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '../context/CartContext'
import { getStripeConfig, getCheckoutSettings, describeCheckout, createPaymentIntent, processPayment } from '../api/checkout'
import { getSessionId } from '../utils/session'
import CustomerForm from '../components/checkout/CustomerForm'
import PaymentForm from '../components/checkout/PaymentForm'
import OrderSummary from '../components/checkout/OrderSummary'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

function CheckoutForm({ settings, stripeConfig }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const { items, subtotal, promoCode, cartId, clearCartState, refreshCart, ticketTypePriceMap } = useCart()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    agreeToTerms: false,
    marketingOptIn: false,
  })
  const [errors, setErrors] = useState({})
  const [paymentError, setPaymentError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [totals, setTotals] = useState({ subtotal: 0, fees: 0, tax: 0, discount: 0, total: 0 })

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  // Compute all-in total from price map
  const allInTotal = useMemo(() => {
    let total = 0
    for (const item of items) {
      const ticketTypeId = item.ticketTypeId || item.ticketType?.id
      const priceInfo = ticketTypePriceMap[ticketTypeId]
      const allInPrice = priceInfo?.allInPrice || item.priceAtTime || 0
      total += allInPrice * item.quantity
    }
    return total
  }, [items, ticketTypePriceMap])

  useEffect(() => {
    async function fetchTotals() {
      if (items.length === 0) return
      try {
        const checkoutItems = items.map(item => ({
          ticketTypeId: item.ticketTypeId || item.ticketType?.id,
          quantity: item.quantity,
          price: item.priceAtTime,
        }))
        const calculatedSubtotal = items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)
        const result = await describeCheckout({
          items: checkoutItems,
          subtotal: calculatedSubtotal,
          sessionId: getSessionId(),
          promoCode: promoCode || undefined,
        })

        // Compute service fees from the price map
        let serviceFees = 0
        for (const item of items) {
          const ticketTypeId = item.ticketTypeId || item.ticketType?.id
          const priceInfo = ticketTypePriceMap[ticketTypeId]
          if (priceInfo) {
            serviceFees += (priceInfo.allInPrice - priceInfo.price) * item.quantity
          }
        }

        setTotals({
          subtotal: result.subtotal || calculatedSubtotal,
          fees: serviceFees || result.fees || 0,
          tax: result.tax || 0,
          discount: result.discount || 0,
          total: allInTotal - (result.discount || 0),
        })
      } catch {
        const calculatedSubtotal = items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)
        let serviceFees = 0
        for (const item of items) {
          const ticketTypeId = item.ticketTypeId || item.ticketType?.id
          const priceInfo = ticketTypePriceMap[ticketTypeId]
          if (priceInfo) {
            serviceFees += (priceInfo.allInPrice - priceInfo.price) * item.quantity
          }
        }
        setTotals({
          subtotal: calculatedSubtotal,
          fees: serviceFees,
          tax: 0,
          discount: 0,
          total: allInTotal,
        })
      }
    }
    fetchTotals()
  }, [items, promoCode, ticketTypePriceMap, allInTotal])

  const validate = () => {
    const newErrors = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'Required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Required'
    if (!formData.email.trim()) newErrors.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email'
    if (settings?.requirePhone !== false && settings?.phoneRequired !== false) {
      const digits = formData.phone.replace(/\D/g, '')
      if (digits.length < 10) newErrors.phone = 'Valid phone number required'
    }
    if (settings?.requireAddress !== false) {
      if (!formData.address.trim()) newErrors.address = 'Required'
      if (!formData.city.trim()) newErrors.city = 'Required'
      if (!formData.state) newErrors.state = 'Required'
      if (!formData.zip.trim()) newErrors.zip = 'Required'
      else if (!/^\d{5}(-\d{4})?$/.test(formData.zip)) newErrors.zip = 'Invalid ZIP'
    }
    if (settings?.showTermsAndConditions && !formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate() || !stripe || !elements) return

    setProcessing(true)
    setPaymentError(null)

    try {
      const customerInfo = {
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        phone: formData.phone,
        address: formData.address.trim(),
        address2: formData.address2.trim(),
        city: formData.city.trim(),
        state: formData.state,
        zip: formData.zip.trim(),
        zipCode: formData.zip.trim(),
        postalCode: formData.zip.trim(),
      }

      // Confirm payment using the PaymentElement (clientSecret is already
      // bound via the Elements provider from the upfront PaymentIntent)
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: `${customerInfo.firstName} ${customerInfo.lastName}`,
              email: customerInfo.email,
              phone: customerInfo.phone,
              address: {
                line1: customerInfo.address,
                line2: customerInfo.address2,
                city: customerInfo.city,
                state: customerInfo.state,
                postal_code: customerInfo.zip,
                country: 'US',
              },
            },
          },
        },
        redirect: 'if_required',
      })

      if (stripeError) {
        setPaymentError(stripeError.message)
        setProcessing(false)
        return
      }

      const result = await processPayment({
        paymentIntentId: paymentIntent.id,
        cartId,
        customerInfo,
        sessionId: getSessionId(),
      })

      clearCartState()
      const orderNumber = result.order?.orderNumber || result.orderNumber
      navigate(`/confirmation/${orderNumber}`)
    } catch (err) {
      setPaymentError(err.message || 'Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-white text-xl font-semibold mb-2">Your cart is empty</p>
          <p className="text-you42-text-secondary mb-6">Add some tickets before checking out.</p>
          <Button onClick={() => navigate('/')}>Back to Event</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-you42-surface rounded-xl border border-you42-border p-6">
              <CustomerForm
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                settings={settings}
              />
            </div>
            <div className="bg-you42-surface rounded-xl border border-you42-border p-6">
              <PaymentForm error={paymentError} />
            </div>
            <Button
              type="submit"
              disabled={!stripe || processing}
              loading={processing}
              className="w-full"
              size="lg"
            >
              {processing ? 'Processing Payment...' : `Pay ${allInTotal > 0 ? `$${allInTotal.toFixed(2)}` : ''}`}
            </Button>
          </div>
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <OrderSummary items={items} totals={totals} promoCode={promoCode} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CheckoutPage() {
  const [stripePromise, setStripePromise] = useState(null)
  const [settings, setSettings] = useState(null)
  const [stripeConfig, setStripeConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState(null)
  const { items, cartId, ticketTypePriceMap } = useCart()

  // Compute allInTotal for PaymentIntent creation
  const allInTotal = useMemo(() => {
    let total = 0
    for (const item of items) {
      const ticketTypeId = item.ticketTypeId || item.ticketType?.id
      const priceInfo = ticketTypePriceMap[ticketTypeId]
      const allInPrice = priceInfo?.allInPrice || item.priceAtTime || 0
      total += allInPrice * item.quantity
    }
    return total
  }, [items, ticketTypePriceMap])

  useEffect(() => {
    async function init() {
      try {
        const [config, checkoutSettings] = await Promise.all([
          getStripeConfig(),
          getCheckoutSettings(),
        ])
        setStripeConfig(config)
        setSettings(checkoutSettings)
        const promise = loadStripe(config.publishableKey, {
          stripeAccount: config.connectAccountId,
        })
        setStripePromise(promise)
      } catch (err) {
        console.error('Failed to initialize checkout:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Create PaymentIntent upfront once we have cart and stripe config
  useEffect(() => {
    async function createIntent() {
      if (!cartId || allInTotal <= 0) return
      try {
        const amountInCents = Math.round(allInTotal * 100)
        const paymentData = await createPaymentIntent({
          cartId,
          amount: amountInCents,
          customerInfo: {},
          sessionId: getSessionId(),
        })
        setClientSecret(paymentData.clientSecret)
      } catch (err) {
        console.error('Failed to create payment intent:', err)
      }
    }
    createIntent()
  }, [cartId, allInTotal])

  if (loading || !stripePromise) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Wait for clientSecret before rendering Elements with PaymentElement
  if (!clientSecret) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const elementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#0091ff',
        colorBackground: '#1a1a1a',
        colorText: '#f0f0f0',
        colorDanger: '#de0000',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          backgroundColor: '#111',
          border: '1px solid #333',
          color: '#f0f0f0',
        },
        '.Input:focus': {
          borderColor: '#0091ff',
          boxShadow: '0 0 0 1px #0091ff',
        },
        '.Label': {
          color: '#999',
        },
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutForm settings={settings} stripeConfig={stripeConfig} />
    </Elements>
  )
}
