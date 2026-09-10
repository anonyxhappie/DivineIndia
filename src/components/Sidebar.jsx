import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateDistance, formatDistance } from '../utils/geoUtils'

const DEITY_EMOJIS = {
  Shiva: '🔱',
  Vishnu: '🪷',
  Surya: '☀️',
  Goddess: '🌺',
  Ganesh: '🐘',
  Buddha: '☸️',
  Jain: '🕉️',
  Sikh: '☬',
  Brahma: '📿',
  Multi: '🛕',
  Hindu: '🕉️',
  Deity: '🛕',
}

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

function FilterPills({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 px-3 rounded-xl
                   glass text-xs font-sans font-medium
                   hover:border-saffron/40 transition-all duration-200"
      >
        <span className="theme-title">
          {label}: <span className="text-saffron font-bold">{value}</span>
        </span>
        <ChevronIcon open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pt-2 pl-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 font-sans
                    ${value === opt
                      ? 'bg-saffron/25 text-saffron border border-saffron/50 shadow-sm'
                      : 'bg-[var(--pill-bg)] text-[var(--pill-text)] hover:text-[var(--text-title)] border border-transparent'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Sidebar({
  search, setSearch,
  deity, setDeity,
  era, setEra,
  circuit, setCircuit,
  allDeities, eraOptions, allCircuits,
  filteredTemples, totalTemples,
  selectedTemple, visitedIds,
  onSelectTemple,
  isOpen, onToggle,
  userLocation,
}) {
  // Store item DOM refs for smooth scroll-into-view behavior
  const itemRefs = useRef({})

  // Automatically scroll selected temple item into view when selection changes
  useEffect(() => {
    if (selectedTemple?.id && itemRefs.current[selectedTemple.id]) {
      itemRefs.current[selectedTemple.id].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedTemple?.id])

  // Sort temples by distance if user location is active
  const sortedTemples = useMemo(() => {
    if (!userLocation || userLocation.lat == null || userLocation.lng == null) {
      return filteredTemples
    }

    return [...filteredTemples].sort((a, b) => {
      const distA = a.lat != null && a.lng != null
        ? calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng)
        : Infinity
      const distB = b.lat != null && b.lng != null
        ? calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
        : Infinity
      return distA - distB
    })
  }, [filteredTemples, userLocation])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop overlay to tap outside and close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] md:hidden"
            aria-hidden="true"
          />

          <motion.aside
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-12 sm:top-16 left-0 bottom-0 w-[88vw] sm:w-[350px] max-w-[360px] z-[999] glass-strong rounded-none sm:rounded-r-2xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-shimmer font-cinzel tracking-wider">
                  Sacred Explorer
                </h2>
                <button
                  onClick={onToggle}
                  className="md:hidden theme-muted hover:theme-title p-1.5 rounded-lg active:scale-95 transition-all"
                  aria-label="Close explorer sidebar"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] tracking-[0.2em] uppercase font-sans font-semibold theme-muted">
                  Discover Iconic Indian Shrines
                </p>
                {userLocation && (
                  <span className="text-[9.5px] font-sans font-bold text-sky-500 bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                    <span>Nearest First</span>
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent" />

            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search temple, state, deity…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)]
                             text-[var(--text-title)] text-xs sm:text-sm font-sans placeholder:text-[var(--text-muted)]
                             focus:outline-none focus:ring-1 focus:ring-saffron/50
                             transition-all duration-300"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 space-y-1.5 pb-2">
              <FilterPills label="Deity" options={allDeities} value={deity} onChange={setDeity} />
              <FilterPills label="Era" options={eraOptions} value={era} onChange={setEra} />
              <FilterPills label="Circuit" options={allCircuits} value={circuit} onChange={setCircuit} />
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent" />

            {/* Temple list with 44x44px rounded thumbnails, distance badges & smooth scroll into view */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1.5">
              {sortedTemples.length === 0 ? (
                <div className="text-center py-12">
                  <p className="theme-title text-sm font-sans font-medium">No temples found</p>
                  <p className="theme-muted text-xs mt-1 font-sans">Try adjusting your filters</p>
                </div>
              ) : (
                sortedTemples.map((temple) => {
                  const isVisited = visitedIds.has(temple.id)
                  const isSelected = selectedTemple?.id === temple.id
                  const deityEmoji = DEITY_EMOJIS[temple.deity] || '🛕'

                  const distanceKm = userLocation && temple.lat != null && temple.lng != null
                    ? calculateDistance(userLocation.lat, userLocation.lng, temple.lat, temple.lng)
                    : null
                  const formattedDist = distanceKm != null ? formatDistance(distanceKm) : null

                  return (
                    <motion.button
                      key={temple.id}
                      ref={(el) => (itemRefs.current[temple.id] = el)}
                      onClick={() => onSelectTemple(temple)}
                      whileHover={{ scale: 1.015, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 flex items-center gap-3
                        ${isSelected
                          ? 'bg-saffron/20 border border-saffron/50 shadow-md shadow-saffron/15 ring-1 ring-saffron/40'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-gold)]'
                        }`}
                    >
                      {/* 44x44px Rounded Thumbnail or Stylized Deity Icon */}
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-saffron/15 border border-[var(--border-gold)] flex items-center justify-center shadow-sm">
                        {temple.image_url ? (
                          <img
                            src={temple.image_url}
                            alt={temple.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xl filter drop-shadow-sm select-none">
                            {deityEmoji}
                          </span>
                        )}
                        {/* Visited Checkmark Micro-badge */}
                        {isVisited && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[8px] flex items-center justify-center shadow">
                            ✓
                          </span>
                        )}
                      </div>

                      {/* Info & Badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs sm:text-sm font-bold font-cinzel leading-snug truncate transition-colors ${
                              isSelected ? 'text-saffron' : 'theme-title'
                            }`}
                          >
                            {temple.name}
                          </p>
                          {/* Distance badge on right */}
                          {formattedDist && (
                            <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 flex-shrink-0">
                              {formattedDist}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px] font-sans">
                          <span className="px-1.5 py-0.2 rounded bg-saffron/15 text-saffron font-bold">
                            {temple.deity}
                          </span>
                          <span className="theme-muted font-medium">{temple.era || 'Sacred Shrine'}</span>
                          {temple.state && (
                            <span className="theme-muted truncate">· {temple.state}</span>
                          )}
                        </div>

                        {/* Circuit micro-badges */}
                        {temple.circuit_tags && temple.circuit_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {temple.circuit_tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-saffron/10 text-saffron font-semibold font-sans"
                              >
                                ✦ {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-[var(--border-gold)] flex items-center justify-between text-[10px] font-sans theme-muted">
              <span>{filteredTemples.length} of {totalTemples} Shrines</span>
              <span>🙏 Har Har Mahadev</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
