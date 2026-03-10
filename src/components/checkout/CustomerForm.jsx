const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

export default function CustomerForm({ formData, setFormData, errors, settings }) {
  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleCheckboxChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.checked }))
  }

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value)
    setFormData(prev => ({ ...prev, phone: formatted }))
  }

  const inputClasses = (field) =>
    `w-full bg-you42-bg border ${errors[field] ? 'border-you42-error' : 'border-you42-border'} rounded-lg px-4 py-3 text-white placeholder-you42-text-secondary/60 focus:outline-none focus:border-you42-blue transition-colors text-sm`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          {settings?.formTitle || 'Customer Information'}
        </h2>
        {settings?.formDescription && (
          <p className="text-you42-text-secondary text-sm">{settings.formDescription}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
            First Name <span className="text-you42-error">*</span>
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={handleChange('firstName')}
            className={inputClasses('firstName')}
            placeholder="First name"
          />
          {errors.firstName && <p className="text-you42-error text-xs mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
            Last Name <span className="text-you42-error">*</span>
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={handleChange('lastName')}
            className={inputClasses('lastName')}
            placeholder="Last name"
          />
          {errors.lastName && <p className="text-you42-error text-xs mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
          {settings?.emailLabel || 'Email Address'} <span className="text-you42-error">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          className={inputClasses('email')}
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-you42-error text-xs mt-1">{errors.email}</p>}
      </div>

      {(settings?.requirePhone !== false) && (
        <div>
          <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
            {settings?.phoneLabel || 'Phone Number'}
            {settings?.phoneRequired !== false && <span className="text-you42-error"> *</span>}
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={handlePhoneChange}
            className={inputClasses('phone')}
            placeholder="(555) 123-4567"
          />
          {errors.phone && <p className="text-you42-error text-xs mt-1">{errors.phone}</p>}
        </div>
      )}

      {(settings?.requireAddress !== false) && (
        <>
          <div>
            <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
              {settings?.addressLabel || 'Billing Address'} <span className="text-you42-error">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={handleChange('address')}
              className={inputClasses('address')}
              placeholder="Street address"
            />
            {errors.address && <p className="text-you42-error text-xs mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
              {settings?.address2Label || 'Apartment, suite, etc. (optional)'}
            </label>
            <input
              type="text"
              value={formData.address2}
              onChange={handleChange('address2')}
              className={inputClasses('address2')}
              placeholder="Apt, suite, etc."
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
                {settings?.cityLabel || 'City'} <span className="text-you42-error">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={handleChange('city')}
                className={inputClasses('city')}
                placeholder="City"
              />
              {errors.city && <p className="text-you42-error text-xs mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
                {settings?.stateLabel || 'State'} <span className="text-you42-error">*</span>
              </label>
              <select
                value={formData.state}
                onChange={handleChange('state')}
                className={inputClasses('state')}
              >
                <option value="">Select</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p className="text-you42-error text-xs mt-1">{errors.state}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-you42-text-secondary mb-1.5">
                {settings?.zipLabel || 'ZIP Code'} <span className="text-you42-error">*</span>
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={handleChange('zip')}
                className={inputClasses('zip')}
                placeholder="12345"
                maxLength={10}
              />
              {errors.zip && <p className="text-you42-error text-xs mt-1">{errors.zip}</p>}
            </div>
          </div>
        </>
      )}

      <div className="space-y-3 pt-2">
        {settings?.showTermsAndConditions && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={handleCheckboxChange('agreeToTerms')}
              className="mt-1 w-4 h-4 rounded border-you42-border bg-you42-bg text-you42-blue focus:ring-you42-blue focus:ring-offset-0 accent-[#0091ff]"
            />
            <span className="text-you42-text-secondary text-sm">
              {settings?.termsLabel || 'I agree to the terms and conditions'} <span className="text-you42-error">*</span>
            </span>
          </label>
        )}
        {errors.agreeToTerms && <p className="text-you42-error text-xs">{errors.agreeToTerms}</p>}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.marketingOptIn}
            onChange={handleCheckboxChange('marketingOptIn')}
            className="mt-1 w-4 h-4 rounded border-you42-border bg-you42-bg text-you42-blue focus:ring-you42-blue focus:ring-offset-0 accent-[#0091ff]"
          />
          <span className="text-you42-text-secondary text-sm">
            {settings?.marketingOptInLabel || 'Send me updates about upcoming events'}
          </span>
        </label>
      </div>
    </div>
  )
}
