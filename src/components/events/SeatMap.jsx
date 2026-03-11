import { useState, useEffect, useRef } from 'react'
import { getSeatMapSvg } from '../../api/events'

export default function SeatMap({ eventId, seatMapData, selectedSeats = [], onSeatClick }) {
  const containerRef = useRef(null)
  const [svgContent, setSvgContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load the server SVG (it's the ground truth for visuals)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSeatMapSvg(eventId)
      .then(svg => { if (!cancelled) { setSvgContent(svg); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [eventId])

  // Build selected seat set for lookup
  const selectedIds = new Set(selectedSeats.map(s => s.seatId))

  // Wire up interactivity after SVG mounts
  useEffect(() => {
    if (!svgContent || !containerRef.current) return
    const container = containerRef.current
    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    // Make SVG responsive
    svgEl.removeAttribute('width')
    svgEl.removeAttribute('height')
    svgEl.style.width = '100%'
    svgEl.style.height = 'auto'
    svgEl.style.display = 'block'

    const categories = seatMapData?.categories || []
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

    // Process each section group
    const sectionGroups = svgEl.querySelectorAll('g[data-section-key]')
    sectionGroups.forEach(group => {
      const sectionKey = group.getAttribute('data-section-key')
      const sectionType = group.getAttribute('data-section-type')
      const categoryId = group.getAttribute('data-category-id')
      const available = parseInt(group.getAttribute('data-available') || '0', 10)
      const cat = catMap[categoryId]

      // Find the matching section info from seatMapData
      const sectionInfo = seatMapData?.sections?.find(s => s.sectionKey === sectionKey)
      const sectionName = sectionInfo?.name || sectionKey

      if (sectionType === 'SEATED') {
        // Individual seat circles — assign stable IDs by position (sorted row by row)
        const circles = Array.from(group.querySelectorAll('circle'))
        if (!circles.length) return

        // Group by y-coordinate (rows), sort rows top-to-bottom, seats left-to-right
        const rowMap = {}
        circles.forEach(c => {
          const y = parseFloat(c.getAttribute('cy'))
          const yKey = Math.round(y * 10) / 10
          if (!rowMap[yKey]) rowMap[yKey] = []
          rowMap[yKey].push(c)
        })
        const sortedYKeys = Object.keys(rowMap).map(Number).sort((a, b) => a - b)
        // Row labels: A = bottom row (highest y), assign A-Z from bottom up
        const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
        sortedYKeys.forEach((yKey, rowIdx) => {
          const rowLabel = rowLabels[sortedYKeys.length - 1 - rowIdx] || `R${rowIdx + 1}`
          const rowCircles = rowMap[yKey].sort((a, b) =>
            parseFloat(a.getAttribute('cx')) - parseFloat(b.getAttribute('cx'))
          )
          rowCircles.forEach((circle, seatIdx) => {
            const seatNumber = String(seatIdx + 1)
            const seatId = `${sectionKey}__${rowLabel}__${seatNumber}`
            const isSelected = selectedIds.has(seatId)
            const isAvailable = available > 0

            circle.setAttribute('data-seat-id', seatId)
            circle.setAttribute('data-section-key', sectionKey)
            circle.setAttribute('r', '8') // larger clickable radius

            if (isSelected) {
              circle.setAttribute('fill', '#f59e0b')
              circle.setAttribute('stroke', '#fbbf24')
              circle.setAttribute('stroke-width', '2')
              circle.removeAttribute('opacity')
            } else if (!isAvailable) {
              circle.setAttribute('fill', '#4b5563')
              circle.setAttribute('opacity', '0.4')
            } else {
              circle.removeAttribute('stroke')
              circle.removeAttribute('stroke-width')
              circle.removeAttribute('opacity')
            }

            circle.style.cursor = isAvailable ? 'pointer' : 'not-allowed'
            circle.style.transition = 'fill 0.1s, opacity 0.1s'

            if (isAvailable) {
              circle.onclick = (e) => {
                e.stopPropagation()
                onSeatClick?.({
                  seatId,
                  seatNumber,
                  rowLabel,
                  sectionName,
                  sectionKey,
                  categoryId,
                  categoryName: cat?.name,
                  price: cat?.price,
                })
              }
              circle.onmouseenter = () => {
                if (!selectedIds.has(seatId)) {
                  circle.setAttribute('fill', lightenColor(cat?.color || '#7c3aed'))
                  circle.setAttribute('stroke', '#fff')
                  circle.setAttribute('stroke-width', '1.5')
                }
              }
              circle.onmouseleave = () => {
                if (!selectedIds.has(seatId)) {
                  circle.setAttribute('fill', cat?.color || '#7c3aed')
                  circle.removeAttribute('stroke')
                  circle.removeAttribute('stroke-width')
                }
              }
            }
          })
        })

      } else if (sectionType === 'TABLE') {
        // Whole-table click — the center circle or the entire group
        const isSelected = selectedIds.has(sectionKey)
        const isAvailable = available > 0

        // Style all circles in the table
        const circles = Array.from(group.querySelectorAll('circle'))
        circles.forEach(c => {
          c.style.cursor = isAvailable ? 'pointer' : 'not-allowed'
          if (isSelected) {
            c.setAttribute('opacity', '1')
            c.setAttribute('stroke', '#fbbf24')
            c.setAttribute('stroke-width', '2')
          }
        })

        if (isAvailable) {
          group.style.cursor = 'pointer'
          group.onclick = (e) => {
            e.stopPropagation()
            const capacity = parseInt(group.getAttribute('data-capacity') || '1', 10)
            onSeatClick?.({
              seatId: sectionKey,
              seatNumber: '1',
              rowLabel: '',
              sectionName,
              sectionKey,
              categoryId,
              categoryName: cat?.name,
              price: cat?.price,
              quantity: capacity,
              isTable: true,
            })
          }
          group.onmouseenter = () => {
            circles.forEach(c => {
              if (!isSelected) c.setAttribute('opacity', '1')
            })
          }
          group.onmouseleave = () => {
            circles.forEach((c, i) => {
              if (!isSelected) c.setAttribute('opacity', i === 0 ? '0.45' : '0.7')
            })
          }
        }

      } else if (sectionType === 'GA') {
        // GA section — click the rect
        const rect = group.querySelector('rect')
        const isSelected = selectedIds.has(sectionKey)
        const isAvailable = available > 0

        if (rect && isAvailable) {
          rect.style.cursor = 'pointer'
          if (isSelected) {
            rect.setAttribute('stroke', '#f59e0b')
            rect.setAttribute('stroke-width', '3')
            rect.setAttribute('opacity', '0.6')
          }
          group.onclick = (e) => {
            e.stopPropagation()
            const capacity = parseInt(group.getAttribute('data-capacity') || '1', 10)
            onSeatClick?.({
              seatId: sectionKey,
              seatNumber: '1',
              rowLabel: '',
              sectionName,
              sectionKey,
              categoryId,
              categoryName: cat?.name,
              price: cat?.price,
              quantity: capacity,
              isGA: true,
            })
          }
          group.onmouseenter = () => {
            if (!isSelected) rect.setAttribute('opacity', '0.5')
          }
          group.onmouseleave = () => {
            if (!isSelected) rect.setAttribute('opacity', rect.getAttribute('opacity') || '0.315')
          }
        }
      }
    })

    // Disable pointer events on text and non-interactive elements so they don't block clicks
    svgEl.querySelectorAll('text, [data-role="background"], [data-role="stage"]').forEach(el => {
      el.style.pointerEvents = 'none'
    })

  }, [svgContent, selectedSeats, seatMapData, onSeatClick])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading seat map...</span>
      </div>
    )
  }

  if (error) {
    return <p className="text-red-400 text-sm py-6 text-center">Failed to load seat map: {error}</p>
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}

function lightenColor(hex) {
  if (!hex || !hex.startsWith('#')) return hex
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 40)
  const g = Math.min(255, ((n >> 8) & 0xff) + 40)
  const b = Math.min(255, (n & 0xff) + 40)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}
