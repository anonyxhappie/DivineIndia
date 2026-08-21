import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchTempleDetails } from '../api/wikipediaService'
import { playTempleChime } from '../audio/chimeSound'
import { calculateDistance, formatDistance } from '../utils/geoUtils'
import Lightbox from './Lightbox'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Inline SVG icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const WikiIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" opacity="0.85">
    <path d="M12.09 13.119c-.14 1.064-.496 2.4-1.066 3.816-.57 1.416-1.15 2.484-1.74 3.203l-.207.255c-.122.134-.32.134-.44 0l-.208-.255c-.59-.72-1.17-1.787-1.74-3.203-.57-1.416-.926-2.752-1.066-3.816h6.467zm-7.281 0C4.994 14.842 5.744 16.408 7.09 17.772l.175.172c.12.113.12.305 0 .418l-.175.172C5.744 19.898 4.994 21.464 4.809 23.187H2.315c.277-3.58 1.263-6.533 2.494-10.068zm14.382 0c1.231 3.535 2.217 6.488 2.494 10.068H19.19c-.185-1.723-.935-3.289-2.281-4.653l-.175-.172c-.12-.113-.12-.305 0-.418l.175-.172c1.346-1.364 2.096-2.93 2.281-4.653zM12.09 1.005c.14 1.064.496 2.4 1.066 3.816.57 1.416 1.15 2.484 1.74 3.203l.207.255c.122.134.32.134.44 0l.208-.255c.59-.72 1.17-1.787 1.74-3.203-.57-1.416.926-2.752 1.066-3.816H12.09z" />
  </svg>
)

const ExpandIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

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

const TABS = [
  { id: 'history', label: 'History & Lore', icon: '📜' },
  { id: 'architecture', label: 'Architecture & Deity', icon: '🛕' },
  { id: 'pilgrimage', label: 'Pilgrimage Guide', icon: '🙏' },
]

function ContentSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <div className="h-3.5 bg-current opacity-10 rounded animate-pulse w-[90%]" />
      <div className="h-3.5 bg-current opacity-10 rounded animate-pulse w-[100%]" />
      <div className="h-3.5 bg-current opacity-10 rounded animate-pulse w-[80%]" />
      <div className="h-3.5 bg-current opacity-10 rounded animate-pulse w-[95%]" />
      <div className="h-3.5 bg-current opacity-10 rounded animate-pulse w-[65%]" />
      <div className="pt-2" />
      <div className="h-3.5 bg-current opacity-10 rounded animate-pulse w-[85%]" />
      <div className="h-3.5 bg-current opacity-10 rounded animate-pulse w-[100%]" />
    </div>
  )
}

