/**
 * Procedural Temple Bell & Brass Chime Audio Engine — Web Audio API
 *
 * Synthesizes:
 * 1. Dedicated authentic Indian Temple Bell (Mandir Ghanta) with clapper strike transient,
 *    sacred bronze partials (hum note, prime beating, tierce, quint, nominal), and 3s singing decay
 * 2. Delicate sacred brass chime (navigation & selection)
 * 3. Deep resonant bronze Temple Bell / Ghanta with long singing decay (Darshan blessing)
 * 4. Cascading celebratory temple bells (Yatra completion)
 */

let audioCtx = null
let bellAudioBuffer = null
let isPreloadingBell = false

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Preload the authentic recorded temple bell audio into memory
 * for instantaneous 0ms-latency polyphonic playback on any click.
 */
export async function preloadTempleBell() {
  if (bellAudioBuffer || isPreloadingBell) return
  isPreloadingBell = true
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const baseUrl = import.meta.env?.BASE_URL || '/'
    const bellUrl = `${baseUrl}temple_bell.mp3`.replace('//', '/')
    const res = await fetch(bellUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const arrayBuf = await res.arrayBuffer()
    bellAudioBuffer = await ctx.decodeAudioData(arrayBuf)
  } catch {
    // HTML5 Audio or procedural synthesis will act as fallback
  } finally {
    isPreloadingBell = false
  }
}

// Auto-trigger preload in browser environment
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    preloadTempleBell()
  } else {
    window.addEventListener('load', () => preloadTempleBell(), { once: true })
  }
}

/**
 * Procedural synthesis fallback if audio file cannot be loaded
 */
function playProceduralTempleBell(ctx, templeOrDeity) {
  if (!ctx) return
  const now = ctx.currentTime
  const fundamental = 617.4 // D#5 / Eb5 from real temple bell FFT analysis

  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(0.0001, now)
  masterGain.gain.linearRampToValueAtTime(0.35, now + 0.003)
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(6500, now)
  filter.frequency.exponentialRampToValueAtTime(1800, now + 4.5)

  masterGain.connect(filter)
  filter.connect(ctx.destination)

  // Real bell modes from FFT analysis: 617.4Hz, 1159.4Hz, 1249.5Hz, 1809.1Hz, 2731Hz
  const partials = [
    { ratio: 0.5, gain: 0.35, decay: 5.5, detune: 0 },
    { ratio: 1.0, gain: 0.85, decay: 5.2, detune: 0.8 },
    { ratio: 1.0, gain: 0.65, decay: 5.0, detune: -0.8 },
    { ratio: 1.878, gain: 0.55, decay: 4.2, detune: 0 },
    { ratio: 2.024, gain: 0.45, decay: 3.8, detune: 0 },
    { ratio: 2.931, gain: 0.35, decay: 3.2, detune: 1.2 },
    { ratio: 2.937, gain: 0.30, decay: 3.0, detune: -1.2 },
    { ratio: 4.423, gain: 0.20, decay: 2.0, detune: 0 },
  ]

  partials.forEach(({ ratio, gain, decay, detune }) => {
    const osc = ctx.createOscillator()
    const pGain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(fundamental * ratio + detune, now)
    pGain.gain.setValueAtTime(gain, now)
    pGain.gain.exponentialRampToValueAtTime(0.0001, now + decay)

    osc.connect(pGain)
    pGain.connect(masterGain)
    osc.start(now)
    osc.stop(now + decay + 0.1)

    osc.onended = () => {
      try {
        osc.disconnect()
        pGain.disconnect()
      } catch {}
    }
  })

  // Strike transient
  const clapper = ctx.createOscillator()
  const clapperGain = ctx.createGain()
  clapper.type = 'triangle'
  clapper.frequency.setValueAtTime(2400, now)
  clapper.frequency.exponentialRampToValueAtTime(320, now + 0.05)
  clapperGain.gain.setValueAtTime(0.3, now)
  clapperGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055)
  clapper.connect(clapperGain)
  clapperGain.connect(masterGain)
  clapper.start(now)
  clapper.stop(now + 0.06)

  setTimeout(() => {
    try {
      masterGain.disconnect()
      filter.disconnect()
    } catch {}
  }, 5800)
}

/**
 * Sacred Indian Temple Bell / Mandir Ghanta
 * Authentic recorded bronze temple bell with natural clapper strike
 * and 6.8s singing decay cloned from the village temple recording:
 * https://www.youtube.com/shorts/t7FvpZPTskE
 */
