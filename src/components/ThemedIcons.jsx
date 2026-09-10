import React from 'react'

/**
 * Handcrafted, theme-matching SVG icons styled with Divine India's
 * sacred saffron, warm gold, bronze, and emerald color palette.
 * Replaces generic OS emojis with elegant vectors.
 */

export const PrevStopIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 18 5 12 11 6" />
    <polyline points="19 18 13 12 19 6" />
  </svg>
)

export const NextStopIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="13 18 19 12 13 6" />
    <polyline points="5 18 11 12 5 6" />
  </svg>
)

export const AutoPlayIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
)

export const PauseIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1.5" />
    <rect x="14" y="4" width="4" height="16" rx="1.5" />
  </svg>
)

// Folded prayer hands (Anjali Mudra / Pranam / Namaste)
export const PranamDarshanIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v13" />
    <path d="M8.5 6.5C7 8.5 7 11.5 8 14l4 5" />
    <path d="M15.5 6.5c1.5 2 1.5 5 .5 7.5l-4 5" />
    <path d="M10 20h4" />
    <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5L12 6l-1.5-2.5A1.5 1.5 0 0 1 12 2z" fill="currentColor" opacity="0.8" />
  </svg>
)

// Verified checkmark inside sacred diamond ring
export const CheckDoneIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// Traditional Indian Tanpura String Instrument
export const TanpuraSvgIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {/* Resonant Gourd Body */}
    <circle cx="12" cy="17" r="5" fill="currentColor" fillOpacity="0.2" />
    {/* Neck / Dandi */}
    <line x1="12" y1="3" x2="12" y2="12" strokeWidth="2" />
    {/* Tuning Pegs */}
    <line x1="9" y1="4" x2="15" y2="4" />
    <line x1="9.5" y1="6.5" x2="14.5" y2="6.5" />
    {/* Strings */}
    <line x1="11" y1="5" x2="11" y2="17" opacity="0.6" />
    <line x1="13" y1="5" x2="13" y2="17" opacity="0.6" />
    {/* Bridge / Tabli */}
    <rect x="10" y="16" width="4" height="2" rx="0.5" fill="currentColor" />
  </svg>
)

// Sacred Om Symbol (ॐ)
export const OmSymbolIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="currentColor">
    <path d="M23.8 6.2c-1.2 0-2.3.4-3.2 1.1-.3-.6-.8-1-1.4-1.3-.7-.3-1.5-.4-2.3-.4-3.5 0-6.1 2.3-6.1 5.3 0 1.9.9 3.5 2.4 4.4-1.8 1.1-2.9 2.9-2.9 5 0 3.6 3.3 6.3 7.8 6.3 3.6 0 6.5-1.7 7.7-4.5l-2.4-1.3c-.8 2-2.8 3.2-5.3 3.2-3 0-5.1-1.6-5.1-3.7 0-2.3 2.4-3.9 6-3.9h1.7v-2.6h-1.7c-2.4 0-4.1-1.3-4.1-3 0-1.7 1.6-2.9 3.8-2.9 1.4 0 2.6.5 3.3 1.3l2.2-1.7c-1.3-1.1-3.2-1.7-4.5-1.7zm1.8 4.6c1.8 0 3.3-1.5 3.3-3.3s-1.5-3.3-3.3-3.3-3.3 1.5-3.3 3.3c0 1.8 1.5 3.3 3.3 3.3zm2.8 4.2c-1.8-1.4-4-2.1-6.4-2.1v2.6c1.7 0 3.3.5 4.6 1.5l1.8-2z" />
  </svg>
)

// Hanging Brass Mandir Ghanta / Temple Bell
export const MandirBellIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v3" />
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" fill="currentColor" fillOpacity="0.15" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </svg>
)

// Sacred Shankh (Conch Shell)
export const ShankhIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18c0-3.5 2.5-7 6-9 4-2.2 8-1 9 1s-1 7-5 10c-3 2.2-6 2-8 0a2.5 2.5 0 0 1-2-2z" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 9c-2 2-3 5-3 8" />
    <path d="M15 12c-1 2-1.5 4-1.5 6" />
    <circle cx="18" cy="8" r="1.5" fill="currentColor" />
  </svg>
)

// Divine Krishna Flute / Bansuri
export const BansuriIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="19" x2="21" y2="5" strokeWidth="2.2" />
    <circle cx="9" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="11.7" r="1" fill="currentColor" />
    <circle cx="15" cy="9.4" r="1" fill="currentColor" />
    <circle cx="17.5" cy="7.5" r="1" fill="currentColor" />
    {/* Peacock feather curve accent */}
    <path d="M19 4c2-2 4-1 4 1-1 3-3 4-5 4" strokeWidth="1.4" opacity="0.8" />
  </svg>
)

// Himalayan Singing Bowl
export const SingingBowlIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10c0 6 4 10 9 10s9-4 9-10H3z" fill="currentColor" fillOpacity="0.2" />
    <ellipse cx="12" cy="10" rx="9" ry="2" />
    <line x1="17" y1="4" x2="21" y2="10" strokeWidth="2.2" />
  </svg>
)

// "दैवयोग · Divine Calling" Serendipity Icon (Radiating Cosmic Star & Lotus Spark)
export const DivineCallingIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" fillOpacity="0.25" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)

// Close Icon for tour / modals
export const CloseTourIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// Sacred Diya Flame Icon
export const DiyaIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14c0 4 3.5 7 8 7s8-3 8-7H4z" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 3c-1.5 2.5-3 5-3 7 0 1.7 1.3 3 3 3s3-1.3 3-3c0-2-1.5-4.5-3-7z" fill="currentColor" />
  </svg>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dedicated Sacred Audio Player Icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AudioPrevIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="19 20 9 12 19 4 19 20" />
    <rect x="5" y="4" width="2.5" height="16" rx="1" />
  </svg>
)

export const AudioNextIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 4 15 12 5 20 5 4" />
    <rect x="16.5" y="4" width="2.5" height="16" rx="1" />
  </svg>
)

export const AudioPlayIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
)

export const AudioPauseIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1.5" />
    <rect x="14" y="4" width="4" height="16" rx="1.5" />
  </svg>
)

export const AudioVolumeIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.3" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
)

export const AudioMuteIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.3" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
)

export const AudioPlaylistIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="16" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="11" y2="18" />
    <polygon points="18 13 22 15.5 18 18 18 13" fill="currentColor" />
  </svg>
)

export const AutoHarmonizeIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
    <path d="M19 17L20.2 19.8L23 21L20.2 22.2L19 25L17.8 22.2L15 21L17.8 19.8L19 17Z" opacity="0.6" transform="scale(0.8) translate(3, 1)" />
  </svg>
)
