/**
 * Procedural Tanpura Drone — Web Audio API
 *
 * Synthesizes a meditative tanpura-style ambient drone using
 * harmonically-related oscillators tuned to Sa (C3), Pa (G3), and
 * upper Sa (C4), each with subtle detuning and slow amplitude LFOs
 * that create the shimmering, alive quality of a real tanpura.
 *
 * All nodes are created lazily on first start() to comply with
 * browser autoplay policies (AudioContext must be created on user gesture).
 */

// Tanpura string frequencies (Hz) — based on C3 ≈ 130.81 Hz
const STRINGS = [
  { freq: 130.81, label: 'Sa (low)',  gain: 0.10, detune: -3  },
  { freq: 130.81, label: 'Sa (low2)', gain: 0.07, detune: +4  },
  { freq: 196.00, label: 'Pa',        gain: 0.08, detune: -2  },
  { freq: 261.63, label: "Sa'",       gain: 0.09, detune: +3  },
  { freq: 261.63, label: "Sa' (2)",   gain: 0.06, detune: -5  },
]

// Subtle harmonic overtones to add shimmer (tanpura jawari effect)
const OVERTONES = [
  { ratio: 2,   gain: 0.025 },
  { ratio: 3,   gain: 0.015 },
  { ratio: 4,   gain: 0.010 },
  { ratio: 5,   gain: 0.006 },
]

export class TanpuraEngine {
  constructor() {
    this._ctx = null
    this._masterGain = null
    this._oscillators = []
    this._lfos = []
    this._running = false
  }

  /** True if the drone is currently playing. */
  get isPlaying() {
    return this._running
  }

  /** Lazily create and wire the audio graph. */
  _init() {
    if (this._ctx) return

    this._ctx = new (window.AudioContext || window.webkitAudioContext)()

    // Master gain — overall volume
    this._masterGain = this._ctx.createGain()
    this._masterGain.gain.value = 0 // start silent, fade in on start()
    this._masterGain.connect(this._ctx.destination)

    // Gentle reverb via convolver-free approach: feedback delay
    const delay = this._ctx.createDelay(1.0)
    delay.delayTime.value = 0.12
    const feedback = this._ctx.createGain()
    feedback.gain.value = 0.25
    const reverbFilter = this._ctx.createBiquadFilter()
    reverbFilter.type = 'lowpass'
    reverbFilter.frequency.value = 2000

    this._masterGain.connect(delay)
    delay.connect(reverbFilter)
    reverbFilter.connect(feedback)
    feedback.connect(delay)
    delay.connect(this._ctx.destination)

    // Create oscillators for each string
    STRINGS.forEach((str) => {
      // Fundamental
      const osc = this._ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = str.freq
      osc.detune.value = str.detune

      const oscGain = this._ctx.createGain()
      oscGain.gain.value = str.gain

      osc.connect(oscGain)
      oscGain.connect(this._masterGain)

      // Slow amplitude LFO for shimmer (0.05–0.2 Hz)
      const lfo = this._ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.08 + Math.random() * 0.15

      const lfoGain = this._ctx.createGain()
      lfoGain.gain.value = str.gain * 0.4 // modulation depth

      lfo.connect(lfoGain)
      lfoGain.connect(oscGain.gain)

      this._oscillators.push(osc)
      this._lfos.push(lfo)

      // Harmonic overtones (jawari buzz)
      OVERTONES.forEach((ot) => {
        const hOsc = this._ctx.createOscillator()
        hOsc.type = 'sine'
        hOsc.frequency.value = str.freq * ot.ratio
        hOsc.detune.value = str.detune + (Math.random() * 6 - 3)

        const hGain = this._ctx.createGain()
        hGain.gain.value = ot.gain

        hOsc.connect(hGain)
        hGain.connect(this._masterGain)

        this._oscillators.push(hOsc)
      })
    })

    // Start all oscillators (they output silence until masterGain opens)
    this._oscillators.forEach((o) => o.start())
    this._lfos.forEach((l) => l.start())
  }

  /** Start / resume the drone with a gentle fade-in. */
  start() {
    this._init()

    if (this._ctx.state === 'suspended') {
      this._ctx.resume()
    }

    // Smooth fade in over 2 seconds
    const now = this._ctx.currentTime
    this._masterGain.gain.cancelScheduledValues(now)
    this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now)
    this._masterGain.gain.linearRampToValueAtTime(1.0, now + 2.0)

    this._running = true
  }

  /** Pause the drone with a gentle fade-out. */
  stop() {
    if (!this._ctx || !this._running) return

    const now = this._ctx.currentTime
    this._masterGain.gain.cancelScheduledValues(now)
    this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now)
    this._masterGain.gain.linearRampToValueAtTime(0.0, now + 1.5)

    this._running = false
    // Don't close the context — user can toggle back on
  }

  /** Fully tear down. */
  dispose() {
    this.stop()
    if (this._ctx) {
      setTimeout(() => {
        this._ctx.close().catch(() => {})
        this._ctx = null
        this._masterGain = null
        this._oscillators = []
        this._lfos = []
      }, 1600) // wait for fade-out
    }
  }
}
