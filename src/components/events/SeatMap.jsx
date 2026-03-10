import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'

function seatId(sectionKey, index) {
  return `${sectionKey}::${index}`
}

function Tooltip({ x, y, text }) {
  if (!text) return null
  return (
    <div
      className="fixed z-50 px-2.5 py-1.5 rounded text-xs font-medium text-white pointer-events-none whitespace-nowrap"
      style={{
        backgroundColor: 'rgba(0,0,0,0.9)',
        border: '1px solid rgba(255,255,255,0.15)',
        left: x,
        top: y - 40,
        transform: 'translateX(-50%)',
      }}
    >
      {text}
    </div>
  )
}

function GAQuantityPicker({ sectionName, price, available, selectedCount, onSelect, onClose }) {
  const max = Math.min(available, 20)
  return (
    <div
      className="bg-you42-surface border border-you42-border rounded-lg p-5 text-center min-w-50 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-white text-sm font-bold mb-1">{sectionName || 'General Admission'}</p>
      <p className="text-you42-text-muted text-xs mb-4">{formatCurrency(price)} each · {available} available</p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onSelect(Math.max(0, selectedCount - 1))}
          disabled={selectedCount <= 0}
          className="w-9 h-9 rounded-lg bg-you42-surface-hover text-white text-lg flex items-center justify-center hover:bg-you42-border disabled:opacity-20 transition-colors"
        >−</button>
        <span className="text-white text-xl font-bold w-8 text-center">{selectedCount}</span>
        <button
          onClick={() => onSelect(Math.min(max, selectedCount + 1))}
          disabled={selectedCount >= max}
          className="w-9 h-9 rounded-lg bg-you42-surface-hover text-white text-lg flex items-center justify-center hover:bg-you42-border disabled:opacity-20 transition-colors"
        >+</button>
      </div>
      <button onClick={onClose} className="mt-3 text-you42-text-secondary text-xs hover:text-white transition-colors">
        Done
      </button>
    </div>
  )
}

