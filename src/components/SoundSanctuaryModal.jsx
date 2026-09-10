import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TanpuraSvgIcon,
  OmSymbolIcon,
  MandirBellIcon,
  ShankhIcon,
  BansuriIcon,
  SingingBowlIcon,
  CloseTourIcon,
} from './ThemedIcons'
import { SACRED_SOUNDSCAPES } from '../audio/divineAudioEngine'
import { playTempleChime } from '../audio/chimeSound'

const ICONS_MAP = {
  TanpuraSvgIcon: TanpuraSvgIcon,
  OmSymbolIcon: OmSymbolIcon,
  MandirBellIcon: MandirBellIcon,
  ShankhIcon: ShankhIcon,
  BansuriIcon: BansuriIcon,
  SingingBowlIcon: SingingBowlIcon,
}

export const CURATED_YOUTUBE_STREAMS = [
  {
    id: '5u0hELRkjUo',
    playlistId: 'PLb5pq8p1HZfKusVbadzl7yHbR4atCXHe-',
    type: 'playlist',
    title: 'Pt. Hariprasad Chaurasia · Krishna Flute',
    subtitle: 'Legendary Classical Bansuri Melodies (Des, Yaman, Ahir Lalit)',
    deity: 'Lord Krishna / Vishnu',
    icon: '🪈',
    badge: 'Popular Playlist',
  },
  {
    id: 'XduW5w-xl2E',
    playlistId: 'PL05AOT7YnmxYJ4sOd6z8_CNd07doqsaKd',
    type: 'playlist',
    title: 'Krishna Bansuri Ki Dhun & Meditation',
    subtitle: 'Soulful Vrindavan Bamboo Flute for Peace & Dhyana',
    deity: 'Lord Krishna',
    icon: '🪈',
    badge: 'Popular Playlist',
  },
  {
    id: 'n2Y97K_hRzY',
    playlistId: 'PLM3TSQaW_spNVcDLOx38tDkvctA2l4-aj',
    type: 'playlist',
    title: 'Maha Mrityunjaya & Shiva Mantras',
    subtitle: '108 Vedic Shiva Chants, Tandav Stotram & Bholenath Bhakti',
    deity: 'Lord Shiva',
    icon: '🔱',
    badge: 'Popular Playlist',
  },
  {
    id: 'WzQhA_U7h0c',
    type: 'video',
    title: 'Haridwar & Kashi Ganga Aarti',
    subtitle: 'Sacred Riverbank Evening Deep Daan & Vedic Aarti',
    deity: 'Maa Ganga / Tirtha',
    icon: '🪔',
    badge: 'Live Aarti',
  },
  {
    id: '3Qy-f0jC9y4',
    type: 'video',
    title: 'Gayatri Mantra 108 Times',
    subtitle: 'Cosmic Vedic Solar Resonance & Chants',
    deity: 'Surya / Gayatri',
    icon: '☀️',
    badge: 'Vedic Chants',
  },
  {
    id: 'bB-e6uS2iXU',
    playlistId: 'PLb5pq8p1HZfKMUiSqnjrJFw1_uIS4Rj12',
    type: 'playlist',
    title: 'Classical Sitar & Tanpura Ragas',
    subtitle: 'Deep Meditative Indian Classical Raga Jukebox',
    deity: 'Saraswati / Classical',
    icon: '🪕',
    badge: 'Popular Playlist',
  },
  {
    id: 'fL852q-w_6Y',
    type: 'video',
    title: 'Hare Krishna Maha Mantra',
    subtitle: 'Vrindavan Temple Kirtan, Harmonium & Mridanga',
    deity: 'Radha Krishna',
    icon: '🌺',
    badge: 'Temple Kirtan',
  },
]

export function parseYoutubeMedia(urlOrId) {
  if (!urlOrId) return null
  const str = urlOrId.trim()

  // 1. Check if user pasted a playlist URL or list= parameter
  const listMatch = str.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  if (listMatch) {
    const vMatch = str.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)
    return {
      type: 'playlist',
      playlistId: listMatch[1],
      videoId: vMatch ? vMatch[1] : null,
    }
  }

  // 2. Direct playlist ID (starts with PL, RD, UU, FL)
  if (/^(?:PL|RD|UU|FL)[a-zA-Z0-9_-]+$/.test(str)) {
    return {
      type: 'playlist',
      playlistId: str,
      videoId: null,
    }
  }

  // 3. 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return {
      type: 'video',
      videoId: str,
      playlistId: null,
    }
  }

  // 4. Standard YouTube video URL
  const videoMatch = str.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  )
  if (videoMatch) {
    return {
      type: 'video',
      videoId: videoMatch[1],
      playlistId: null,
    }
  }

  return null
}

export function extractYoutubeId(urlOrId) {
  const parsed = parseYoutubeMedia(urlOrId)
  return parsed?.videoId || parsed?.playlistId || null
}

