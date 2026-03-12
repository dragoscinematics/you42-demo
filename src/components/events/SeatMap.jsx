import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { API_KEY } from '../../config/constants'

const EMBED_ORIGIN = 'https://staging.phantomticket.com'

const SeatMap = forwardRef(function SeatMap({ eventId, onSelectionChange, onReady }, ref) {
  const iframeRef = useRef(null)
  const [loading, setLoading] = useState(true)

  const embedUrl = `${EMBED_ORIGIN}/embed/seat-map/${eventId}?apiKey=${encodeURIComponent(API_KEY)}`

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== EMBED_ORIGIN) return
      const { type, payload } = event.data || {}

      if (type === 'PT_SEAT_MAP_READY') {
        setLoading(false)
        onReady?.(payload)
      } else if (type === 'PT_SEAT_SELECTION_CHANGED') {
        onSelectionChange?.(payload)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSelectionChange, onReady])

  const handleIframeLoad = useCallback(() => {
    setTimeout(() => setLoading(false), 4000)
  }, [])

  const sendCommand = useCallback((type, payload = {}) => {
    iframeRef.current?.contentWindow?.postMessage({ type, payload }, EMBED_ORIGIN)
  }, [])

  useImperativeHandle(ref, () => ({
    clearSelection: () => sendCommand('PT_CLEAR_SELECTION'),
    setSelection: (seatIds) => sendCommand('PT_SET_SELECTION', { seatIds }),
  }), [sendCommand])

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-white/10">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Loading seat map...</span>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title="Seat Map"
        className="w-full border-0"
        style={{ height: '60vh', minHeight: '400px', maxHeight: '700px', background: '#0a0a0a' }}
        onLoad={handleIframeLoad}
        allow="clipboard-write"
      />
    </div>
  )
})

export default SeatMap
