import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TempleMap from './components/TempleMap'
import DarshanPanel from './components/DarshanPanel'
import Sidebar from './components/Sidebar'
import CircuitTourBar from './components/CircuitTourBar'
import { TanpuraEngine } from './audio/tanpuraEngine'
import { playTempleChime } from './audio/chimeSound'
import TEMPLES from './data/temples.json'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ALL_DEITIES = ['All', ...Array.from(new Set(TEMPLES.map((t) => t.deity))).sort()]
const ERA_OPTIONS = ['All', 'Ancient', 'Medieval', 'Modern']
const ALL_CIRCUITS = [
  'All',
  ...Array.from(new Set(TEMPLES.flatMap((t) => t.circuit_tags || []))).sort(),
]

const HOLY_CIRCUITS = [
  {
    name: '12 Jyotirlingas',
    tag: 'Jyotirlinga',
    total: TEMPLES.filter((t) => t.circuit_tags?.includes('Jyotirlinga')).length,
    icon: '🔱',
  },
  {
    name: 'Char Dham',
    tag: 'Char Dham',
    total: TEMPLES.filter((t) => t.circuit_tags?.includes('Char Dham')).length,
    icon: '🛕',
  },
  {
    name: 'Shakti Peethas',
    tag: 'Shakti Peetha',
    total: TEMPLES.filter((t) => t.circuit_tags?.includes('Shakti Peetha')).length,
    icon: '🌺',
  },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ICONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

const VolumeOnIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)

const VolumeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
)

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.2" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" opacity="0.2" />
  </svg>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOP BAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TopBar({
  filteredCount,
  totalCount,
  visitedIds,
  tanpuraPlaying,
  onToggleTanpura,
  theme,
  onToggleTheme,
  activeCircuit,
  onStartCircuitTour,
}) {
  const [progressOpen, setProgressOpen] = useState(false)

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
      className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-3 sm:px-6 py-2.5 pointer-events-none"
    >
      {/* Brand title */}
      <div className="glass-strong rounded-2xl px-4 py-2 flex items-center gap-2 pointer-events-auto shadow-lg">
        <span className="text-xl">🛕</span>
        <div>
          <h1 className="text-sm font-extrabold text-shimmer font-cinzel tracking-wider leading-none">
            Divine India
          </h1>
          <p className="text-[9px] uppercase tracking-[0.2em] font-sans font-semibold mt-0.5 theme-muted">
            The Temple Explorer
          </p>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="glass-strong rounded-2xl px-2 sm:px-3 py-1.5 flex items-center gap-1.5 sm:gap-2 pointer-events-auto shadow-lg">
        {/* Temple count */}
        <div className="px-2 py-1 flex items-center gap-1 text-xs font-sans">
          <span className="theme-muted hidden sm:inline">Temples</span>
          <span className="font-bold text-saffron font-mono">{filteredCount}</span>
          <span className="theme-muted text-[10px]">/ {totalCount}</span>
        </div>

        <div className="w-px h-5 bg-[var(--border-gold)]" />

        {/* Pilgrimage Circuit Tour Interactive Buttons */}
        <div className="relative flex items-center gap-1">
          {HOLY_CIRCUITS.map((c) => {
            const visited = TEMPLES.filter(
              (t) => t.circuit_tags?.includes(c.tag) && visitedIds.has(t.id)
            ).length
            const isTourActive = activeCircuit === c.tag

            return (
              <button
                key={c.tag}
                onClick={() => onStartCircuitTour(c.tag)}
                className={`px-2 py-1 rounded-xl text-xs font-sans font-bold transition-all duration-200 flex items-center gap-1
                  ${isTourActive
                    ? 'bg-saffron text-slate-950 shadow-md shadow-saffron/30 scale-105'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 theme-title'
                  }`}
                title={`Start interactive ${c.name} tour`}
              >
                <span>{c.icon}</span>
                <span className="hidden lg:inline">{c.name}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                    isTourActive
                      ? 'bg-black/20 text-slate-950'
                      : 'bg-saffron/15 text-saffron'
                  }`}
                >
                  {visited}/{c.total}
                </span>
              </button>
            )
          })}

          <button
            onClick={() => setProgressOpen(!progressOpen)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors theme-muted"
            title="View full pilgrimage progress"
          >
            <ChevronIcon open={progressOpen} />
          </button>

          {/* Progress Dropdown */}
          <AnimatePresence>
            {progressOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-72 sm:w-80 glass-strong rounded-2xl p-4 space-y-3.5 shadow-2xl z-[1001]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest theme-gold font-cinzel">
                    Sacred Circuit Tours
                  </h3>
                  <button onClick={() => setProgressOpen(false)} className="theme-muted hover:theme-title p-1">
                    <CloseIcon />
                  </button>
                </div>

                {HOLY_CIRCUITS.map((c) => {
                  const circuitTemples = TEMPLES.filter((t) => t.circuit_tags?.includes(c.tag))
                  const visited = circuitTemples.filter((t) => visitedIds.has(t.id)).length
                  const pct = c.total > 0 ? (visited / c.total) * 100 : 0

                  return (
                    <div key={c.tag} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-sans">
                        <button
                          onClick={() => {
                            setProgressOpen(false)
                            onStartCircuitTour(c.tag)
                          }}
                          className="font-bold theme-title hover:text-saffron transition-colors flex items-center gap-1.5 text-left"
                        >
                          <span>{c.icon}</span>
                          <span>{c.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-saffron/15 text-saffron">
                            Start Tour ↗
                          </span>
                        </button>
                        <span className="font-mono text-saffron font-bold">
                          {visited}/{c.total}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            pct === 100
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-saffron to-amber-400'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
                <p className="text-[10px] theme-muted font-sans italic pt-1 text-center">
                  Click any circuit to embark on an interactive pilgrimage tour ✦
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-5 bg-[var(--border-gold)]" />

        {/* Ambient Tanpura Drone Toggle */}
        <button
          onClick={onToggleTanpura}
          className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl transition-all duration-300 font-sans text-xs
            ${tanpuraPlaying
              ? 'bg-saffron/20 text-saffron font-bold'
              : 'theme-muted hover:theme-title hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          title={tanpuraPlaying ? 'Stop Tanpura Drone' : 'Play Meditative Tanpura Drone'}
        >
          {tanpuraPlaying ? <VolumeOnIcon /> : <VolumeOffIcon />}
          <span className="hidden sm:inline">
            {tanpuraPlaying ? 'Tanpura' : 'Sound'}
          </span>
          {tanpuraPlaying && (
            <span className="flex gap-[2px] items-end h-3">
              {[1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-[2px] bg-saffron rounded-full"
                  animate={{ height: ['3px', '11px', '3px'] }}
                  transition={{
                    duration: 0.7 + i * 0.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.15,
                  }}
                />
              ))}
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-[var(--border-gold)]" />

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-saffron hover:bg-black/5 dark:hover:bg-white/5 transition-transform duration-200 hover:scale-110 active:scale-95"
          title={theme === 'dark' ? 'Switch to Sunrise Theme (Light)' : 'Switch to Temple Night Theme (Dark)'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </motion.header>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('divine-india-theme') || 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.className = theme
    document.body.className = theme
    try {
      localStorage.setItem('divine-india-theme', theme)
    } catch {}
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const [search, setSearch] = useState('')
  const [deity, setDeity] = useState('All')
  const [era, setEra] = useState('All')
  const [circuit, setCircuit] = useState('All')
  const [selectedTemple, setSelectedTemple] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mapTarget, setMapTarget] = useState(null)

  // Interactive Circuit Tour state
  const [activeCircuit, setActiveCircuit] = useState(null)
  const [currentTourIndex, setCurrentTourIndex] = useState(0)

  // Temples in active pilgrimage circuit
  const circuitTemples = useMemo(() => {
    if (!activeCircuit) return []
    return TEMPLES.filter((t) => t.circuit_tags?.includes(activeCircuit))
  }, [activeCircuit])

  // Visited temples tracking
  const [visitedIds, setVisitedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('divine-india-visited')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('divine-india-visited', JSON.stringify([...visitedIds]))
    } catch {}
  }, [visitedIds])

  // Tanpura engine
  const tanpuraRef = useRef(null)
  const [tanpuraPlaying, setTanpuraPlaying] = useState(false)

  useEffect(() => {
    return () => {
      tanpuraRef.current?.dispose()
    }
  }, [])

  const toggleTanpura = useCallback(() => {
    if (!tanpuraRef.current) {
      tanpuraRef.current = new TanpuraEngine()
    }
    if (tanpuraRef.current.isPlaying) {
      tanpuraRef.current.stop()
      setTanpuraPlaying(false)
    } else {
      tanpuraRef.current.start()
      setTanpuraPlaying(true)
    }
  }, [])

  // Filter logic: when circuit tour is active, show only that circuit's temples
  const filteredTemples = useMemo(() => {
    if (activeCircuit) {
      return circuitTemples
    }

    const q = search.trim().toLowerCase()
    return TEMPLES.filter((t) => {
      const matchesSearch =
        q === '' ||
        t.name.toLowerCase().includes(q) ||
        t.state?.toLowerCase().includes(q) ||
        t.deity?.toLowerCase().includes(q)
      const matchesDeity = deity === 'All' || t.deity === deity
      const matchesEra = era === 'All' || t.period === era
      const matchesCircuit =
        circuit === 'All' || (t.circuit_tags && t.circuit_tags.includes(circuit))
      return matchesSearch && matchesDeity && matchesEra && matchesCircuit
    })
  }, [activeCircuit, circuitTemples, search, deity, era, circuit])

  const handleSelectTemple = useCallback((temple) => {
    setSelectedTemple(temple)
    if (temple.lat != null && temple.lng != null) {
      setMapTarget({ center: [temple.lat, temple.lng], zoom: 13 })
    }
    setVisitedIds((prev) => {
      const next = new Set(prev)
      next.add(temple.id)
      return next
    })
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [])

  // Start Circuit Tour mode
  const startCircuitTour = useCallback((circuitTag) => {
    playTempleChime()
    setActiveCircuit(circuitTag)
    const list = TEMPLES.filter((t) => t.circuit_tags?.includes(circuitTag))
    if (list.length > 0) {
      setCurrentTourIndex(0)
      handleSelectTemple(list[0])
    }
  }, [handleSelectTemple])

  // Stepper index select inside Circuit Tour mode
  const handleTourIndexSelect = useCallback((idx) => {
    if (!circuitTemples || circuitTemples.length === 0) return
    setCurrentTourIndex(idx)
    const temple = circuitTemples[idx]
    if (temple) {
      handleSelectTemple(temple)
    }
  }, [circuitTemples, handleSelectTemple])

  // Exit Circuit Tour mode
  const handleExitTour = useCallback(() => {
    playTempleChime()
    setActiveCircuit(null)
    setCurrentTourIndex(0)
    setSelectedTemple(null)
    setMapTarget({ center: [22.5, 79.0], zoom: 5 })
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedTemple(null)
    setMapTarget({ center: [22.5, 79.0], zoom: 5 })
  }, [])

  return (
    <div className={`w-screen h-screen relative overflow-hidden select-none ${theme}`}>
      {/* ── Leaflet Full Screen Map ── */}
      <TempleMap
        filteredTemples={filteredTemples}
        selectedTemple={selectedTemple}
        onSelectTemple={handleSelectTemple}
        flyTarget={mapTarget}
        theme={theme}
        activeCircuit={activeCircuit}
        circuitTemples={circuitTemples}
      />

      {/* ── Top Bar Header ── */}
      <TopBar
        filteredCount={filteredTemples.length}
        totalCount={TEMPLES.length}
        visitedIds={visitedIds}
        tanpuraPlaying={tanpuraPlaying}
        onToggleTanpura={toggleTanpura}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeCircuit={activeCircuit}
        onStartCircuitTour={startCircuitTour}
      />

      {/* ── Left Explorer Sidebar with 44x44px Thumbnails ── */}
      <Sidebar
        search={search} setSearch={setSearch}
        deity={deity} setDeity={setDeity}
        era={era} setEra={setEra}
        circuit={circuit} setCircuit={setCircuit}
        allDeities={ALL_DEITIES}
        eraOptions={ERA_OPTIONS}
        allCircuits={ALL_CIRCUITS}
        filteredTemples={filteredTemples}
        totalTemples={TEMPLES.length}
        selectedTemple={selectedTemple}
        visitedIds={visitedIds}
        onSelectTemple={handleSelectTemple}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* ── Right Darshan Detail Panel (with Gallery & Clean Typography) ── */}
      <AnimatePresence>
        {selectedTemple && (
          <DarshanPanel
            key={selectedTemple.id}
            selectedTemple={selectedTemple}
            onClose={handleCloseDetail}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* ── Circuit Tour Stepper Bottom Bar ── */}
      <AnimatePresence>
        {activeCircuit && (
          <CircuitTourBar
            activeCircuit={activeCircuit}
            circuitTemples={circuitTemples}
            currentTempleIndex={currentTourIndex}
            onSelectIndex={handleTourIndexSelect}
            onExitTour={handleExitTour}
          />
        )}
      </AnimatePresence>

      {/* ── Soft Gradient Bottom Fade ── */}
      <div className={`fixed bottom-0 left-0 right-0 h-16 pointer-events-none z-[996] ${
        theme === 'dark'
          ? 'bg-gradient-to-t from-[#1A1A24]/70 to-transparent'
          : 'bg-gradient-to-t from-[#FAF7F2]/80 to-transparent'
      }`} />
    </div>
  )
}
