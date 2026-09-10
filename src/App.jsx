import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TempleMap from './components/TempleMap'
import DarshanPanel from './components/DarshanPanel'
import Sidebar from './components/Sidebar'
import CircuitTourBar from './components/CircuitTourBar'
import YatraCompleteModal from './components/YatraCompleteModal'
import BottomAudioPlayer from './components/BottomAudioPlayer'
import { YouTubeAudioEngine } from './audio/youtubeAudioEngine'
import {
  YOUTUBE_BHAKTI_TRACKS,
  getHarmonizedYoutubeTrack,
} from './audio/youtubeBhaktiPlaylists'
import { playTempleChime, playTempleBellSound, preloadTempleBell } from './audio/chimeSound'
import { getUserLocation } from './utils/locationService'
import { getOrderedCircuitTemples } from './utils/circuitOrder'
import { DivineCallingIcon, TanpuraSvgIcon } from './components/ThemedIcons'
import TEMPLES from './data/temples.json'
import GLOBAL_TEMPLES from './data/globalTemples.json'
import { searchGlobalTemples } from './api/overpassService'
import CommunityEditModal from './components/CommunityEditModal'
import CommunityHubModal from './components/CommunityHubModal'
import {
  getCommunityEdits,
  mergeCommunityEdits,
} from './utils/communityEditsService'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CURATED_TEMPLES = [
  ...TEMPLES.map((t) => ({ ...t, country: t.country || 'India' })),
  ...GLOBAL_TEMPLES.map((t) => ({ ...t, country: t.country || 'International' })),
]

const ALL_DEITIES = ['All', ...Array.from(new Set(CURATED_TEMPLES.map((t) => t.deity))).sort()]
const ERA_OPTIONS = ['All', 'Ancient', 'Medieval', 'Modern']
const ALL_CIRCUITS = [
  'All',
  ...Array.from(new Set(CURATED_TEMPLES.flatMap((t) => t.circuit_tags || []))).sort(),
]

const ALL_COUNTRIES = [
  'All',
  'India',
  'Global / International',
  ...Array.from(
    new Set(
      CURATED_TEMPLES.map((t) => t.country).filter(
        (c) => c && c !== 'India' && c !== 'International'
      )
    )
  ).sort(),
]

