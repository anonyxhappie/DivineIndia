import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { YOUTUBE_BHAKTI_TRACKS, parseYoutubeInput } from '../audio/youtubeBhaktiPlaylists'
import {
  AudioPrevIcon,
  AudioNextIcon,
  AudioPlayIcon,
  AudioPauseIcon,
  AudioVolumeIcon,
  AudioMuteIcon,
  AudioPlaylistIcon,
  AutoHarmonizeIcon,
} from './ThemedIcons'

/**
 * BottomAudioPlayer — Compact, docked divine player streaming authentic YouTube Bhakti tracks & playlists in the background.
 *
 * Features:
 * - Real YouTube devotional chants (Om 108 Times, Krishna Flute, Hanuman Chalisa, Gayatri Mantra, Ram Bhajan)
 * - Headless background streaming with full local controls (Play/Pause, Next, Prev, Volume, Auto-Harmonize)
 * - Custom YouTube URL / Playlist input drawer for listening to any bhajan
 * - Live animated jumping equalizer waves and buffering states
 * - Auto-Harmonize deity matching
 */
export default function BottomAudioPlayer({
  isPlaying,
  isBuffering = false,
  currentTrack,
  tracks = YOUTUBE_BHAKTI_TRACKS,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSelectTrack,
  onAddCustomTrack,
  volume = 0.8,
  onVolumeChange,
  autoHarmonize = true,
  onToggleAutoHarmonize,
  isTourActive = false,
}) {
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [inputError, setInputError] = useState('')
  const prevVolumeRef = useRef(volume)
  const playerContainerRef = useRef(null)

  const activeTrack = currentTrack || tracks[0] || YOUTUBE_BHAKTI_TRACKS[0]

  // Close popups when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (playerContainerRef.current && !playerContainerRef.current.contains(e.target)) {
        setPlaylistOpen(false)
        setVolumeOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false)
      onVolumeChange(prevVolumeRef.current || 0.8)
    } else {
      prevVolumeRef.current = volume
      setIsMuted(true)
      onVolumeChange(0)
    }
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (!customInput.trim()) return

    const parsed = parseYoutubeInput(customInput)
    if (!parsed) {
      setInputError('Please enter a valid YouTube video or playlist link / ID')
      return
    }

    setInputError('')
    if (onAddCustomTrack) {
      onAddCustomTrack(customInput.trim())
    }
    setCustomInput('')
    setPlaylistOpen(false)
  }

  return (
    <div
      ref={playerContainerRef}
      className={`fixed left-1/2 -translate-x-1/2 z-[998] transition-all duration-300 pointer-events-auto w-[calc(100%-1.5rem)] max-w-xl sm:max-w-2xl ${
        isTourActive
          ? 'bottom-[126px] sm:bottom-[138px]'
          : 'bottom-3 sm:bottom-4'
      }`}
    >
      {/* ── Playlist Popover Drawer (YouTube Bhakti Tracks & Custom Input) ── */}
      <AnimatePresence>
        {playlistOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full mb-2 left-0 right-0 max-h-[380px] overflow-y-auto custom-scrollbar glass-strong rounded-2xl border border-[var(--border-gold)] p-3 shadow-2xl space-y-2 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-1 py-1 border-b border-[var(--border-gold)]/60">
              <div className="flex items-center gap-2">
                <span className="text-base">🪔</span>
                <span className="text-xs font-bold font-cinzel tracking-wider uppercase theme-title">
                  Devotional Bhajans & Chants
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/15 text-red-500 dark:text-red-400 font-sans font-bold flex items-center gap-1 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  YouTube Audio
                </span>
              </div>
            </div>

            {/* Custom YouTube Link Input */}
            <form onSubmit={handleCustomSubmit} className="pt-1">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-gold)]/70 focus-within:border-saffron transition-all">
                <span className="pl-2 text-xs opacity-60">🔗</span>
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value)
                    if (inputError) setInputError('')
                  }}
                  placeholder="Paste any YouTube video or playlist link..."
                  className="w-full bg-transparent text-xs py-1 px-1.5 outline-none font-sans theme-title placeholder:text-zinc-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-saffron text-slate-950 font-bold font-sans text-xs hover:brightness-110 active:scale-95 transition-all flex-shrink-0 cursor-pointer shadow-sm"
                >
                  Play
                </button>
              </div>
              {inputError && (
                <p className="text-[10px] text-red-400 px-2 pt-1 font-sans font-semibold">
                  {inputError}
                </p>
              )}
            </form>

            {/* Track List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {tracks.map((track) => {
                const isActive = track.id === activeTrack.id
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectTrack(track)
                      setPlaylistOpen(false)
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'bg-saffron/20 border border-saffron/60 text-saffron shadow-sm'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent theme-body'
                    }`}
                  >
                    <span className="text-lg w-8 h-8 rounded-lg bg-saffron/10 border border-saffron/20 flex items-center justify-center flex-shrink-0">
                      {track.icon || 'ॐ'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold font-cinzel truncate leading-tight">
                          {track.name}
                        </p>
                        {track.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-sans font-bold flex-shrink-0">
                            {track.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] opacity-75 font-sans truncate mt-0.5">
                        {track.artist || track.deity}
                      </p>
                    </div>
                    {isActive && (
                      <span className="flex items-end gap-0.5 h-3 flex-shrink-0">
                        <span className="w-0.5 h-3 bg-saffron rounded-full animate-bounce" />
                        <span className="w-0.5 h-2 bg-saffron rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-0.5 h-3 bg-saffron rounded-full animate-bounce [animation-delay:0.3s]" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Compact Bottom Player Bar ── */}
      <motion.div
        layout
        className="glass-strong rounded-2xl border border-[var(--border-gold)] p-2 sm:px-3.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-3.5 shadow-2xl backdrop-blur-xl"
      >
        {/* Left: Track Info & Icon */}
        <div
          onClick={() => setPlaylistOpen(!playlistOpen)}
          className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 cursor-pointer group"
          title="Click to browse all devotional tracks & playlists"
        >
          {/* Animated Icon Avatar */}
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-saffron/20 to-amber-900/30 border border-saffron/40 flex items-center justify-center text-lg sm:text-xl flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <span>{activeTrack.icon || 'ॐ'}</span>
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>

          {/* Title & Badge */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs sm:text-sm font-bold font-cinzel theme-title truncate group-hover:text-saffron transition-colors leading-tight">
                {activeTrack.name}
              </p>
              {isPlaying && (
                <span className="hidden md:flex items-end gap-0.5 h-2.5 flex-shrink-0">
                  <span className="w-0.5 h-2.5 bg-saffron rounded-full animate-bounce" />
                  <span className="w-0.5 h-1.5 bg-saffron rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-0.5 h-2.5 bg-saffron rounded-full animate-bounce [animation-delay:0.4s]" />
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] theme-muted font-sans truncate flex items-center gap-1.5">
              <span>{activeTrack.artist || activeTrack.deity}</span>
              {isBuffering && (
                <span className="text-amber-500 font-semibold animate-pulse">· Loading...</span>
              )}
            </p>
          </div>
        </div>

        {/* Center / Controls: Prev, Play/Pause, Next */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Prev Track */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPrevTrack}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 theme-muted hover:text-saffron transition-colors cursor-pointer"
            title="Previous Track"
            aria-label="Previous Track"
          >
            <AudioPrevIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </motion.button>

          {/* Play / Pause Main Button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onTogglePlay}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-amber-500 via-saffron to-orange-500 text-white flex items-center justify-center shadow-lg shadow-saffron/30 hover:shadow-saffron/50 border border-amber-200/40 cursor-pointer transition-all"
            title={isPlaying ? 'Pause Bhajan' : 'Play Bhajan'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <AudioPauseIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white filter drop-shadow-sm" />
            ) : (
              <AudioPlayIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white translate-x-0.5 filter drop-shadow-sm" />
            )}
          </motion.button>

          {/* Next Track */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onNextTrack}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 theme-muted hover:text-saffron transition-colors cursor-pointer"
            title="Next Track"
            aria-label="Next Track"
          >
            <AudioNextIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </motion.button>
        </div>

        {/* Right: Auto-Harmonize, Volume, Playlist Menu */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 relative">
          {/* Auto-Harmonize Toggle */}
          <button
            onClick={onToggleAutoHarmonize}
            className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
              autoHarmonize
                ? 'bg-saffron/20 text-saffron border border-saffron/50 shadow-sm'
                : 'theme-muted hover:theme-title hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
            }`}
            title={
              autoHarmonize
                ? 'Smart Resonance ON (Auto-tunes bhajan to active temple deity)'
                : 'Smart Resonance OFF'
            }
          >
            <AutoHarmonizeIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Volume Control / Mute */}
          <div className="relative">
            <button
              onClick={() => setVolumeOpen(!volumeOpen)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 theme-muted hover:theme-title transition-colors cursor-pointer"
              title="Volume"
            >
              {isMuted || volume === 0 ? (
                <AudioMuteIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-red-400" />
              ) : (
                <AudioVolumeIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </button>

            {/* Mini Volume Popover */}
            <AnimatePresence>
              {volumeOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  className="absolute bottom-full right-0 mb-2 p-2 glass-strong rounded-xl border border-[var(--border-gold)] shadow-xl flex items-center gap-2 backdrop-blur-xl z-10"
                >
                  <button
                    onClick={handleToggleMute}
                    className="text-xs theme-muted hover:theme-title cursor-pointer"
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setIsMuted(false)
                      onVolumeChange(parseFloat(e.target.value))
                    }}
                    className="w-20 accent-saffron h-1.5 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono theme-title w-6">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Playlist Drawer Button */}
          <button
            onClick={() => setPlaylistOpen(!playlistOpen)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl transition-all flex items-center gap-1 text-xs cursor-pointer ${
              playlistOpen
                ? 'bg-saffron text-slate-950 font-bold shadow-md shadow-saffron/30'
                : 'hover:bg-black/5 dark:hover:bg-white/10 theme-muted hover:theme-title border border-[var(--border-gold)]'
            }`}
            title="Browse Bhajans & Playlists"
          >
            <AudioPlaylistIcon className="w-4 h-4" />
            <span className="hidden sm:inline font-cinzel font-bold text-[11px]">
              Bhajans
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
