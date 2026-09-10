import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playTempleChime, playDarshanBlessingSound } from '../audio/chimeSound'
import { haversineDistance, calculateBearing, getCardinalDirection } from '../utils/circuitOrder'
import {
  PrevStopIcon,
  NextStopIcon,
  AutoPlayIcon,
  PauseIcon,
  PranamDarshanIcon,
  CheckDoneIcon,
  TanpuraSvgIcon,
  CloseTourIcon,
} from './ThemedIcons'

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

function TourThumbnail({ temple }) {
  const [failed, setFailed] = useState(false)
  const deityEmoji = DEITY_EMOJIS[temple?.deity] || '🛕'

  useEffect(() => {
    setFailed(false)
  }, [temple?.id, temple?.image_url])

  if (!temple?.image_url || failed) {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-[var(--border-gold)] flex items-center justify-center text-lg sm:text-xl bg-saffron/10 flex-shrink-0 font-cinzel text-saffron shadow-sm select-none">
        {deityEmoji}
      </div>
    )
  }

  return (
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-[var(--border-gold)] flex-shrink-0 shadow-md bg-black/40 relative">
      <img
        src={temple.image_url}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export default function CircuitTourBar({
  activeCircuit,
  circuitTemples,
  currentTempleIndex,
  visitedIds,
  onSelectIndex,
  onTakeDarshan,
  onExitTour,
  soundPlaying,
  currentSoundName = 'Tanpura',
  onOpenSoundSanctuary,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [countdown, setCountdown] = useState(6)
  const [darshanBurst, setDarshanBurst] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const timerRef = useRef(null)

  const total = circuitTemples?.length || 0
  const currentTemple = circuitTemples?.[currentTempleIndex] || circuitTemples?.[0]
  const nextTemple = total > 1 ? circuitTemples[(currentTempleIndex + 1) % total] : null

  // Calculate distance & direction to next sacred stop
  const nextLegInfo = useMemo(() => {
    if (!currentTemple || !nextTemple || total <= 1) return null
    if (
      currentTemple.lat == null ||
      currentTemple.lng == null ||
      nextTemple.lat == null ||
      nextTemple.lng == null
    ) {
      return null
    }
    const dist = Math.round(
      haversineDistance(currentTemple.lat, currentTemple.lng, nextTemple.lat, nextTemple.lng)
    )
    const bearing = calculateBearing(
      currentTemple.lat,
      currentTemple.lng,
      nextTemple.lat,
      nextTemple.lng
    )
    const dir = getCardinalDirection(bearing)
    return { dist, dir, name: nextTemple.name }
  }, [currentTemple, nextTemple, total])

  // Count how many circuit shrines have received darshan
  const visitedCircuitCount = useMemo(() => {
    if (!circuitTemples || !visitedIds) return 0
    return circuitTemples.filter((t) => visitedIds.has(t.id)).length
  }, [circuitTemples, visitedIds])

  const progressPercent = total > 0 ? Math.round((visitedCircuitCount / total) * 100) : 0
  const isCurrentVisited = currentTemple ? visitedIds.has(currentTemple.id) : false

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept typing in search inputs
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        togglePlayPause()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTempleIndex, total, isPlaying])

  // Auto-Yatra Fly-through Timer
  useEffect(() => {
    if (!isPlaying || total <= 1) {
      if (timerRef.current) clearInterval(timerRef.current)
      setCountdown(6)
      return
    }

    setCountdown(6)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Advance to next shrine
          const nextIdx = (currentTempleIndex + 1) % total
          onSelectIndex(nextIdx)
          return 6
        }
        return prev - 1
      })
    }, 1000)

    timerRef.current = interval
    return () => clearInterval(interval)
  }, [isPlaying, currentTempleIndex, total, onSelectIndex])

  const togglePlayPause = () => {
    playTempleChime()
    setIsPlaying((prev) => !prev)
  }

  const handlePrev = () => {
    setIsPlaying(false)
    const nextIdx = (currentTempleIndex - 1 + total) % total
    onSelectIndex(nextIdx)
  }

  const handleNext = () => {
    setIsPlaying(false)
    const nextIdx = (currentTempleIndex + 1) % total
    onSelectIndex(nextIdx)
  }

  const handleDarshanClick = () => {
    playDarshanBlessingSound()
    setDarshanBurst(true)
    setTimeout(() => setDarshanBurst(false), 1800)

    if (currentTemple) {
      onTakeDarshan?.(currentTemple)
      setToastMessage(`🙏 Blessed Darshan at ${currentTemple.name}!`)
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  if (!activeCircuit || !circuitTemples || total === 0 || !currentTemple) return null

  return (
    <motion.div
      initial={{ y: 90, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 90, opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-[1001] max-w-[96vw] sm:max-w-2xl w-full px-2 pointer-events-auto"
    >
      {/* Mini Toast Notification for Darshan Blessings */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 glass-strong rounded-full px-4 py-1.5 text-xs font-bold font-sans text-amber-300 border border-saffron/40 shadow-xl flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="text-saffron">✦</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-strong rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-2xl border border-[var(--border-saffron)] flex flex-col gap-2 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle decorative glowing background flare */}
        <div className="absolute top-0 right-1/4 w-48 h-20 bg-saffron/10 rounded-full blur-2xl pointer-events-none" />

        {/* ── Top Header Row: Circuit Title + Yatra Progress Gauge + Controls ── */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-gold)] pb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron" />
            </span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider font-cinzel text-saffron truncate">
                {activeCircuit} Parikrama
              </span>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-saffron/15 text-amber-300 border border-saffron/30 font-semibold hidden sm:inline-flex items-center gap-1">
                <span>{visitedCircuitCount}/{total} Sanctified</span>
                <span className="opacity-75">({progressPercent}%)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Sound Sanctuary Shortcut */}
            {onOpenSoundSanctuary && (
              <button
                onClick={onOpenSoundSanctuary}
                className={`p-1.5 sm:px-2.5 py-1 rounded-xl text-[10px] font-sans font-bold flex items-center gap-1.5 transition-all border ${
                  soundPlaying
                    ? 'bg-saffron/20 text-saffron border-saffron/50 shadow-sm'
                    : 'glass theme-muted hover:theme-title hover:border-saffron/40'
                }`}
                title="Sacred Vedic Sound Sanctuary & Regional Resonance"
              >
                <TanpuraSvgIcon className="w-3.5 h-3.5 text-saffron flex-shrink-0" />
                <span className="hidden sm:inline">{currentSoundName}</span>
                {soundPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-saffron animate-pulse" />
                )}
              </button>
            )}

            {/* Exit Tour */}
            <button
              onClick={onExitTour}
              className="p-1.5 sm:px-2.5 py-1 rounded-xl glass theme-muted hover:text-red-400 hover:border-red-400/40 transition-all font-sans font-bold flex items-center gap-1 text-[10px] sm:text-[11px]"
              title="Exit Tour"
              aria-label="Exit Tour"
            >
              <CloseTourIcon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Exit</span>
            </button>
          </div>
        </div>

        {/* ── Main Shrine Showcase & Navigation Hub ── */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Previous Shrine Button with Themed Icon */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={handlePrev}
            className="p-2 sm:px-3 sm:py-2.5 rounded-xl glass theme-title hover:border-saffron hover:text-saffron transition-all flex items-center gap-1.5 text-xs font-sans font-bold flex-shrink-0 shadow-sm"
            title="Previous Shrine (Left Arrow)"
          >
            <PrevStopIcon className="w-4 h-4 text-saffron" />
            <span className="hidden md:inline">Prev</span>
          </motion.button>

          {/* Shrine Details Spotlight */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 px-1">
            {/* Small circular / square photo thumbnail */}
            <TourThumbnail temple={currentTemple} />

            {/* Title, Subtitle, and Distance to Next */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-md bg-saffron/20 text-saffron uppercase tracking-wider">
                  Stop {currentTempleIndex + 1} of {total}
                </span>
                {isCurrentVisited && (
                  <span className="text-[9px] sm:text-[10px] font-sans font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckDoneIcon className="w-3 h-3 text-emerald-400" />
                    <span>Darshan Taken</span>
                  </span>
                )}
              </div>

              <h3 className="text-xs sm:text-sm font-extrabold font-cinzel text-shimmer truncate leading-tight mt-0.5">
                {currentTemple.name}
              </h3>

              <div className="flex items-center gap-2 text-[10px] theme-muted font-sans truncate">
                <span>📍 {currentTemple.state || 'India'}</span>
                {nextLegInfo && (
                  <span className="text-amber-400/90 font-medium truncate hidden xs:inline">
                    ➔ {nextLegInfo.dist} km {nextLegInfo.dir} to {nextLegInfo.name.split(' ')[0]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Hub: Auto-Yatra & Take Darshan */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Auto-Yatra Fly-Through Play/Pause Button with Themed Icons */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={togglePlayPause}
              className={`p-2 sm:px-3 sm:py-2.5 rounded-xl glass flex items-center gap-1.5 text-xs font-sans font-bold transition-all relative ${
                isPlaying
                  ? 'border-saffron text-saffron bg-saffron/15 shadow-sm shadow-saffron/20'
                  : 'theme-title hover:border-saffron hover:text-saffron'
              }`}
              title={isPlaying ? 'Pause Auto-Yatra (Space)' : 'Start Auto-Yatra Fly-Through (Space)'}
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="w-3.5 h-3.5 text-saffron" />
                  <span className="hidden sm:inline text-[11px] font-mono font-bold text-saffron">
                    {countdown}s
                  </span>
                </>
              ) : (
                <>
                  <AutoPlayIcon className="w-3.5 h-3.5 text-saffron" />
                  <span className="hidden sm:inline text-[11px]">Auto</span>
                </>
              )}
            </motion.button>

            {/* "Take Darshan" Primary Action Button with Themed Namaste Icon & Particle Burst */}
            <div className="relative">
              {darshanBurst && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none flex gap-1 z-30 select-none">
                  {['🌸', '✨', '🪔', '🌺'].map((emoji, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: 0, opacity: 1, scale: 0.8 }}
                      animate={{ y: -32 - i * 4, opacity: 0, scale: 1.3 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="text-base"
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDarshanClick}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-sans font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                  isCurrentVisited
                    ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-emerald-600/25 border border-emerald-400/40'
                    : 'bg-gradient-to-r from-saffron to-amber-500 text-slate-950 shadow-saffron/25 border border-amber-300/40'
                }`}
                title="Sanctify this shrine in your Yatra Passport"
              >
                {isCurrentVisited ? (
                  <>
                    <CheckDoneIcon className="w-3.5 h-3.5 text-white" />
                    <span className="whitespace-nowrap">Darshan Done</span>
                  </>
                ) : (
                  <>
                    <PranamDarshanIcon className="w-4 h-4 text-slate-950" />
                    <span className="whitespace-nowrap">Take Darshan</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Next Shrine Button with Themed Icon */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleNext}
              className="p-2 sm:px-3 sm:py-2.5 rounded-xl glass theme-title hover:border-saffron hover:text-saffron transition-all flex items-center gap-1.5 text-xs font-sans font-bold flex-shrink-0 shadow-sm"
              title="Next Shrine (Right Arrow)"
            >
              <span className="hidden md:inline">Next</span>
              <NextStopIcon className="w-4 h-4 text-saffron" />
            </motion.button>
          </div>
        </div>

        {/* ── Stop-by-Stop Stepper Ribbon (Scrollable) with Themed Checkmarks ── */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto custom-scrollbar px-0.5">
          {circuitTemples.map((t, idx) => {
            const isActive = idx === currentTempleIndex
            const isVisited = visitedIds.has(t.id)

            return (
              <button
                key={t.id}
                onClick={() => {
                  setIsPlaying(false)
                  onSelectIndex(idx)
                }}
                className={`flex-shrink-0 flex items-center justify-center rounded-lg text-[10px] font-sans font-bold transition-all duration-200 ${
                  isActive
                    ? 'w-7 h-6 bg-saffron text-slate-950 ring-2 ring-saffron/60 scale-105 shadow-md'
                    : isVisited
                    ? 'w-6 h-5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'w-6 h-5 glass theme-muted hover:theme-title hover:border-saffron'
                }`}
                title={`${idx + 1}. ${t.name} (${isVisited ? 'Visited ✓' : 'Upcoming'})`}
              >
                {isVisited && !isActive ? (
                  <CheckDoneIcon className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  idx + 1
                )}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