export default function SeatMap({ svgContent, seatMapData, onSelectionChange, selectedSeats = [] }) {
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [activeGA, setActiveGA] = useState(null)
  const [gaQuantities, setGaQuantities] = useState({})

  const sections = seatMapData?.sections || []
  const categories = seatMapData?.categories || []

  const sectionLookup = useMemo(() => {
    const map = {}
    for (const s of sections) map[s.sectionKey] = s
    return map
  }, [sections])

  const categoryLookup = useMemo(() => {
    const map = {}
    for (const c of categories) map[c.id] = c
    return map
  }, [categories])

  const selectedSet = useMemo(() => {
    const set = new Set()
    for (const s of selectedSeats) set.add(s.id)
    return set
  }, [selectedSeats])

  // Core: attach click/hover handlers to the SVG circles after rendering
  useEffect(() => {
    const container = containerRef.current
    if (!container || !svgContent) return

    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    const cleanups = []

    // Process each section group in the SVG
    const sectionGroups = svgEl.querySelectorAll('g[data-section-key]')

    for (const group of sectionGroups) {
      const sectionKey = group.getAttribute('data-section-key')
      const sectionType = group.getAttribute('data-section-type')
      const meta = sectionLookup[sectionKey]
      const category = meta ? categoryLookup[meta.categoryId] : null
      const color = category?.color || '#666'
      const price = category?.price || 0
      const sectionName = meta?.name || category?.name || 'Section'

      if (sectionType === 'GA') {
        // GA sections: click to open quantity picker
        group.style.cursor = 'pointer'
        const handler = () => setActiveGA(prev => prev === sectionKey ? null : sectionKey)
        group.addEventListener('click', handler)
        cleanups.push(() => group.removeEventListener('click', handler))
        continue
      }

      // SEATED and TABLE sections: make individual circles clickable
      const circles = group.querySelectorAll('circle')

      // For TABLE sections, skip the first circle (it's the table body)
      // Table seats have data-table-seat attribute
      const seatCircles = sectionType === 'TABLE'
        ? Array.from(circles).filter(c => c.hasAttribute('data-table-seat'))
        : Array.from(circles)

      seatCircles.forEach((circle, index) => {
        const id = seatId(sectionKey, index)
        const originalFill = circle.getAttribute('fill')
        const originalOpacity = circle.getAttribute('opacity') || '1'
        const originalR = circle.getAttribute('r')

        // Store original attrs
        circle.dataset.seatId = id
        circle.dataset.originalFill = originalFill
        circle.dataset.originalOpacity = originalOpacity
        circle.dataset.originalR = originalR
        circle.style.cursor = 'pointer'
        circle.style.transition = 'all 0.12s ease'

        const onClick = () => {
          if (sectionType === 'TABLE' && meta?.bookingMode === 'whole-table') {
            // Toggle all seats in the table
            const allIds = seatCircles.map((_, i) => seatId(sectionKey, i))
            const anySelected = allIds.some(sid => selectedSet.has(sid))
            if (anySelected) {
              const removeSet = new Set(allIds)
              onSelectionChange?.(selectedSeats.filter(s => !removeSet.has(s.id)))
            } else {
              const newSeats = allIds.map(sid => ({
                id: sid,
                sectionKey,
                categoryId: category?.id || meta?.categoryId,
                price,
              }))
              onSelectionChange?.([...selectedSeats, ...newSeats])
            }
          } else {
            // Toggle individual seat
            if (selectedSet.has(id)) {
              onSelectionChange?.(selectedSeats.filter(s => s.id !== id))
            } else {
              onSelectionChange?.([...selectedSeats, {
                id,
                sectionKey,
                categoryId: category?.id || meta?.categoryId,
                price,
              }])
            }
          }
        }

        const onEnter = (e) => {
          if (!selectedSet.has(id)) {
            circle.setAttribute('fill', '#ffffff')
            circle.setAttribute('opacity', '0.9')
            circle.setAttribute('r', String(parseFloat(originalR) * 1.4))
          }
          setTooltip({
            x: e.clientX,
            y: e.clientY,
            text: `${sectionName} · Seat ${index + 1} – ${formatCurrency(price)}`,
          })
        }

        const onLeave = () => {
          if (!selectedSet.has(id)) {
            circle.setAttribute('fill', originalFill)
            circle.setAttribute('opacity', originalOpacity)
            circle.setAttribute('r', originalR)
          }
          setTooltip(null)
        }

        circle.addEventListener('click', onClick)
        circle.addEventListener('mouseenter', onEnter)
        circle.addEventListener('mouseleave', onLeave)

        cleanups.push(() => {
          circle.removeEventListener('click', onClick)
          circle.removeEventListener('mouseenter', onEnter)
          circle.removeEventListener('mouseleave', onLeave)
        })
      })
    }

    return () => {
      for (const fn of cleanups) fn()
    }
  }, [svgContent, sectionLookup, categoryLookup, selectedSeats, selectedSet, onSelectionChange])

  // Update visual state of circles based on selection
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    const allSeatCircles = svgEl.querySelectorAll('circle[data-seat-id]')
    for (const circle of allSeatCircles) {
      const id = circle.dataset.seatId
      const isSelected = selectedSet.has(id)

      if (isSelected) {
        circle.setAttribute('fill', '#ffffff')
        circle.setAttribute('opacity', '1')
        circle.setAttribute('r', String(parseFloat(circle.dataset.originalR) * 1.5))
        circle.setAttribute('stroke', circle.dataset.originalFill)
        circle.setAttribute('stroke-width', '2')
      } else {
        circle.setAttribute('fill', circle.dataset.originalFill)
        circle.setAttribute('opacity', circle.dataset.originalOpacity)
        circle.setAttribute('r', circle.dataset.originalR)
        circle.removeAttribute('stroke')
        circle.removeAttribute('stroke-width')
      }
    }
  }, [selectedSet])

  const handleGAQuantityChange = useCallback((sectionKey, quantity) => {
    const meta = sectionLookup[sectionKey]
    const category = meta ? categoryLookup[meta.categoryId] : null

    setGaQuantities(prev => ({ ...prev, [sectionKey]: quantity }))

    const otherSeats = selectedSeats.filter(s => s.sectionKey !== sectionKey)
    const gaSeats = []
    for (let i = 0; i < quantity; i++) {
      gaSeats.push({
        id: seatId(sectionKey, i),
        sectionKey,
        categoryId: category?.id || meta?.categoryId,
        price: category?.price || 0,
      })
    }
    onSelectionChange?.([...otherSeats, ...gaSeats])
  }, [selectedSeats, sectionLookup, categoryLookup, onSelectionChange])

  if (!svgContent) return null

  return (
    <div className="relative w-full">
      <div className="w-full overflow-auto rounded-lg border border-you42-surface-hover" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div
          ref={containerRef}
          className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[65vh]"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ lineHeight: 0 }}
        />

        {/* GA quantity picker overlay */}
        {activeGA && (
          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm"
            onClick={() => setActiveGA(null)}
          >
            <GAQuantityPicker
              sectionName={sectionLookup[activeGA]?.name || 'General Admission'}
              price={categoryLookup[sectionLookup[activeGA]?.categoryId]?.price || 0}
              available={sectionLookup[activeGA]?.available || 0}
              selectedCount={gaQuantities[activeGA] || 0}
              onSelect={(qty) => handleGAQuantityChange(activeGA, qty)}
              onClose={() => setActiveGA(null)}
            />
          </div>
        )}
      </div>

      {tooltip && <Tooltip x={tooltip.x} y={tooltip.y} text={tooltip.text} />}
    </div>
  )
}
