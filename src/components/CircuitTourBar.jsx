import React from 'react'
import { motion } from 'framer-motion'
import { playTempleChime } from '../audio/chimeSound'

export default function CircuitTourBar({
  activeCircuit,
  circuitTemples,
  currentTempleIndex,
  onSelectIndex,
  onExitTour,
}) {
  if (!activeCircuit || !circuitTemples || circuitTemples.length === 0) return null

  const currentTemple = circuitTemples[currentTempleIndex] || circuitTemples[0]
  const total = circuitTemples.length

  const handlePrev = () => {
    playTempleChime()
    const nextIdx = (currentTempleIndex - 1 + total) % total
    onSelectIndex(nextIdx)
  }

  const handleNext = () => {
    playTempleChime()
    const nextIdx = (currentTempleIndex + 1) % total
    onSelectIndex(nextIdx)
  }

  return (
    <motion.div
      initial={{ y: 80, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 80, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-[1001] max-w-[96vw] sm:max-w-xl w-full px-2"
    >
      <div className="glass-strong rounded-2xl p-2.5 sm:p-4 shadow-2xl border border-[var(--border-saffron)] flex flex-col gap-2 sm:gap-2.5">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-gold)] pb-1.5 sm:pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron" />
            </span>
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider sm:tracking-widest font-cinzel text-saffron truncate">
              {activeCircuit} Sacred Pilgrimage Tour
            </span>
          </div>

          <button
            onClick={onExitTour}
            className="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded-full glass theme-muted hover:text-red-400 hover:border-red-400/40 transition-all font-sans font-bold flex items-center gap-1 flex-shrink-0"
          >
            <span>✕</span>
            <span>Exit Tour</span>
          </button>
        </div>

        {/* Shrine Details & Steppers */}
        <div className="flex items-center justify-between gap-2">
          {/* Previous Shrine button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handlePrev}
            className="p-2 sm:px-3 sm:py-2 rounded-xl glass theme-title hover:border-saffron hover:text-saffron transition-colors flex items-center gap-1.5 text-xs font-sans font-bold flex-shrink-0"
            title="Previous Shrine"
          >
            <span>⏮️</span>
            <span className="hidden sm:inline">Prev</span>
          </motion.button>

          {/* Current Shrine Center Info */}
          <div className="flex-1 text-center min-w-0 px-2">
            <div className="text-[10px] font-sans font-semibold theme-gold uppercase tracking-wider">
              Shrine {currentTempleIndex + 1} of {total}
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold font-cinzel text-shimmer truncate">
              {currentTemple.name}
            </h3>
            <p className="text-[10px] theme-muted font-sans truncate">
              📍 {currentTemple.state || 'India'}
            </p>
          </div>

          {/* Next Shrine button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleNext}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-saffron to-amber-500 text-slate-950 shadow-md shadow-saffron/20 hover:scale-105 transition-all flex items-center gap-1.5 text-xs font-sans font-extrabold flex-shrink-0"
            title="Next Shrine"
          >
            <span className="hidden sm:inline">Next</span>
            <span>⏭️</span>
          </motion.button>
        </div>

        {/* Progress Step Dots */}
        <div className="flex items-center justify-center gap-1 pt-0.5 overflow-x-auto custom-scrollbar">
          {circuitTemples.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => {
                playTempleChime()
                onSelectIndex(idx)
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentTempleIndex
                  ? 'w-6 bg-saffron'
                  : 'w-1.5 bg-[var(--border-gold)] hover:bg-saffron/50'
              }`}
              title={`${idx + 1}. ${t.name}`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
