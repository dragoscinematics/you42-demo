import { useState, useCallback, useMemo } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'

function seatKey(sectionKey, rowLabel, seatNumber) {
  return `${sectionKey}::${rowLabel}::${seatNumber}`
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
  const [tooltip, setTooltip] = useState(null)
  const [hoveredSeat, setHoveredSeat] = useState(null)
  const [activeGA, setActiveGA] = useState(null)
  const [gaQuantities, setGaQuantities] = useState({})

  const layout = seatMapData?.layout
  const sections = seatMapData?.sections || []
  const categories = seatMapData?.categories || []
  const layoutSections = layout?.sections || []

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
    for (const s of selectedSeats) set.add(seatKey(s.sectionKey, s.rowLabel, s.seatNumber))
    return set
  }, [selectedSeats])

  // Extract viewBox from server SVG
  const viewBox = useMemo(() => {
    const match = svgContent?.match(/viewBox="([^"]*)"/)
    return match ? match[1] : '0 0 1000 800'
  }, [svgContent])

  // Convert server SVG to a data URL for use as background
  const svgDataUrl = useMemo(() => {
    if (!svgContent) return null
    // Remove any circles from section groups so we don't get double-rendering
    // Strip the opacity groups (decorative seat dots) and table-seat circles
    let cleaned = svgContent
    // Remove the <g opacity="0.55">...</g> groups (decorative seat preview dots)
    cleaned = cleaned.replace(/<g opacity="0\.55">[\s\S]*?<\/g>/g, '')
    // Remove table-seat circles (we'll render our own)
    cleaned = cleaned.replace(/<circle[^>]*data-table-seat[^>]*\/>/g, '')
    // Remove table body circles too (the small center ones)
    // They're the circles inside TABLE sections without data-table-seat
    // We keep the rect, text, etc.
    const blob = new Blob([cleaned], { type: 'image/svg+xml' })
    return URL.createObjectURL(blob)
  }, [svgContent])

  const handleSeatClick = useCallback((sectionKey, rowLabel, seatNumber, meta) => {
    if (!meta || meta.available <= 0) return

    const category = categoryLookup[meta.categoryId]
    const key = seatKey(sectionKey, rowLabel, seatNumber)
    const isTable = meta.sectionType === 'TABLE'
    const isWholeTable = isTable && meta.bookingMode === 'whole-table'

    let newSelection

    if (isWholeTable) {
      const tableSection = layoutSections.find(s => s.key === sectionKey)
      if (!tableSection) return
      const allTableSeats = []
      for (const row of tableSection.rows || []) {
        for (const seat of row.seats || []) {
          allTableSeats.push({
            sectionKey,
            rowLabel: row.rowLabel,
            seatNumber: seat.seatNumber,
            categoryId: category?.id || meta.categoryId,
            price: category?.price || 0,
          })
        }
      }
      const anySelected = allTableSeats.some(s => selectedSet.has(seatKey(s.sectionKey, s.rowLabel, s.seatNumber)))
      if (anySelected) {
        const tableKeys = new Set(allTableSeats.map(s => seatKey(s.sectionKey, s.rowLabel, s.seatNumber)))
        newSelection = selectedSeats.filter(s => !tableKeys.has(seatKey(s.sectionKey, s.rowLabel, s.seatNumber)))
      } else {
        newSelection = [...selectedSeats, ...allTableSeats]
      }
    } else {
      if (selectedSet.has(key)) {
        newSelection = selectedSeats.filter(s => seatKey(s.sectionKey, s.rowLabel, s.seatNumber) !== key)
      } else {
        newSelection = [...selectedSeats, {
          sectionKey,
          rowLabel,
          seatNumber,
          categoryId: category?.id || meta.categoryId,
          price: category?.price || 0,
        }]
      }
    }

    onSelectionChange?.(newSelection)
  }, [selectedSeats, selectedSet, onSelectionChange, layoutSections, categoryLookup])

  const handleGAClick = useCallback((sectionKey) => {
    setActiveGA(prev => prev === sectionKey ? null : sectionKey)
  }, [])

  const handleGAQuantityChange = useCallback((sectionKey, quantity) => {
    const meta = sectionLookup[sectionKey]
    const category = meta ? categoryLookup[meta.categoryId] : null
    const layoutSection = layoutSections.find(s => s.key === sectionKey)

    setGaQuantities(prev => ({ ...prev, [sectionKey]: quantity }))

    const otherSeats = selectedSeats.filter(s => s.sectionKey !== sectionKey)
    const gaSeats = []
    if (quantity > 0 && layoutSection) {
      const row = layoutSection.rows?.[0]
      const rowLabel = row?.rowLabel || 'GA'
      for (let i = 0; i < quantity; i++) {
        const seat = row?.seats?.[i]
        gaSeats.push({
          sectionKey,
          rowLabel,
          seatNumber: seat?.seatNumber || String(i + 1),
          categoryId: category?.id || meta?.categoryId,
          price: category?.price || 0,
        })
      }
    }
    onSelectionChange?.([...otherSeats, ...gaSeats])
  }, [selectedSeats, sectionLookup, categoryLookup, layoutSections, onSelectionChange])

  if (!svgContent || !layout) return null

  return (
    <div className="relative w-full">
      <div className="w-full overflow-auto rounded-lg border border-you42-surface-hover" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="relative" style={{ lineHeight: 0 }}>
          {/* Server SVG as background image — provides stage, shapes, labels, legend */}
          {svgDataUrl && (
            <img
              src={svgDataUrl}
              alt=""
              className="w-full h-auto max-h-[65vh]"
              style={{ display: 'block' }}
              draggable={false}
            />
          )}

          {/* React-rendered interactive SVG overlay — exact same viewBox */}
          <svg
            viewBox={viewBox}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Render clickable seats for each section */}
            {layoutSections.map((section) => {
              const meta = sectionLookup[section.key]
              const sectionType = section.sectionType || meta?.sectionType || 'SEATED'
              const category = meta ? categoryLookup[meta.categoryId] : null
              const color = category?.color || '#666'
              const price = category?.price || 0
              const isUnavailable = meta && meta.available <= 0
              const sectionName = section.name || meta?.name || category?.name || 'Section'

              if (sectionType === 'GA') {
                // GA: render a transparent clickable rect
                return (
                  <rect
                    key={section.key}
                    x={section.x}
                    y={section.y}
                    width={section.width || 500}
                    height={section.height || 120}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleGAClick(section.key)}
                  />
                )
              }

              const isTable = sectionType === 'TABLE'
              const seatRadius = isTable ? 5.5 : 4

              return (
                <g key={section.key}>
                  {(section.rows || []).map((row) =>
                    (row.seats || []).map((seat) => {
                      const key = seatKey(section.key, row.rowLabel, seat.seatNumber)
                      const isSelected = selectedSet.has(key)
                      const isHovered = hoveredSeat === key

                      return (
                        <circle
                          key={key}
                          cx={seat.x}
                          cy={seat.y}
                          r={isSelected ? seatRadius * 1.5 : isHovered ? seatRadius * 1.4 : seatRadius}
                          fill={isUnavailable ? '#2a2a2a' : isSelected ? '#ffffff' : isHovered ? '#ffffff' : color}
                          fillOpacity={isSelected ? 1 : isUnavailable ? 0.2 : isHovered ? 0.9 : 0.7}
                          stroke={isSelected ? color : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                          style={{
                            cursor: isUnavailable ? 'not-allowed' : 'pointer',
                            transition: 'all 0.12s ease',
                          }}
                          onClick={() => !isUnavailable && handleSeatClick(section.key, row.rowLabel, seat.seatNumber, meta)}
                          onMouseEnter={(e) => {
                            if (!isUnavailable) setHoveredSeat(key)
                            setTooltip({
                              x: e.clientX,
                              y: e.clientY,
                              text: `${sectionName} · Row ${row.rowLabel}, Seat ${seat.seatNumber} – ${formatCurrency(price)}`,
                            })
                          }}
                          onMouseLeave={() => {
                            setHoveredSeat(null)
                            setTooltip(null)
                          }}
                        />
                      )
                    })
                  )}
                </g>
              )
            })}
          </svg>
        </div>

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