function HistoryTab({ temple, wikiData, loading, error }) {
  // Split raw text by newline characters into distinct formatted paragraphs
  const paragraphs = useMemo(() => {
    if (!wikiData?.extract) return []
    return wikiData.extract
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
  }, [wikiData?.extract])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 theme-gold">
            <WikiIcon />
            <h4 className="text-[11px] font-bold uppercase tracking-widest font-cinzel">
              Sacred Heritage
            </h4>
          </div>
          {loading && (
            <span className="text-[10px] text-saffron font-sans animate-pulse font-bold">
              fetching live lore…
            </span>
          )}
        </div>

        {loading && <ContentSkeleton />}

        {error && (
          <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/25">
            <p className="text-xs text-red-500 font-sans font-medium">
              Could not load live Wikipedia extract. Showing temple record details.
            </p>
          </div>
        )}

        {/* Clean paragraph formatting with mb-4 spacing and high-contrast theme-body */}
        {!loading && paragraphs.length > 0 && (
          <div className="space-y-1">
            {paragraphs.map((para, idx) => (
              <p
                key={idx}
                className="mb-4 text-[15px] font-sans leading-[1.75] tracking-normal theme-body"
              >
                {para}
              </p>
            ))}
          </div>
        )}

        {!loading && paragraphs.length === 0 && !error && (
          <div className="space-y-3">
            <p className="mb-4 text-[15px] font-sans leading-[1.75] tracking-normal theme-body">
              {temple.name} is a renowned spiritual pilgrimage shrine situated in{' '}
              <strong className="font-semibold theme-gold">{temple.state || 'India'}</strong>
              {temple.era ? `, historically dated to the ${temple.era}` : ''}.
            </p>
            <p className="mb-4 text-[15px] font-sans leading-[1.75] tracking-normal theme-body">
              Dedicated to <strong className="font-semibold text-saffron">{temple.deity || 'the Divine'}</strong>, it represents an enduring pinnacle of sacred devotion, architecture, and Vedic heritage.
            </p>
          </div>
        )}
      </div>

      {/* Wikipedia Source link */}
      {temple.wiki_slug && (
        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 h-px bg-[var(--border-gold)]" />
          <a
            href={`https://en.wikipedia.org/wiki/${temple.wiki_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-sans theme-gold hover:text-saffron transition-colors flex items-center gap-1 font-bold"
          >
            Read Full Article on Wikipedia <ExternalLinkIcon />
          </a>
          <div className="flex-1 h-px bg-[var(--border-gold)]" />
        </div>
      )}
    </motion.div>
  )
}

function ArchitectureTab({ temple, userLocation }) {
  const deityEmoji = DEITY_EMOJIS[temple.deity] || '🛕'

  const distanceKm = userLocation && temple.lat != null && temple.lng != null
    ? calculateDistance(userLocation.lat, userLocation.lng, temple.lat, temple.lng)
    : null
  const formattedDist = distanceKm != null ? formatDistance(distanceKm) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      {/* Deity Card */}
      <div className="glass rounded-xl p-4 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest theme-gold font-cinzel">
          Primary Deity
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-3xl filter drop-shadow">{deityEmoji}</span>
          <div>
            <p className="font-cinzel font-bold text-lg leading-tight theme-title">
              {temple.deity || 'Hindu Divinity'}
            </p>
            <p className="text-xs theme-muted font-sans font-medium">
              {temple.era ? `${temple.era} era` : 'Sacred Place of Worship'}
            </p>
          </div>
        </div>
      </div>

      {/* Geographic Coordinates & Location */}
      <div className="glass rounded-xl p-4 space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest theme-gold font-cinzel">
          Location & Geography
        </h4>
        <div className="space-y-2 text-xs font-sans">
          <div className="flex items-center justify-between">
            <span className="theme-muted">Region / State:</span>
            <span className="font-bold theme-title">{temple.state || 'India'}</span>
          </div>

          {formattedDist && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
              <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                <span>📍</span> Distance from You:
              </span>
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                {formattedDist} away
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="theme-muted">Coordinates:</span>
            <span className="font-mono text-saffron font-bold">
              {temple.lat != null ? temple.lat.toFixed(4) : '—'}°N, {temple.lng != null ? temple.lng.toFixed(4) : '—'}°E
            </span>
          </div>
          {temple.period && (
            <div className="flex items-center justify-between">
              <span className="theme-muted">Historical Period:</span>
              <span className="font-bold theme-title">{temple.period} Period</span>
            </div>
          )}
        </div>

        {/* Circuit Badges */}
        {temple.circuit_tags && temple.circuit_tags.length > 0 && (
          <div className="pt-2.5 border-t border-[var(--border-gold)]">
            <p className="text-[10px] uppercase font-bold theme-gold mb-1.5 font-cinzel">
              Sacred Circuits
            </p>
            <div className="flex flex-wrap gap-1.5">
              {temple.circuit_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-saffron/15 border border-saffron/30 text-saffron text-[10px] font-bold font-sans"
                >
                  ✦ {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function PilgrimageTab({ temple }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="glass rounded-xl p-4 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest theme-gold font-cinzel">
          Best Time For Darshan
        </h4>
        <p className="text-xs leading-relaxed font-sans theme-body">
          <strong className="text-saffron font-bold">October to March:</strong> Ideal climate across India with auspicious festival celebrations (Maha Shivratri, Navratri, Diwali, Karthigai Deepam).
        </p>
      </div>

      <div className="glass rounded-xl p-4 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest theme-gold font-cinzel">
          Pilgrimage Etiquette & Tips
        </h4>
        <ul className="space-y-1.5 text-xs font-sans theme-body">
          <li className="flex items-start gap-2">
            <span className="text-saffron mt-0.5">✦</span>
            <span>Traditional Indian attire is recommended (dhoti/kurta/saree).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-saffron mt-0.5">✦</span>
            <span>Footwear stands and mobile lockers are provided at temple gates.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-saffron mt-0.5">✦</span>
            <span>Early morning (Brahma Muhurta) darshan offers peaceful prayers.</span>
          </li>
        </ul>
      </div>

      <div className="glass rounded-xl p-3 text-[11px] font-sans italic theme-muted border-l-2 border-saffron">
        🙏 Sacred Prasadam (holy offering) and pilgrim guest houses (Dharamshalas) are maintained by the temple management trusts.
      </div>
    </motion.div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main DarshanPanel Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function DarshanPanel({ selectedTemple, onClose, theme = 'dark', userLocation = null }) {
  const [activeTab, setActiveTab] = useState('history')
  const [wikiData, setWikiData] = useState(null)
  const [wikiLoading, setWikiLoading] = useState(false)
  const [wikiError, setWikiError] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [selectedHeroImage, setSelectedHeroImage] = useState(null)

  // Lightbox modal state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Fetch Wikipedia details and Wikimedia gallery when temple changes
  useEffect(() => {
    if (!selectedTemple) return

    setImageLoaded(false)
    setSelectedHeroImage(null)
    setActiveTab('history')
    setLightboxOpen(false)

    if (!selectedTemple.wiki_slug) {
      setWikiData(null)
      setWikiLoading(false)
      setWikiError(null)
      return
    }

    let isMounted = true
    setWikiLoading(true)
    setWikiError(null)
    setWikiData(null)

    fetchTempleDetails(selectedTemple.wiki_slug)
      .then((data) => {
        if (isMounted) {
          setWikiData(data)
          setSelectedHeroImage(data?.imageUrl || selectedTemple.image_url || null)
          setWikiLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setWikiError(err.message || 'Error fetching temple details')
          setWikiLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedTemple?.id, selectedTemple?.wiki_slug])

  const handleTabChange = (tabId) => {
    if (activeTab !== tabId) {
      playTempleChime()
      setActiveTab(tabId)
    }
  }

  if (!selectedTemple) return null

  const currentHero = selectedHeroImage || wikiData?.imageUrl || selectedTemple.image_url || null

  // Ensure all available photos are included in the Lightbox array (guaranteed at least [currentHero] if an image exists)
  const allGalleryImages = useMemo(() => {
    const list = []
    if (currentHero) list.push(currentHero)
    if (wikiData?.imageUrl && !list.includes(wikiData.imageUrl)) list.push(wikiData.imageUrl)
    if (selectedTemple.image_url && !list.includes(selectedTemple.image_url)) list.push(selectedTemple.image_url)
    if (Array.isArray(wikiData?.galleryImages)) {
      for (const img of wikiData.galleryImages) {
        if (img && !list.includes(img)) list.push(img)
      }
    }
    return list
  }, [currentHero, wikiData?.imageUrl, wikiData?.galleryImages, selectedTemple.image_url])

  const openLightboxForImage = (imgUrl) => {
    let targetList = allGalleryImages
    if (imgUrl && !targetList.includes(imgUrl)) {
      targetList = [imgUrl, ...targetList]
    }
    const idx = targetList.findIndex((g) => g === imgUrl)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setLightboxOpen(true)
  }

  // Exact place search query for Google Maps (snaps directly to verified temple place listing rather than raw coordinates)
  const placeSearchQuery = [
    selectedTemple.name,
    selectedTemple.location,
    selectedTemple.state,
    'India',
  ]
    .filter(Boolean)
    .join(', ')

  // Turn-by-turn navigation link to the exact temple
  const mapsDirectionsLink = userLocation && userLocation.lat != null && userLocation.lng != null
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${encodeURIComponent(placeSearchQuery)}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeSearchQuery)}&travelmode=driving`

  // Exact Google Maps place page (photos, timings, reviews, exact entrance gate)
  const mapsPlaceLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeSearchQuery)}`

  return (
    <>
      <motion.aside
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed top-14 sm:top-16 right-0 sm:right-4 bottom-2 sm:bottom-4 w-full sm:w-[420px] z-[1000]
                 glass-strong rounded-none sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        {/* ── Hero Banner Section (clickable for Lightbox) ── */}
        <div
          onClick={() => {
            if (currentHero) openLightboxForImage(currentHero)
          }}
          className="relative h-48 sm:h-52 overflow-hidden flex-shrink-0 bg-gradient-to-b from-amber-950/30 to-transparent cursor-pointer group"
          title="Click to view full-screen photo"
        >
          <AnimatePresence mode="wait">
            {currentHero ? (
              <motion.img
                key={currentHero}
                src={currentHero}
                alt={selectedTemple.name}
                onLoad={() => setImageLoaded(true)}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-saffron/20 via-amber-900/20 to-amber-950/40 p-6 text-center">
                <span className="text-5xl filter drop-shadow-md mb-2">
                  {DEITY_EMOJIS[selectedTemple.deity] || '🛕'}
                </span>
                <p className="font-cinzel text-xs uppercase tracking-widest theme-gold font-bold">
                  {selectedTemple.deity ? `${selectedTemple.deity} Temple` : 'Sacred Hindu Temple'}
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Fullscreen Expand Hint Badge */}
          {currentHero && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openLightboxForImage(currentHero)
              }}
              className="absolute top-3 left-3 p-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 transition-all flex items-center gap-1 text-[11px] font-sans px-2.5 z-10 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
            >
              <ExpandIcon />
              <span>Expand</span>
            </button>
          )}

          {/* Loading Shimmer */}
          {currentHero && !imageLoaded && (
            <div className="absolute inset-0 bg-current opacity-10 animate-pulse" />
          )}

          {/* Gradient Overlay for Title */}
          <div className={`absolute inset-0 pointer-events-none ${
            theme === 'dark'
              ? 'bg-gradient-to-t from-[#1A1A24] via-[#1A1A24]/60 to-transparent'
              : 'bg-gradient-to-t from-[#FFFDF9] via-[#FFFDF9]/60 to-transparent'
          }`} />

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="absolute top-3 right-3 p-2 rounded-full glass theme-title hover:text-saffron
                       transition-transform duration-200 hover:scale-110 active:scale-95 shadow-md z-10"
            aria-label="Close darshan panel"
          >
            <CloseIcon />
          </button>

          {/* Title & Location in Banner */}
          <div className="absolute bottom-2.5 left-4 right-4 pointer-events-none">
            <motion.h2
              key={selectedTemple.name}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-lg sm:text-xl font-bold font-cinzel leading-tight drop-shadow text-shimmer"
            >
              {selectedTemple.name}
            </motion.h2>
            <p className="text-[11px] font-sans theme-muted font-bold mt-0.5">
              📍 {selectedTemple.state || 'India'}
              {selectedTemple.era ? ` · ${selectedTemple.era}` : ''}
            </p>
          </div>
        </div>

        {/* ── Wikimedia Gallery Strip (horizontal thumbnails with lightbox trigger) ── */}
        {allGalleryImages.length > 1 && (
          <div className="px-4 py-2 border-b border-[var(--border-gold)] flex-shrink-0 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold tracking-wider theme-muted font-cinzel flex-shrink-0">
                Gallery:
              </span>
              {allGalleryImages.map((imgUrl, idx) => {
                const isActive = currentHero === imgUrl
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      playTempleChime()
                      setSelectedHeroImage(imgUrl)
                      openLightboxForImage(imgUrl)
                    }}
                    className={`relative w-12 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200
                      ${isActive
                        ? 'ring-2 ring-saffron scale-105 shadow-md shadow-saffron/25'
                        : 'opacity-70 hover:opacity-100 hover:scale-105 border border-[var(--border-gold)]'
                      }`}
                  >
                    <img src={imgUrl} alt={`Gallery view ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Tabs Header ── */}
        <div className="px-4 pt-3 pb-1 flex-shrink-0">
          <div className="flex gap-1 p-1 rounded-xl glass">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px]
                            font-bold font-sans transition-all duration-200
                  ${
                    activeTab === tab.id
                      ? 'bg-saffron/20 text-saffron border border-saffron/40 shadow-sm'
                      : 'theme-muted hover:theme-title border border-transparent'
                  }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-5 my-2 h-px bg-gradient-to-r from-transparent via-[var(--border-gold)] to-transparent" />

        {/* ── Scrollable Tab Content ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-3">
          <AnimatePresence mode="wait">
            {activeTab === 'history' && (
              <HistoryTab
                key="history"
                temple={selectedTemple}
                wikiData={wikiData}
                loading={wikiLoading}
                error={wikiError}
              />
            )}
            {activeTab === 'architecture' && (
              <ArchitectureTab
                key="architecture"
                temple={selectedTemple}
                userLocation={userLocation}
              />
            )}
            {activeTab === 'pilgrimage' && (
              <PilgrimageTab key="pilgrimage" temple={selectedTemple} />
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom CTA Google Maps / Directions ── */}
        <div className="p-3 border-t border-[var(--border-gold)] flex-shrink-0 space-y-1.5">
          <motion.a
            href={mapsDirectionsLink}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                       bg-gradient-to-r from-saffron via-amber-500 to-saffron-dark
                       text-slate-950 font-extrabold text-xs sm:text-sm font-sans tracking-wide
                       shadow-lg shadow-saffron/25 hover:shadow-saffron/40
                       transition-shadow duration-300"
          >
            <ExternalLinkIcon />
            {userLocation ? 'Get Driving Directions (Exact Temple)' : 'Directions to Temple Entrance'}
          </motion.a>

          <a
            href={mapsPlaceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-1 text-[11px] font-sans font-semibold theme-gold hover:text-saffron transition-colors"
          >
            <span>📍 Open Verified Place on Google Maps</span>
            <ExternalLinkIcon />
          </a>
        </div>
      </motion.aside>

      {/* ── Fullscreen Image Lightbox Modal ── */}
      <Lightbox
        isOpen={lightboxOpen}
        images={allGalleryImages}
        currentIndex={lightboxIndex}
        title={selectedTemple.name}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />
    </>
  )
}