export default function SoundSanctuaryModal({
  isOpen,
  onClose,
  soundSource = 'youtube',
  onSelectSoundSource,
  // YouTube Radio props
  youtubePlaying = false,
  currentYoutubeId = '5u0hELRkjUo',
  currentYoutubePlaylistId = 'PLb5pq8p1HZfKusVbadzl7yHbR4atCXHe-',
  onToggleYoutubePlay,
  onSelectYoutubeStream,
  onCustomYoutubeStream,
  // Synth props
  synthPlaying = false,
  currentSynthMode = 'tanpura',
  onToggleSynthPlay,
  onSelectSynthMode,
  // Shared props
  volume = 0.8,
  onVolumeChange,
  autoHarmonize = true,
  onToggleAutoHarmonize,
}) {
  const [activeTab, setActiveTab] = useState(soundSource)
  const [customInput, setCustomInput] = useState('')
  const [customError, setCustomError] = useState(null)

  if (!isOpen) return null

  const isCurrentTabPlaying = activeTab === 'youtube' ? youtubePlaying : synthPlaying

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    setCustomError(null)
    const media = parseYoutubeMedia(customInput)
    if (!media) {
      setCustomError('Please enter a valid YouTube video URL, playlist URL, or ID.')
      return
    }
    playTempleChime()
    onCustomYoutubeStream?.(
      media.videoId,
      media.playlistId,
      media.type === 'playlist' ? 'Custom YouTube Playlist' : 'Custom Devotional Stream'
    )
    setCustomInput('')
  }

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    onSelectSoundSource?.(tab)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative max-w-lg w-full glass-strong rounded-3xl p-4 sm:p-6 shadow-2xl border border-[var(--border-saffron)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle decorative radial glow */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-saffron/15 rounded-full blur-3xl pointer-events-none" />

          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-[var(--border-gold)] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-saffron/15 text-saffron">
                <OmSymbolIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold font-cinzel text-shimmer">
                  दिव्य नाद · Sacred Sound Sanctuary
                </h3>
                <p className="text-[10px] theme-muted font-sans">
                  Authentic Acoustic Streams, 24/7 Temple Aarti & Classical Chants
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full glass theme-muted hover:theme-title hover:border-saffron transition-colors"
              aria-label="Close Sound Sanctuary"
            >
              <CloseTourIcon />
            </button>
          </div>

          {/* ── Tab Switcher: YouTube Streams vs Procedural Synth ── */}
          <div className="grid grid-cols-2 gap-2 mb-3 bg-black/30 p-1 rounded-2xl border border-[var(--border-gold)]">
            <button
              onClick={() => handleTabSwitch('youtube')}
              className={`py-1.5 px-3 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'youtube'
                  ? 'bg-gradient-to-r from-saffron to-amber-500 text-slate-950 shadow-md shadow-saffron/20'
                  : 'theme-muted hover:theme-title'
              }`}
            >
              <span>📻 Devotional Streams</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 text-current font-mono">
                Real Audio
              </span>
            </button>

            <button
              onClick={() => handleTabSwitch('synth')}
              className={`py-1.5 px-3 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'synth'
                  ? 'bg-gradient-to-r from-saffron to-amber-500 text-slate-950 shadow-md shadow-saffron/20'
                  : 'theme-muted hover:theme-title'
              }`}
            >
              <span>🕉️ Vedic Audio Synth</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 text-current font-mono">
                Ambient Drone
              </span>
            </button>
          </div>

          {/* ── Main Master Control: Play/Pause + Visualizer + Volume ── */}
          <div className="p-3.5 rounded-2xl bg-black/25 border border-[var(--border-gold)] flex flex-col gap-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    playTempleChime()
                    if (activeTab === 'youtube') {
                      onToggleYoutubePlay?.()
                    } else {
                      onToggleSynthPlay?.()
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl font-sans font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                    isCurrentTabPlaying
                      ? 'bg-gradient-to-r from-saffron to-amber-500 text-slate-950 shadow-saffron/25'
                      : 'glass theme-title hover:border-saffron hover:text-saffron'
                  }`}
                >
                  <span>
                    {isCurrentTabPlaying ? '⏸️ Pause Sanctuary' : '▶️ Play Divine Sounds'}
                  </span>
                </button>

                {/* Animated Waveform Visualizer */}
                {isCurrentTabPlaying && (
                  <div className="flex items-end gap-[3px] h-4 px-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <motion.span
                        key={i}
                        className="w-[3px] bg-saffron rounded-full"
                        animate={{ height: ['4px', '16px', '6px', '14px', '4px'] }}
                        transition={{
                          duration: 0.8 + i * 0.15,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Master Volume Slider */}
              <div className="flex items-center gap-2 text-xs font-sans">
                <span className="theme-muted text-[11px]">Vol</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                  className="w-20 sm:w-24 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-saffron"
                />
                <span className="text-[10px] font-mono text-saffron font-bold w-7 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            {/* Auto-Harmonize Toggle Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-sans">
              <div className="flex flex-col">
                <span className="font-bold theme-title text-[11px] flex items-center gap-1">
                  <span>🕉️ Auto-Harmonize with Active Shrine</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-saffron/20 text-saffron font-semibold">
                    Smart Resonance
                  </span>
                </span>
                <span className="text-[10px] theme-muted">
                  Automatically tunes soundscape to active shrine’s deity (Shiva, Vishnu, Devi)
                </span>
              </div>

              <button
                onClick={onToggleAutoHarmonize}
                className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                  autoHarmonize ? 'bg-saffron' : 'bg-white/20'
                }`}
                title="Toggle Auto-Harmonize with active temple"
              >
                <motion.div
                  animate={{ x: autoHarmonize ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-4 h-4 rounded-full bg-slate-950 shadow-md"
                />
              </button>
            </div>
          </div>

          {/* ── Content Tab 1: Devotional YouTube Radio Streams ── */}
          {activeTab === 'youtube' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
                {CURATED_YOUTUBE_STREAMS.map((stream) => {
                  const isSelected =
                    (stream.playlistId && currentYoutubePlaylistId === stream.playlistId) ||
                    currentYoutubeId === stream.id
                  return (
                    <button
                      key={stream.id + (stream.playlistId || '')}
                      onClick={() => {
                        playTempleChime()
                        onSelectYoutubeStream?.(stream.id, stream.title, stream.playlistId)
                      }}
                      className={`p-2.5 rounded-2xl text-left transition-all border flex items-start gap-2.5 relative overflow-hidden ${
                        isSelected
                          ? 'bg-saffron/15 border-saffron shadow-lg shadow-saffron/10'
                          : 'glass border-[var(--border-gold)] hover:border-saffron/50 hover:bg-black/10'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-saffron text-slate-950' : 'bg-black/30 text-saffron'
                        }`}
                      >
                        {stream.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold font-cinzel truncate ${
                              isSelected ? 'text-saffron font-extrabold' : 'theme-title'
                            }`}
                          >
                            {stream.title}
                          </span>
                          {isSelected && youtubePlaying ? (
                            <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-saffron text-slate-950 font-bold uppercase tracking-wider font-sans flex-shrink-0">
                              Playing
                            </span>
                          ) : stream.badge ? (
                            <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-500 font-bold uppercase tracking-wider font-sans flex-shrink-0">
                              {stream.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] theme-muted font-sans leading-tight mt-0.5 line-clamp-2">
                          {stream.subtitle}
                        </p>
                        <span className="text-[9px] text-amber-400/80 font-sans font-semibold mt-1 inline-block">
                          ✦ {stream.deity}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Custom YouTube Stream Input */}
              <form
                onSubmit={handleCustomSubmit}
                className="pt-2 border-t border-[var(--border-gold)] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="font-semibold theme-title">Custom YouTube Stream or Playlist:</span>
                  <span className="text-[10px] theme-muted">Paste any video or playlist URL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/playlist?list=... or watch?v=..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/20 dark:bg-white/10 border border-[var(--border-gold)] text-xs font-sans placeholder:theme-muted focus:outline-none focus:ring-1 focus:ring-saffron text-[var(--text-title)]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-saffron text-slate-950 font-sans text-xs font-bold shadow hover:bg-amber-400 transition-all flex-shrink-0"
                  >
                    ▶ Stream
                  </button>
                </div>
                {customError && (
                  <p className="text-[10px] text-rose-500 font-sans">{customError}</p>
                )}
              </form>
            </div>
          )}

          {/* ── Content Tab 2: Procedural Web Audio Synth ── */}
          {activeTab === 'synth' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar p-0.5 mb-2">
              {SACRED_SOUNDSCAPES.map((sound) => {
                const IconComponent = ICONS_MAP[sound.icon] || TanpuraSvgIcon
                const isSelected = currentSynthMode === sound.id

                return (
                  <button
                    key={sound.id}
                    onClick={() => {
                      playTempleChime()
                      onSelectSynthMode?.(sound.id)
                    }}
                    className={`p-2.5 rounded-2xl text-left transition-all border flex items-start gap-2.5 relative overflow-hidden ${
                      isSelected
                        ? 'bg-saffron/15 border-saffron shadow-lg shadow-saffron/10'
                        : 'glass border-[var(--border-gold)] hover:border-saffron/50 hover:bg-black/10'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-saffron text-slate-950'
                          : 'bg-black/30 theme-gold'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold font-cinzel truncate ${
                            isSelected ? 'text-saffron font-extrabold' : 'theme-title'
                          }`}
                        >
                          {sound.shortName}
                        </span>
                        {isSelected && synthPlaying && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-saffron text-slate-950 font-bold uppercase tracking-wider font-sans flex-shrink-0">
                            Playing
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] theme-muted font-sans leading-tight mt-0.5 line-clamp-2">
                        {sound.description}
                      </p>
                      <span className="text-[9px] text-amber-400/80 font-sans font-semibold mt-1 inline-block">
                        ✦ {sound.deityMatch}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Footer note */}
          <p className="text-[10px] theme-muted font-sans italic text-center pt-2 border-t border-[var(--border-gold)]">
            {activeTab === 'youtube'
              ? 'Streamed live via YouTube Devotional Radio with full background playback ✦'
              : 'Synthesized live via procedural Web Audio API with zero streaming delay ✦'}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