export function playTempleBellSound(templeOrDeity = null) {
  try {
    const ctx = getAudioContext()
    const baseUrl = import.meta.env?.BASE_URL || '/'
    const bellUrl = `${baseUrl}temple_bell.mp3`.replace('//', '/')

    // 1. Primary path: Web Audio API with pre-decoded AudioBuffer (0ms latency, polyphonic)
    if (ctx && bellAudioBuffer) {
      const source = ctx.createBufferSource()
      source.buffer = bellAudioBuffer

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.95, ctx.currentTime)

      // Subtle natural deity harmonization
      let rate = 1.0
      const deityStr = (typeof templeOrDeity === 'string' ? templeOrDeity : templeOrDeity?.deity || '').toLowerCase()
      if (deityStr.includes('shiva') || deityStr.includes('mahadev') || deityStr.includes('rudra')) {
        rate = 0.94 // deeper, heavier bronze resonance
      } else if (deityStr.includes('devi') || deityStr.includes('durga') || deityStr.includes('shakti') || deityStr.includes('kali')) {
        rate = 1.05 // brighter, radiant
      }

      source.playbackRate.setValueAtTime(rate, ctx.currentTime)
      source.connect(masterGain)
      masterGain.connect(ctx.destination)

      source.start(0)

      source.onended = () => {
        try {
          source.disconnect()
          masterGain.disconnect()
        } catch {}
      }
      return
    }

    // 2. Secondary path: HTML5 Audio instance
    if (typeof Audio !== 'undefined') {
      const audio = new Audio(bellUrl)
      audio.volume = 0.95
      audio.play().catch(() => {
        if (ctx) playProceduralTempleBell(ctx, templeOrDeity)
      })

      preloadTempleBell()
      return
    }

    // 3. Fallback to procedural synthesis
    if (ctx) {
      playProceduralTempleBell(ctx, templeOrDeity)
    }
  } catch {
    // Graceful error handling
  }
}

/**
 * Crystalline Brass Bell Chime (for card clicks and step navigation)
 */
export function playTempleChime() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.18, now)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4)
    masterGain.connect(ctx.destination)

    const baseFreq = 880 // A5 crystalline chime
    const partials = [
      { ratio: 1.0, gain: 0.7 },
      { ratio: 2.76, gain: 0.35 },
      { ratio: 5.4, gain: 0.18 },
      { ratio: 8.93, gain: 0.08 },
    ]

    partials.forEach(({ ratio, gain }) => {
      const osc = ctx.createOscillator()
      const pGain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(baseFreq * ratio, now)

      pGain.gain.setValueAtTime(gain, now)
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 / ratio)

      osc.connect(pGain)
      pGain.connect(masterGain)

      osc.start(now)
      osc.stop(now + 1.4)
    })
  } catch {
    // Gracefully ignore if audio context is blocked
  }
}

/**
 * Resonant Sacred Temple Bell / Mandir Ghanta (for Taking Darshan)
 * Deep fundamental with acoustic bronze strike and 2.5s singing decay
 */
export function playDarshanBlessingSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.24, now)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8)
    masterGain.connect(ctx.destination)

    // Authentic Indian temple bell strike partials (Bronze casting)
    const fundamental = 330 // E4 warm bell tone
    const partials = [
      { ratio: 0.5, gain: 0.4, decay: 2.5 },  // Sub-harmonic undertone
      { ratio: 1.0, gain: 0.8, decay: 2.8 },  // Fundamental
      { ratio: 1.2, gain: 0.45, decay: 2.0 }, // Minor third chime
      { ratio: 2.0, gain: 0.5, decay: 1.8 },  // Octave
      { ratio: 3.01, gain: 0.3, decay: 1.4 }, // Tierce
      { ratio: 4.25, gain: 0.18, decay: 1.0 }, // Quint
      { ratio: 5.88, gain: 0.1, decay: 0.7 }, // Shimmer
    ]

    partials.forEach(({ ratio, gain, decay }) => {
      const osc = ctx.createOscillator()
      const pGain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(fundamental * ratio, now)

      pGain.gain.setValueAtTime(gain, now)
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + decay)

      osc.connect(pGain)
      pGain.connect(masterGain)

      osc.start(now)
      osc.stop(now + decay + 0.1)
    })
  } catch {
    // Gracefully ignore if audio context is blocked
  }
}

/**
 * Cascading celebratory temple bells (for Yatra 100% Completion)
 */
export function playCelebrationChimes() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Frequencies representing an auspicious ascending Bilawal / Shankara raga scale
    // Sa, Ga, Pa, Dha, Sa' (C, E, G, A, C)
    const notes = [261.63, 329.63, 392.0, 440.0, 523.25, 659.25, 783.99]

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.14
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.18, startTime)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.0)
      masterGain.connect(ctx.destination)

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      osc.connect(masterGain)
      osc.start(startTime)
      osc.stop(startTime + 2.0)
    })
  } catch {
    // Gracefully ignore if audio context is blocked
  }
}
