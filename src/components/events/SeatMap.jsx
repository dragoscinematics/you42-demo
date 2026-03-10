import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'

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

  // Use refs for mutable state that event handlers need access to
  const selectedSeatsRef = useRef(selectedSeats)
  const onSelectionChangeRef = useRef(onSelectionChange)
  selectedSeatsRef.current = selectedSeats
  onSelectionChangeRef.current = onSelectionChange

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

  // One-time setup: attach event handlers to SVG circles after initial render
  // Uses refs so handlers always see latest selectedSeats without re-attaching
  useEffect(() => {
    const container = containerRef.current
    if (!container || !svgContent) return

    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    const cleanups = []
    const sectionGroups = svgEl.querySelectorAll('g[data-section-key]')

    for (const group of sectionGroups) {
      const sectionKey = group.getAttribute('data-section-key')
      const sectionType = group.getAttribute('data-section-type')
      const meta = sectionLookup[sectionKey]
      const category = meta ? categoryLookup[meta.categoryId] : null
      const color = category?.color || '#666'
      const price = category?.price || 0
      const sectionName = meta?.name || category?.name || 'Section'

      // Make text and rect elements pass-through so clicks reach circles
      group.querySelectorAll('text, rect').forEach(el => {
        el.style.pointerEvents = 'none'
      })

      if (sectionType === 'GA') {
        // For GA, the whole group is clickable — re-enable pointer events on the group itself
        group.style.cursor = 'pointer'
        group.style.pointerEvents = 'auto'
        // But keep text/rect pass-through so the group click fires
        const handler = () => setActiveGA(prev => prev === sectionKey ? null : sectionKey)
        group.addEventListener('click', handler)
        cleanups.push(() => group.removeEventListener('click', handler))
        continue
      }

      // Get seat circles — for tables, only circles with data-table-seat are seats
      // Make the table body circle (without data-table-seat) pass-through
      const circles = group.querySelectorAll('circle')
      let seatCircles
      if (sectionType === 'TABLE') {
        seatCircles = []
        for (const c of circles) {
          if (c.hasAttribute('data-table-seat')) {
            seatCircles.push(c)
          } else {
            c.style.pointerEvents = 'none'
          }
        }
      } else {
        seatCircles = Array.from(circles)
      }

      seatCircles.forEach((circle, index) => {
        const seatId = `${sectionKey}::${index}`

        // Store metadata on the element
        circle.dataset.seatId = seatId
        circle.dataset.origFill = circle.getAttribute('fill')
        circle.dataset.origOpacity = circle.getAttribute('opacity') || ''
        circle.dataset.origR = circle.getAttribute('r')
        circle.dataset.color = color
        circle.style.cursor = 'pointer'
        circle.style.transition = 'all 0.12s ease'

        const onClick = () => {
          const current = selectedSeatsRef.current
          const currentIds = new Set(current.map(s => s.id))

          if (sectionType === 'TABLE' && meta?.bookingMode === 'whole-table') {
            const allIds = seatCircles.map((_, i) => `${sectionKey}::${i}`)
            const anySelected = allIds.some(id => currentIds.has(id))
            if (anySelected) {
              const removeSet = new Set(allIds)
              onSelectionChangeRef.current?.(current.filter(s => !removeSet.has(s.id)))
            } else {
              const newSeats = allIds.map(id => ({
                id,
                sectionKey,
                categoryId: category?.id || meta?.categoryId,
                price,
              }))
              onSelectionChangeRef.current?.([...current, ...newSeats])
            }
          } else {
            if (currentIds.has(seatId)) {
              onSelectionChangeRef.current?.(current.filter(s => s.id !== seatId))
            } else {
              onSelectionChangeRef.current?.([...current, {
                id: seatId,
                sectionKey,
                categoryId: category?.id || meta?.categoryId,
                price,
              }])
            }
          }
        }

        const onEnter = (e) => {
          const currentIds = new Set(selectedSeatsRef.current.map(s => s.id))
          if (!currentIds.has(seatId)) {
            circle.setAttribute('fill', '#ffffff')
            if (circle.dataset.origOpacity) circle.setAttribute('opacity', '0.9')
            circle.setAttribute('r', String(parseFloat(circle.dataset.origR) * 1.5))
          }
          setTooltip({
            x: e.clientX,
            y: e.clientY,
            text: `${sectionName} · Seat ${index + 1} – ${formatCurrency(price)}`,
          })
        }

        const onLeave = () => {
          const currentIds = new Set(selectedSeatsRef.current.map(s => s.id))
          if (!currentIds.has(seatId)) {
            circle.setAttribute('fill', circle.dataset.origFill)
            if (circle.dataset.origOpacity) {
              circle.setAttribute('opacity', circle.dataset.origOpacity)
            } else {
              circle.removeAttribute('opacity')
            }
            circle.setAttribute('r', circle.dataset.origR)
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
  // Only re-run when SVG content or metadata changes, NOT on selection changes
  }, [svgContent, sectionLookup, categoryLookup])

  // Update visual state when selection changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    const selectedIds = new Set(selectedSeats.map(s => s.id))
    const allSeats = svgEl.querySelectorAll('circle[data-seat-id]')

    for (const circle of allSeats) {
      const id = circle.dataset.seatId
      const isSelected = selectedIds.has(id)
      const origFill = circle.dataset.origFill
      const origR = circle.dataset.origR
      const origOpacity = circle.dataset.origOpacity
      const color = circle.dataset.color

      if (isSelected) {
        circle.setAttribute('fill', '#ffffff')
        circle.setAttribute('r', String(parseFloat(origR) * 1.5))
        circle.setAttribute('stroke', color)
        circle.setAttribute('stroke-width', '2')
        circle.removeAttribute('opacity')
      } else {
        circle.setAttribute('fill', origFill)
        circle.setAttribute('r', origR)
        circle.removeAttribute('stroke')
        circle.removeAttribute('stroke-width')
        if (origOpacity) {
          circle.setAttribute('opacity', origOpacity)
        } else {
          circle.removeAttribute('opacity')
        }
      }
    }
  }, [selectedSeats])

  const handleGAQuantityChange = useCallback((sectionKey, quantity) => {
    const meta = sectionLookup[sectionKey]
    const category = meta ? categoryLookup[meta.categoryId] : null

    setGaQuantities(prev => ({ ...prev, [sectionKey]: quantity }))

    const otherSeats = selectedSeatsRef.current.filter(s => s.sectionKey !== sectionKey)
    const gaSeats = []
    for (let i = 0; i < quantity; i++) {
      gaSeats.push({
        id: `${sectionKey}::${i}`,
        sectionKey,
        categoryId: category?.id || meta?.categoryId,
        price: category?.price || 0,
      })
    }
    onSelectionChangeRef.current?.([...otherSeats, ...gaSeats])
  }, [sectionLookup, categoryLookup])

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
