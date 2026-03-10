import { useState, useRef, useCallback, useEffect } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'

function GAQuantityPicker({ sectionName, price, available, selectedCount, onSelect, onClose }) {
  const max = Math.min(available, 20)

  return (
    <div
      className="bg-[#1a1a1a] border border-[#444] rounded-lg p-5 text-center min-w-[200px] shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-white text-sm font-bold mb-1">{sectionName || 'General Admission'}</p>
      <p className="text-[#888] text-xs mb-4">{formatCurrency(price)} each · {available} available</p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onSelect(Math.max(0, selectedCount - 1))}
          disabled={selectedCount <= 0}
          className="w-9 h-9 rounded-lg bg-[#2a2a2a] text-white text-lg flex items-center justify-center hover:bg-[#333] disabled:opacity-20 transition-colors"
        >
          −
        </button>
        <span className="text-white text-xl font-bold w-8 text-center">{selectedCount}</span>
        <button
          onClick={() => onSelect(Math.min(max, selectedCount + 1))}
          disabled={selectedCount >= max}
          className="w-9 h-9 rounded-lg bg-[#2a2a2a] text-white text-lg flex items-center justify-center hover:bg-[#333] disabled:opacity-20 transition-colors"
        >
          +
        </button>
      </div>
      <button
        onClick={onClose}
        className="mt-3 text-you42-text-secondary text-xs hover:text-white transition-colors"
      >
        Done
      </button>
    </div>
  )
}

function QuantityPicker({ sectionName, sectionType, price, available, selectedCount, onSelect, onClose }) {
  const isTable = sectionType === 'TABLE'
  const label = isTable ? `Book ${sectionName}` : sectionName
  const max = isTable ? 1 : Math.min(available, 20)

  if (isTable) {
    return (
      <div
        className="bg-[#1a1a1a] border border-[#444] rounded-lg p-5 text-center min-w-[220px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-sm font-bold mb-1">{label}</p>
        <p className="text-[#888] text-xs mb-4">{formatCurrency(price)} · {available} seats</p>
        <button
          onClick={() => onSelect(selectedCount > 0 ? 0 : available)}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCount > 0
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              : 'bg-you42-blue text-white hover:bg-you42-blue-hover'
          }`}
        >
          {selectedCount > 0 ? 'Remove Table' : 'Book Whole Table'}
        </button>
        <button
          onClick={onClose}
          className="mt-3 block mx-auto text-you42-text-secondary text-xs hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    )
  }

  return <GAQuantityPicker
    sectionName={sectionName}
    price={price}
    available={available}
    selectedCount={selectedCount}
    onSelect={onSelect}
    onClose={onClose}
  />
}

export default function SeatMap({ svgContent, seatMapData, onSelectionChange, selectedSections = {} }) {
  const containerRef = useRef(null)
  const [activeSection, setActiveSection] = useState(null)

  const sections = seatMapData?.sections || []
  const categories = seatMapData?.categories || []

  // Build lookup for section metadata
  const sectionLookup = {}
  for (const s of sections) {
    sectionLookup[s.sectionKey] = s
  }

  // Build category lookup
  const categoryLookup = {}
  for (const c of categories) {
    categoryLookup[c.id] = c
  }

  // Attach click handlers to SVG section groups after render
  useEffect(() => {
    const container = containerRef.current
    if (!container || !svgContent) return

    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    const sectionGroups = svgEl.querySelectorAll('g[data-section-key]')

    const handleClick = (e) => {
      const group = e.currentTarget
      const sectionKey = group.getAttribute('data-section-key')
      if (sectionKey) {
        setActiveSection(sectionKey)
      }
    }

    for (const g of sectionGroups) {
      g.style.cursor = 'pointer'
      g.addEventListener('click', handleClick)

      // Add hover effect
      g.addEventListener('mouseenter', () => {
        g.style.filter = 'brightness(1.2)'
      })
      g.addEventListener('mouseleave', () => {
        g.style.filter = ''
      })
    }

    return () => {
      for (const g of sectionGroups) {
        g.removeEventListener('click', handleClick)
      }
    }
  }, [svgContent])

  // Update SVG visual state when selections change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svgEl = container.querySelector('svg')
    if (!svgEl) return

    const sectionGroups = svgEl.querySelectorAll('g[data-section-key]')
    for (const g of sectionGroups) {
      const key = g.getAttribute('data-section-key')
      const qty = selectedSections[key] || 0
      if (qty > 0) {
        g.style.outline = '2px solid #fff'
        g.style.outlineOffset = '2px'
        g.style.borderRadius = '4px'
      } else {
        g.style.outline = ''
        g.style.outlineOffset = ''
      }
    }
  }, [selectedSections, svgContent])

  const handleQuantityChange = useCallback((sectionKey, quantity) => {
    const newSelections = { ...selectedSections, [sectionKey]: quantity }
    if (quantity <= 0) delete newSelections[sectionKey]
    onSelectionChange?.(newSelections)
  }, [selectedSections, onSelectionChange])

  if (!svgContent) return null

  // Get active section info
  const activeMeta = activeSection ? sectionLookup[activeSection] : null
  const activeCategory = activeMeta ? categoryLookup[activeMeta.categoryId] : null
  const activeSectionType = activeMeta?.sectionType || 'SEATED'

  return (
    <div className="relative w-full">
      <div className="w-full overflow-auto rounded-lg border border-[#2a2a2a]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div
          ref={containerRef}
          className="w-full"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ lineHeight: 0 }}
        />

        {/* Section picker overlay */}
        {activeSection && activeMeta && (
          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm"
            onClick={() => setActiveSection(null)}
          >
            <QuantityPicker
              sectionName={activeMeta.name || activeCategory?.name || 'Section'}
              sectionType={activeSectionType}
              price={activeCategory?.price || 0}
              available={activeMeta.available || 0}
              selectedCount={selectedSections[activeSection] || 0}
              onSelect={(qty) => handleQuantityChange(activeSection, qty)}
              onClose={() => setActiveSection(null)}
            />
          </div>
        )}
      </div>

      {/* Selection summary below map */}
      {Object.keys(selectedSections).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(selectedSections).map(([key, qty]) => {
            const meta = sectionLookup[key]
            const cat = meta ? categoryLookup[meta.categoryId] : null
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#222] border border-[#444] text-white"
              >
                {meta?.name || cat?.name || 'Section'} × {qty}
                <button
                  onClick={() => handleQuantityChange(key, 0)}
                  className="text-[#888] hover:text-white ml-0.5"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