const HOLY_CIRCUITS = [
  {
    name: '12 Jyotirlingas',
    tag: 'Jyotirlinga',
    total: 12,
    icon: '🔱',
  },
  {
    name: 'Char Dham',
    tag: 'Char Dham',
    total: 4,
    icon: '🛕',
  },
  {
    name: 'Chota Char Dham',
    tag: 'Chota Char Dham',
    total: 4,
    icon: '🏔️',
  },
  {
    name: 'Shakti Peethas',
    tag: 'Shakti Peetha',
    total: CURATED_TEMPLES.filter((t) => t.circuit_tags?.includes('Shakti Peetha')).length,
    icon: '🌺',
  },
  {
    name: 'Global Shrines',
    tag: 'Global Shrines',
    total: CURATED_TEMPLES.filter((t) => t.circuit_tags?.includes('Global Shrines')).length,
    icon: '🌏',
  },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ICONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SearchIcon = () => (
  <svg className="w-3.5 h-3.5 text-saffron flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

const GpsIcon = ({ active, loading }) => (
  <svg
    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="8" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    {active && <circle cx="12" cy="12" r="3" fill="currentColor" />}
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

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOP BAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TopBar({
  filteredCount,
  totalCount,
  visitedIds,
  theme,
  onToggleTheme,
  activeCircuit,
  onStartCircuitTour,
  userLocation,
  isLocating,
  onToggleLocation,
  sidebarOpen,
  onToggleSidebar,
  communityEditsCount = 0,
  onOpenCommunityHub,
}) {
  const [progressOpen, setProgressOpen] = useState(false)

  const totalPilgrimageTemples = useMemo(
    () => HOLY_CIRCUITS.reduce((sum, c) => sum + c.total, 0),
    []
  )
  const totalPilgrimageVisited = useMemo(
    () =>
      CURATED_TEMPLES.filter(
        (t) =>
          HOLY_CIRCUITS.some((c) => t.circuit_tags?.includes(c.tag)) &&
          visitedIds.has(t.id)
      ).length,
    [visitedIds]
  )

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
      className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-2 sm:px-6 py-2 sm:py-2.5 pointer-events-none"
    >
      {/* Brand title & Sidebar Toggle */}
      <div className="glass-strong rounded-2xl px-2 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 pointer-events-auto shadow-lg flex-shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-1 sm:p-1.5 -ml-1 text-saffron hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all active:scale-90 flex items-center justify-center gap-1"
          aria-label={sidebarOpen ? 'Collapse explorer sidebar' : 'Open explorer sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar (Temples list & filters)'}
        >
          {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
          <span className="hidden md:inline text-[11px] font-sans font-bold text-saffron">
            {sidebarOpen ? 'Hide' : 'Temples'}
          </span>
        </button>
        <span className="text-lg sm:text-xl select-none">🛕</span>
        <div>
          <h1 className="text-xs sm:text-sm font-extrabold text-shimmer font-cinzel tracking-wider leading-none">
            Divine India
          </h1>
          <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-sans font-semibold mt-0.5 theme-muted hidden sm:block">
            The Temple Explorer
          </p>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="glass-strong rounded-2xl px-1.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-2 pointer-events-auto shadow-lg flex-shrink-0">
        {/* Temple count */}
        <div className="px-1.5 sm:px-2 py-1 flex items-center gap-1 text-xs font-sans">
          <span className="theme-muted hidden sm:inline">Temples</span>
          <span className="font-bold text-saffron font-mono text-xs sm:text-sm">{filteredCount}</span>
          <span className="theme-muted text-[10px] hidden sm:inline">/ {totalCount}</span>
        </div>

        <div className="w-px h-4 sm:h-5 bg-[var(--border-gold)]" />

        {/* Current Location (Near Me) Button */}
        <button
          onClick={onToggleLocation}
          disabled={isLocating}
          className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 flex items-center gap-1.5
            ${userLocation
              ? 'bg-sky-500/20 text-sky-500 border border-sky-500/40 shadow-md shadow-sky-500/15'
              : 'hover:bg-black/5 dark:hover:bg-white/5 theme-title'
            }`}
          title={userLocation ? 'Reset GPS location filter' : 'Locate temples near my current position'}
        >
          <GpsIcon active={Boolean(userLocation)} loading={isLocating} />
          <span className="hidden sm:inline">
            {isLocating ? 'Locating…' : 'Near Me'}
          </span>
          {userLocation && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          )}
        </button>

        <div className="w-px h-4 sm:h-5 bg-[var(--border-gold)]" />

        {/* Pilgrimage Circuits - Compact on Mobile & Tablets, Expanded on Desktop */}
        <div className="relative flex items-center">
          {/* Mobile & Tablet Compact Circuit Tour Trigger Button */}
          <button
            onClick={() => setProgressOpen(!progressOpen)}
            className={`lg:hidden px-2 py-1 rounded-xl text-xs font-sans font-bold transition-all duration-200 flex items-center gap-1
              ${activeCircuit
                ? 'bg-saffron text-slate-950 shadow-md shadow-saffron/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5 theme-title'
              }`}
            title="Sacred Pilgrimage Circuit Tours"
          >
            <span>
              {activeCircuit
                ? HOLY_CIRCUITS.find((c) => c.tag === activeCircuit)?.icon || '🔱'
                : '🔱'}
            </span>
            <span className="hidden sm:inline">
              {activeCircuit || 'Circuits'}
            </span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                activeCircuit
                  ? 'bg-black/20 text-slate-950'
                  : 'bg-saffron/15 text-saffron'
              }`}
            >
              {totalPilgrimageVisited}/{totalPilgrimageTemples}
            </span>
            <ChevronIcon open={progressOpen} />
          </button>

          {/* Desktop Full Circuit Tour Buttons */}
          <div className="hidden lg:flex items-center gap-1">
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
                  <span>{c.name}</span>
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
          </div>

          {/* Progress Dropdown Modal with tap-outside backdrop */}
          <AnimatePresence>
            {progressOpen && (
              <>
                <div
                  className="fixed inset-0 z-[1000]"
                  onClick={() => setProgressOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-20px)] glass-strong rounded-2xl p-4 space-y-3.5 shadow-2xl z-[1001]"
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
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-4 sm:h-5 bg-[var(--border-gold)]" />



        {/* Community Contributions Hub Trigger */}
        <button
          onClick={onOpenCommunityHub}
          className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl font-sans text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 theme-title transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          title="Community Contributions & Edits Hub"
        >
          <span>🪔</span>
          <span className="hidden md:inline">Community</span>
          {communityEditsCount > 0 && (
            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded-full bg-amber-500 text-stone-950 font-mono">
              {communityEditsCount}
            </span>
          )}
        </button>

        <div className="w-px h-4 sm:h-5 bg-[var(--border-gold)]" />

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 sm:p-2 rounded-xl text-saffron hover:bg-black/5 dark:hover:bg-white/5 transition-transform duration-200 hover:scale-110 active:scale-95"
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

  useEffect(() => {
    preloadTempleBell()
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const [search, setSearch] = useState('')
  const [deity, setDeity] = useState('All')
  const [era, setEra] = useState('All')
  const [circuit, setCircuit] = useState('All')
  const [selectedCountry, setSelectedCountry] = useState('All')
  const [discoveredTemples, setDiscoveredTemples] = useState([])
  const [selectedTemple, setSelectedTemple] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768
    }
    return false
  })
  const [mapTarget, setMapTarget] = useState(null)

  // Community Edits & Custom Shrines State
  const [communityVersion, setCommunityVersion] = useState(0)
  const [communityEditModalOpen, setCommunityEditModalOpen] = useState(false)
  const [communityModalMode, setCommunityModalMode] = useState('edit') // 'edit' | 'add' | 'photo_only'
  const [editingTemple, setEditingTemple] = useState(null)
  const [communityHubOpen, setCommunityHubOpen] = useState(false)
  const [previewPendingContributions, setPreviewPendingContributions] = useState(() => {
    try {
      const stored = localStorage.getItem('divine-india-preview-pending')
      return stored != null ? JSON.parse(stored) : true
    } catch {
      return true
    }
  })

  const handleTogglePreviewPending = useCallback((enabled) => {
    setPreviewPendingContributions(enabled)
    try {
      localStorage.setItem('divine-india-preview-pending', JSON.stringify(enabled))
    } catch {
      // ignore
    }
  }, [])

  // Listen to community storage updates across windows and components
  useEffect(() => {
    const handleCommunityUpdate = () => {
      setCommunityVersion((v) => v + 1)
    }
    window.addEventListener('divine-india-community-updated', handleCommunityUpdate)
    return () => window.removeEventListener('divine-india-community-updated', handleCommunityUpdate)
  }, [])

  const communityContributions = useMemo(() => {
    const data = getCommunityEdits()
    const count =
      Object.keys(data.edits || {}).length +
      (data.newTemples || []).length +
      (data.photos || []).length
    return { data, count }
  }, [communityVersion])

  // Combined master temples list (Curated India + Curated Global + Community Edits/Additions + Live Radar/OSM discovered)
  const allTemples = useMemo(() => {
    const withCommunity = mergeCommunityEdits(CURATED_TEMPLES, {
      includePending: previewPendingContributions,
    })
    const existingIds = new Set(withCommunity.map((t) => t.id))
    const uniqueDiscovered = discoveredTemples.filter((t) => !existingIds.has(t.id))
    return [...withCommunity, ...uniqueDiscovered]
  }, [discoveredTemples, communityVersion, previewPendingContributions])

  const handleOpenEditTemple = useCallback((templeToEdit) => {
    setEditingTemple(templeToEdit)
    setCommunityModalMode('edit')
    setCommunityEditModalOpen(true)
  }, [])

  const handleOpenAddNewTemple = useCallback(() => {
    setEditingTemple(null)
    setCommunityModalMode('add')
    setCommunityEditModalOpen(true)
  }, [])

  const handleOpenPhotoOnlyContribution = useCallback((templeTarget) => {
    setEditingTemple(templeTarget)
    setCommunityModalMode('photo_only')
    setCommunityEditModalOpen(true)
  }, [])

  const handleSavedCommunityTemple = useCallback((savedItem) => {
    const target = savedItem?.temple || savedItem?.edit?.updated
    if (target) {
      playTempleBellSound(target)
      setSelectedTemple(target)
      if (target.lat && target.lng) {
        setMapTarget({ center: [target.lat, target.lng], zoom: 12 })
      }
    }
  }, [])

  // User Current Location State
  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationToast, setLocationToast] = useState(null)

  const showLocationToast = (msg, duration = 4000) => {
    setLocationToast(msg)
    setTimeout(() => setLocationToast(null), duration)
  }

  // Update user location (e.g. from dragging the pin)
  const handleUpdateUserLocation = useCallback((newLoc) => {
    setUserLocation(newLoc)
    showLocationToast('📍 Pin moved! Distances & nearest temples updated.', 3500)
  }, [])

  // Toggle user geolocation with multi-tier fallback
  const handleToggleLocation = useCallback(async () => {
    if (userLocation) {
      setUserLocation(null)
      showLocationToast('📍 Location reset to India overview', 3000)
      setMapTarget({ center: [22.5, 79.0], zoom: 5 })
      return
    }

    setIsLocating(true)
    try {
      const loc = await getUserLocation()
      setIsLocating(false)
      if (loc && loc.lat != null && loc.lng != null) {
        setUserLocation({ lat: loc.lat, lng: loc.lng })
        playTempleChime()
        setMapTarget({ center: [loc.lat, loc.lng], zoom: 11 })
        showLocationToast('📍 Located! Showing nearest temples sorted by distance.', 4000)
      } else {
        showLocationToast('Could not detect location. Please check location permissions.', 5000)
      }
    } catch {
      setIsLocating(false)
      showLocationToast('Location detection error. Please check browser settings.', 5000)
    }
  }, [userLocation])

  // Interactive Circuit Tour state
  const [activeCircuit, setActiveCircuit] = useState(null)
  const [currentTourIndex, setCurrentTourIndex] = useState(0)
  const [yatraModalOpen, setYatraModalOpen] = useState(false)

  // Temples in active pilgrimage circuit (canonically ordered to eliminate criss-crossing)
  const circuitTemples = useMemo(() => {
    if (!activeCircuit) return []
    return getOrderedCircuitTemples(activeCircuit, allTemples)
  }, [activeCircuit, allTemples])

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

  // ── Sacred Devotional Audio State (YouTube Bhakti Background Streaming) ──
  const ytEngineRef = useRef(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioBuffering, setAudioBuffering] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(() => YOUTUBE_BHAKTI_TRACKS[0])
  const [tracksList, setTracksList] = useState(() => YOUTUBE_BHAKTI_TRACKS)
  const [soundVolume, setSoundVolume] = useState(0.8)
  const [autoHarmonize, setAutoHarmonize] = useState(true)

  const activeTrack = currentTrack || tracksList[0] || YOUTUBE_BHAKTI_TRACKS[0]

  useEffect(() => {
    const engine = new YouTubeAudioEngine()
    ytEngineRef.current = engine

    engine
      .init('youtube-bg-player-mount', {
        onStateChange: ({ isPlaying, isBuffering }) => {
          setAudioPlaying(isPlaying)
          setAudioBuffering(isBuffering)
        },
        onTrackChange: (track) => {
          setCurrentTrack(track)
        },
        onError: (errCode) => {
          console.warn('[YouTube Audio Error]', errCode)
        },
      })
      .then(() => {
        // Attempt initial autoplay on page load
        engine.play()
      })
      .catch((err) => {
        console.warn('[YouTube Audio Init]', err)
      })

    return () => {
      engine.destroy()
    }
  }, [])

  const handleTogglePlay = useCallback(() => {
    if (!ytEngineRef.current) return
    if (ytEngineRef.current.isPlaying || audioPlaying) {
      ytEngineRef.current.pause()
      setAudioPlaying(false)
    } else {
      ytEngineRef.current.play()
      setAudioPlaying(true)
    }
  }, [audioPlaying])

  const handleNextTrack = useCallback(() => {
    if (!ytEngineRef.current) return
    ytEngineRef.current.next()
  }, [])

  const handlePrevTrack = useCallback(() => {
    if (!ytEngineRef.current) return
    ytEngineRef.current.prev()
  }, [])

  const handleSelectTrack = useCallback((track) => {
    if (!ytEngineRef.current) return
    ytEngineRef.current.loadTrack(track)
  }, [])

  const handleAddCustomTrack = useCallback((rawInput) => {
    if (!ytEngineRef.current) return
    const success = ytEngineRef.current.loadCustomInput(rawInput)
    if (success) {
      setTracksList([...ytEngineRef.current.tracks])
      setCurrentTrack(ytEngineRef.current.currentTrack)
    }
  }, [])

  const handleVolumeChange = useCallback((val) => {
    setSoundVolume(val)
    if (ytEngineRef.current) {
      ytEngineRef.current.setVolume(val)
    }
  }, [])

  const handleToggleAutoHarmonize = useCallback(() => {
    setAutoHarmonize((prev) => !prev)
  }, [])

  // Auto-harmonize devotional YouTube bhajan/chant when selected temple changes
  useEffect(() => {
    if (!selectedTemple || !autoHarmonize || !ytEngineRef.current) return
    const harmonizedId = getHarmonizedYoutubeTrack(selectedTemple)
    const matched = tracksList.find((t) => t.id === harmonizedId)
    if (matched && currentTrack?.id !== matched.id) {
      ytEngineRef.current.loadTrack(matched)
    }
  }, [selectedTemple, autoHarmonize, tracksList, currentTrack?.id])

  // Filter logic: when circuit tour is active, show only that circuit's temples
  const filteredTemples = useMemo(() => {
    if (activeCircuit) {
      return circuitTemples
    }

    const q = search.trim().toLowerCase()
    return allTemples.filter((t) => {
      const matchesSearch =
        q === '' ||
        t.name.toLowerCase().includes(q) ||
        t.state?.toLowerCase().includes(q) ||
        t.country?.toLowerCase().includes(q) ||
        t.deity?.toLowerCase().includes(q)
      const matchesDeity = deity === 'All' || t.deity === deity
      const matchesEra = era === 'All' || t.period === era
      const matchesCircuit =
        circuit === 'All' || (t.circuit_tags && t.circuit_tags.includes(circuit))
      const matchesCountry =
        selectedCountry === 'All' ||
        (selectedCountry === 'India' && (t.country === 'India' || !t.country)) ||
        (selectedCountry === 'Global / International' &&
          t.country !== 'India' &&
          Boolean(t.country)) ||
        t.country === selectedCountry

      return matchesSearch && matchesDeity && matchesEra && matchesCircuit && matchesCountry
    })
  }, [activeCircuit, circuitTemples, allTemples, search, deity, era, circuit, selectedCountry])

  // Select temple, center map camera, ring sacred temple bell, and mark visited in normal mode
  const handleSelectTemple = useCallback(
    (temple) => {
      if (!temple) return
      playTempleBellSound(temple)
      setSelectedTemple(temple)
      if (
        temple.lat != null &&
        temple.lng != null &&
        !isNaN(temple.lat) &&
        !isNaN(temple.lng)
      ) {
        setMapTarget({ center: [temple.lat, temple.lng], zoom: 13 })
      }
      // In normal explorer mode, viewing a temple marks it visited
      if (!activeCircuit) {
        setVisitedIds((prev) => {
          const next = new Set(prev)
          next.add(temple.id)
          return next
        })
      }
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    },
    [activeCircuit]
  )

  // "दैवयोग · Divine Calling" — Spontaneous pilgrimage to a sacred shrine
  const handleDivineCalling = useCallback(() => {
    const pool = selectedTemple
      ? allTemples.filter((t) => t.id !== selectedTemple.id)
      : allTemples
    if (pool.length === 0) return

    const randomTemple = pool[Math.floor(Math.random() * pool.length)]
    handleSelectTemple(randomTemple)
    showLocationToast(
      `✨ दैवयोग · Divine Calling: You have been guided to ${randomTemple.name}, ${[
        randomTemple.state,
        randomTemple.country || 'India',
      ]
        .filter(Boolean)
        .join(', ')} 🙏`,
      5000
    )
  }, [selectedTemple, allTemples, handleSelectTemple])

  // Add discovered local/worldwide shrines to dynamic database
  const handleAddDiscoveredTemples = useCallback((newTemples) => {
    if (!newTemples || newTemples.length === 0) return
    setDiscoveredTemples((prev) => {
      const existing = new Set([
        ...CURATED_TEMPLES.map((t) => t.id),
        ...prev.map((t) => t.id),
      ])
      const unique = newTemples.filter((t) => !existing.has(t.id))
      if (unique.length === 0) return prev
      return [...prev, ...unique]
    })
  }, [])

  // Live on-demand global search across Google Maps & OpenStreetMap
  const handleSearchGlobalLive = useCallback(
    async (query) => {
      try {
        const results = await searchGlobalTemples(query)
        if (results && results.length > 0) {
          handleAddDiscoveredTemples(results)
          const first = results[0]
          handleSelectTemple(first)
          playTempleChime()
          showLocationToast(
            `✨ Discovered ${first.name}, ${first.country || 'Global'}! Added to map.`,
            5000
          )
          return results
        }
        return []
      } catch {
        return []
      }
    },
    [handleAddDiscoveredTemples, handleSelectTemple]
  )

  // Handle taking Darshan at current pilgrimage stop
  const handleTakeDarshan = useCallback(
    (temple) => {
      if (!temple) return
      setVisitedIds((prev) => {
        const next = new Set(prev)
        next.add(temple.id)

        // Check if all temples in the active circuit have been sanctified
        if (activeCircuit && circuitTemples.length > 0) {
          const allCompleted = circuitTemples.every((t) => next.has(t.id))
          if (allCompleted) {
            setTimeout(() => setYatraModalOpen(true), 600)
          }
        }
        return next
      })
    },
    [activeCircuit, circuitTemples]
  )

  // Start Circuit Tour mode
  const startCircuitTour = useCallback(
    (circuitTag) => {
      setActiveCircuit(circuitTag)
      const list = getOrderedCircuitTemples(circuitTag, allTemples)
      if (list.length > 0) {
        setCurrentTourIndex(0)
        handleSelectTemple(list[0])
      }
    },
    [allTemples, handleSelectTemple]
  )

  // Stepper index select inside Circuit Tour mode
  const handleTourIndexSelect = useCallback(
    (idx) => {
      if (!circuitTemples || circuitTemples.length === 0) return
      setCurrentTourIndex(idx)
      const temple = circuitTemples[idx]
      if (temple) {
        handleSelectTemple(temple)
      }
    },
    [circuitTemples, handleSelectTemple]
  )

  // Exit Circuit Tour mode
  const handleExitTour = useCallback(() => {
    playTempleChime()
    setActiveCircuit(null)
    setCurrentTourIndex(0)
    setSelectedTemple(null)
    setYatraModalOpen(false)
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
        visitedIds={visitedIds}
        userLocation={userLocation}
        onUpdateUserLocation={handleUpdateUserLocation}
        onAddDiscoveredTemples={handleAddDiscoveredTemples}
      />

      {/* ── Top Bar Header (with GPS Near Me & Pilgrimage) ── */}
      <TopBar
        filteredCount={filteredTemples.length}
        totalCount={allTemples.length}
        visitedIds={visitedIds}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeCircuit={activeCircuit}
        onStartCircuitTour={startCircuitTour}
        userLocation={userLocation}
        isLocating={isLocating}
        onToggleLocation={handleToggleLocation}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        communityEditsCount={communityContributions.count}
        onOpenCommunityHub={() => setCommunityHubOpen(true)}
      />

      {/* ── Left Explorer Sidebar with 44x44px Thumbnails, Divine Calling, Country Filter & Live Radar Search ── */}
      <Sidebar
        search={search} setSearch={setSearch}
        deity={deity} setDeity={setDeity}
        era={era} setEra={setEra}
        circuit={circuit} setCircuit={setCircuit}
        country={selectedCountry} setCountry={setSelectedCountry}
        allDeities={ALL_DEITIES}
        eraOptions={ERA_OPTIONS}
        allCircuits={ALL_CIRCUITS}
        allCountries={ALL_COUNTRIES}
        filteredTemples={filteredTemples}
        totalTemples={allTemples.length}
        selectedTemple={selectedTemple}
        visitedIds={visitedIds}
        onSelectTemple={handleSelectTemple}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userLocation={userLocation}
        onDivineCalling={handleDivineCalling}
        onSearchGlobalLive={handleSearchGlobalLive}
        onAddNewTemple={handleOpenAddNewTemple}
        onOpenCommunityHub={() => setCommunityHubOpen(true)}
        communityEditsCount={communityContributions.count}
      />

      {/* ── Right Darshan Detail Panel (with Gallery & Directions) ── */}
      <AnimatePresence>
        {selectedTemple && (
          <DarshanPanel
            key={selectedTemple.id}
            selectedTemple={selectedTemple}
            onClose={handleCloseDetail}
            theme={theme}
            userLocation={userLocation}
            onSuggestEdit={handleOpenEditTemple}
            onContributePhoto={handleOpenPhotoOnlyContribution}
          />
        )}
      </AnimatePresence>

      {/* ── Centerpiece: "दैवयोग · Divine Calling" at Bottom Center ── */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[997] transition-all duration-300 pointer-events-auto ${
          activeCircuit ? 'bottom-[188px] sm:bottom-[202px]' : 'bottom-[70px] sm:bottom-[78px]'
        }`}
      >
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDivineCalling}
          className="group relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-saffron to-orange-600 text-white font-cinzel font-bold text-xs sm:text-sm shadow-xl shadow-saffron/30 hover:shadow-2xl hover:shadow-saffron/50 border border-amber-200/40 backdrop-blur-md transition-all duration-300 cursor-pointer"
          title="दैवयोग · Divine Calling: Receive a spontaneous calling to a sacred temple"
        >
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-60 group-hover:opacity-100 blur transition-all duration-500 animate-pulse pointer-events-none" />
          <span className="relative flex items-center gap-2">
            <DivineCallingIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200 group-hover:rotate-45 transition-transform duration-300" />
            <span className="tracking-wide drop-shadow-sm font-extrabold">दैवयोग · Divine Calling</span>
            <span className="text-xs sm:text-sm animate-pulse select-none" aria-hidden="true">✨</span>
          </span>
        </motion.button>
      </div>

      {/* ── Circuit Tour Stepper Bottom Bar ── */}
      <AnimatePresence>
        {activeCircuit && (
          <CircuitTourBar
            activeCircuit={activeCircuit}
            circuitTemples={circuitTemples}
            currentTempleIndex={currentTourIndex}
            visitedIds={visitedIds}
            onSelectIndex={handleTourIndexSelect}
            onTakeDarshan={handleTakeDarshan}
            onExitTour={handleExitTour}
            soundPlaying={audioPlaying}
            currentSoundName={activeTrack.shortName}
            onOpenSoundSanctuary={handleTogglePlay}
          />
        )}
      </AnimatePresence>

      {/* ── Compact Sacred Audio Player Docked at Bottom (YouTube Background Streaming) ── */}
      <BottomAudioPlayer
        isPlaying={audioPlaying}
        isBuffering={audioBuffering}
        currentTrack={currentTrack}
        tracks={tracksList}
        onTogglePlay={handleTogglePlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onSelectTrack={handleSelectTrack}
        onAddCustomTrack={handleAddCustomTrack}
        volume={soundVolume}
        onVolumeChange={handleVolumeChange}
        autoHarmonize={autoHarmonize}
        onToggleAutoHarmonize={handleToggleAutoHarmonize}
        isTourActive={Boolean(activeCircuit)}
      />

      {/* ── Dedicated Headless YouTube IFrame Audio Stream Mount (100% Invisible, No Ghost Overlays) ── */}
      <div
        id="youtube-bg-player-container"
        className="fixed bottom-0 left-0 w-60 h-36 opacity-[0.002] pointer-events-none z-[-50] overflow-hidden select-none"
        aria-hidden="true"
        tabIndex="-1"
      >
        <div id="youtube-bg-player-mount" />
      </div>

      {/* ── Yatra Completion Celebration & Holy Certificate Modal ── */}
      <YatraCompleteModal
        isOpen={yatraModalOpen}
        circuitName={activeCircuit}
        circuitTemples={circuitTemples}
        onClose={() => setYatraModalOpen(false)}
        onRevisit={() => {
          setYatraModalOpen(false)
          handleTourIndexSelect(0)
        }}
      />

      {/* ── Community Edit & Add Temple Modal ── */}
      <CommunityEditModal
        isOpen={communityEditModalOpen}
        mode={communityModalMode}
        temple={editingTemple}
        onClose={() => {
          setCommunityEditModalOpen(false)
          setEditingTemple(null)
        }}
        onSaved={handleSavedCommunityTemple}
      />

      {/* ── Community Hub Modal (Dashboard of contributions) ── */}
      <CommunityHubModal
        isOpen={communityHubOpen}
        onClose={() => setCommunityHubOpen(false)}
        onOpenAddModal={handleOpenAddNewTemple}
        onOpenEditModal={handleOpenEditTemple}
        onSelectTemple={(t) => {
          handleSelectTemple(t)
        }}
        previewPending={previewPendingContributions}
        onTogglePreviewPending={handleTogglePreviewPending}
      />

      {/* ── Geolocation Toast Notification ── */}
      <AnimatePresence>
        {locationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[1002] glass-strong rounded-2xl px-4 py-2.5 text-xs font-sans font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-2xl flex items-center gap-2"
          >
            <span>{locationToast}</span>
          </motion.div>
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
