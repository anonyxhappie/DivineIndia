/**
 * Divine Audio Engine — Procedural Indian Classical & Vedic Soundscapes
 *
 * Synthesizes 6 rich, authentic Indian temple soundscapes using Web Audio API:
 * 1. 'tanpura'   - Sacred 5-string Sa-Pa Tanpura drone with jawari shimmer
 * 2. 'om'        - 136.1 Hz Cosmic Om / Vedic vocal formant resonance
 * 3. 'bells'     - Sanctum Mandir Ghanta & Brass Temple Chimes
 * 4. 'shankh'    - Sacred Conch Shell (Panchajanya) & Aarti resonance
 * 5. 'flute'     - Divine Krishna Bansuri meditation (Raag Bhupali / Yaman)
 * 6. 'himalaya'  - Tibetan & Himalayan Bronze Singing Bowls
 *
 * Includes Auto-Harmonize Mode that shifts soundscape dynamically
 * based on the active temple's deity (Shiva, Vishnu, Devi) and region!
 *
 * 100% procedural — requires 0 external MP3 downloads and works completely offline.
 */

export const SACRED_SOUNDSCAPES = [
  {
    id: 'om',
    name: 'ॐ वैदिक ओंकार · Cosmic Om',
    shortName: 'Cosmic Om',
    deity: 'Shiva / Universal',
    emoji: 'ॐ',
    icon: 'OmSymbolIcon',
    description: '136.1 Hz Cosmic Om with resonant Vedic A-U-M vocal chanting formants',
    deityMatch: 'Shiva / Mahadeva / Universal',
  },
  {
    id: 'flute',
    name: 'दिव्य बांसुरी · Krishna Flute',
    shortName: 'Krishna Flute',
    deity: 'Krishna / Vishnu',
    emoji: '🪈',
    icon: 'BansuriIcon',
    description: 'Pt. Hariprasad style classical bansuri ragas over meditative tanpura',
    deityMatch: 'Krishna / Vishnu',
  },
  {
    id: 'mrityunjaya',
    name: 'महामृत्युंजय · Maha Mrityunjaya',
    shortName: 'Mrityunjaya',
    deity: 'Lord Shiva',
    emoji: '🔱',
    icon: 'OmSymbolIcon',
    description: 'Sacred Shiva Rudra chant with acoustic damru beats & sanctum temple bells',
    deityMatch: 'Lord Shiva / Mahadev',
  },
  {
    id: 'gayatri',
    name: 'गायत्री मन्त्र · Gayatri Mantra',
    shortName: 'Gayatri Mantra',
    deity: 'Surya / Gayatri',
    emoji: '☀️',
    icon: 'OmSymbolIcon',
    description: 'Solar 432 Hz golden Vedic chant vibration with rhythmic chanting cadence',
    deityMatch: 'Surya / Vedic Solar',
  },
  {
    id: 'ram',
    name: 'श्री राम भजन · Shri Ram Stuti',
    shortName: 'Ram Bhajan',
    deity: 'Lord Rama',
    emoji: '🏹',
    icon: 'TanpuraSvgIcon',
    description: 'Devotional Ram Dhun in Raag Khamaj with sitar, harmonium & manjira',
    deityMatch: 'Rama / Ayodhya',
  },
  {
    id: 'tanpura',
    name: 'तानपूरा नाद · Classical Tanpura',
    shortName: 'Tanpura Drone',
    deity: 'Universal / Classical',
    emoji: '🪕',
    icon: 'TanpuraSvgIcon',
    description: 'Classical Sa-Pa meditative tanpura drone with jawari shimmer',
    deityMatch: 'Universal / Classical',
  },
  {
    id: 'bells',
    name: 'मन्दिर आरती · Sanctum Bells',
    shortName: 'Sanctum Bells',
    deity: 'Ganesha / Murugan',
    emoji: '🪔',
    icon: 'MandirBellIcon',
    description: 'Periodic resonant acoustic brass temple bells and bronze gongs',
    deityMatch: 'Ganesha / Murugan / Sanctum',
  },
  {
    id: 'shankh',
    name: 'देवी स्तोत्र · Devi Shankh & Aarti',
    shortName: 'Devi Aarti',
    deity: 'Devi / Shakti',
    emoji: '🌺',
    icon: 'ShankhIcon',
    description: 'Deep conch shell vibration layered with evening aarti chimes',
    deityMatch: 'Devi / Shakti / Durga',
  },
  {
    id: 'himalaya',
    name: 'हिमालय ध्यान · Singing Bowls',
    shortName: 'Singing Bowls',
    deity: 'Himalayan / Dhyana',
    emoji: '🏔️',
    icon: 'SingingBowlIcon',
    description: 'Deep Himalayan bronze meditation bowls with 432 Hz harmonics',
    deityMatch: 'Himalayan / Dhyana',
  },
  {
    id: 'kirtan',
    name: 'आनन्द कीर्तन · Divine Kirtan',
    shortName: 'Anand Kirtan',
    deity: 'Bhakti / Kirtan',
    emoji: '🥁',
    icon: 'TanpuraSvgIcon',
    description: 'Uplifting devotional bhajan rhythm with mridanga, harmonium & kartal',
    deityMatch: 'Bhakti / Kirtan',
  },
]

export class DivineAudioEngine {
  constructor() {
    this._ctx = null
    this._masterGain = null
    this._volumeGain = null
    this._currentMode = 'om'
    this._running = false
    this._volume = 0.8
    this._autoHarmonize = false

    // Active synthesis nodes
    this._activeNodes = []
    this._intervals = []
  }

  get isPlaying() {
    return this._running
  }

  get currentMode() {
    return this._currentMode
  }

  get volume() {
    return this._volume
  }

  get autoHarmonize() {
    return this._autoHarmonize
  }

  nextMode() {
    const currentIndex = SACRED_SOUNDSCAPES.findIndex((s) => s.id === this._currentMode)
    const nextIndex = (currentIndex + 1) % SACRED_SOUNDSCAPES.length
    const nextMode = SACRED_SOUNDSCAPES[nextIndex].id
    this.switchMode(nextMode)
    return nextMode
  }

  prevMode() {
    const currentIndex = SACRED_SOUNDSCAPES.findIndex((s) => s.id === this._currentMode)
    const prevIndex = (currentIndex - 1 + SACRED_SOUNDSCAPES.length) % SACRED_SOUNDSCAPES.length
    const prevMode = SACRED_SOUNDSCAPES[prevIndex].id
    this.switchMode(prevMode)
    return prevMode
  }

  _initContext() {
    if (this._ctx) return
    this._ctx = new (window.AudioContext || window.webkitAudioContext)()

    // Volume gain node
    this._volumeGain = this._ctx.createGain()
    this._volumeGain.gain.value = this._volume

    // Master fade gain node
    this._masterGain = this._ctx.createGain()
    this._masterGain.gain.value = 0 // starts silent, fades in
    this._masterGain.connect(this._volumeGain)
    this._volumeGain.connect(this._ctx.destination)
  }

  setVolume(val) {
    this._volume = Math.max(0, Math.min(1, val))
    if (this._volumeGain && this._ctx) {
      this._volumeGain.gain.cancelScheduledValues(this._ctx.currentTime)
      this._volumeGain.gain.linearRampToValueAtTime(this._volume, this._ctx.currentTime + 0.1)
    }
  }

  setAutoHarmonize(enabled) {
    this._autoHarmonize = Boolean(enabled)
  }

  /**
   * Automatically adapts soundscape to match deity / region of a temple
   */
  harmonizeForTemple(temple) {
    if (!this._autoHarmonize || !this._running || !temple) return

    const deity = (temple.deity || '').toLowerCase()
    const state = (temple.state || '').toLowerCase()
    let targetMode = 'om'

    if (deity.includes('shiva') || deity.includes('mahadev') || deity.includes('rudra')) {
      targetMode = 'mrityunjaya'
    } else if (deity.includes('krishna')) {
      targetMode = 'flute'
    } else if (deity.includes('rama') || deity.includes('ram')) {
      targetMode = 'ram'
    } else if (
      deity.includes('vishnu') ||
      deity.includes('narayana') ||
      deity.includes('perumal') ||
      deity.includes('venkateswara')
    ) {
      targetMode = 'flute'
    } else if (
      deity.includes('devi') ||
      deity.includes('shakti') ||
      deity.includes('durga') ||
      deity.includes('kali') ||
      deity.includes('amman') ||
      deity.includes('lakshmi')
    ) {
      targetMode = 'shankh'
    } else if (deity.includes('surya') || deity.includes('sun')) {
      targetMode = 'gayatri'
    } else if (deity.includes('ganesh') || deity.includes('murugan') || deity.includes('kartikeya')) {
      targetMode = 'bells'
    } else if (
      state.includes('uttarakhand') ||
      state.includes('himachal') ||
      state.includes('kashmir') ||
      state.includes('ladakh')
    ) {
      targetMode = 'himalaya'
    } else if (
      state.includes('tamil nadu') ||
      state.includes('kerala') ||
      state.includes('karnataka') ||
      state.includes('andhra')
    ) {
      targetMode = 'bells'
    }

    if (targetMode !== this._currentMode) {
      this.switchMode(targetMode)
    }
  }

  /**
   * Start or resume playback
   */
  start(mode = null) {
    this._initContext()

    if (this._ctx.state === 'suspended') {
      this._ctx.resume()
    }

    if (mode) {
      this._currentMode = mode
    }

    this._stopSynthesis()
    this._buildModeSynthesis(this._currentMode)

    // Smooth fade in
    const now = this._ctx.currentTime
    this._masterGain.gain.cancelScheduledValues(now)
    this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now)
    this._masterGain.gain.linearRampToValueAtTime(1.0, now + 1.8)

    this._running = true
  }

  /**
   * Pause playback with smooth fade-out
   */
  stop() {
    if (!this._ctx || !this._running) return

    const now = this._ctx.currentTime
    this._masterGain.gain.cancelScheduledValues(now)
    this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now)
    this._masterGain.gain.linearRampToValueAtTime(0.0, now + 1.2)

    this._running = false
    setTimeout(() => {
      if (!this._running) {
        this._stopSynthesis()
      }
    }, 1400)
  }

  /**
   * Cross-fade to another sound mode
   */
  switchMode(mode) {
    if (mode === this._currentMode && this._running) return
    this._currentMode = mode

    if (!this._running) {
      this.start(mode)
      return
    }

    // Cross-fade
    const now = this._ctx.currentTime
    this._masterGain.gain.cancelScheduledValues(now)
    this._masterGain.gain.linearRampToValueAtTime(0.08, now + 0.8)

    setTimeout(() => {
      if (this._running) {
        this._stopSynthesis()
        this._buildModeSynthesis(mode)
        const crossNow = this._ctx.currentTime
        this._masterGain.gain.linearRampToValueAtTime(1.0, crossNow + 1.2)
      }
    }, 850)
  }

  _stopSynthesis() {
    this._intervals.forEach((i) => clearInterval(i))
    this._intervals = []

    this._activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop()
        if (node.disconnect) node.disconnect()
      } catch {}
    })
    this._activeNodes = []
  }

  _buildModeSynthesis(mode) {
    switch (mode) {
      case 'om':
        this._buildCosmicOm()
        break
      case 'flute':
        this._buildDivineFlute()
        break
      case 'mrityunjaya':
        this._buildMahaMrityunjaya()
        break
      case 'gayatri':
        this._buildGayatriMantra()
        break
      case 'ram':
        this._buildRamBhajan()
        break
      case 'tanpura':
        this._buildTanpura()
        break
      case 'bells':
        this._buildMandirBells()
        break
      case 'shankh':
        this._buildShankhAarti()
        break
      case 'himalaya':
        this._buildHimalayanBowls()
        break
      case 'kirtan':
        this._buildDivineKirtan()
        break
      default:
        this._buildCosmicOm()
        break
    }
  }

  // 1. Classical Tanpura (Sa-Pa Drone)
  _buildTanpura() {
    const strings = [
      { freq: 130.81, gain: 0.1, detune: -3 }, // Sa low
      { freq: 130.81, gain: 0.08, detune: +4 },
      { freq: 196.0, gain: 0.09, detune: -2 }, // Pa
      { freq: 261.63, gain: 0.09, detune: +3 }, // Sa'
      { freq: 261.63, gain: 0.06, detune: -5 },
    ]

    strings.forEach((str) => {
      const osc = this._ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = str.freq
      osc.detune.value = str.detune

      const oscGain = this._ctx.createGain()
      oscGain.gain.value = str.gain

      // LFO for organic shimmer
      const lfo = this._ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.08 + Math.random() * 0.14

      const lfoGain = this._ctx.createGain()
      lfoGain.gain.value = str.gain * 0.35
      lfo.connect(lfoGain)
      lfoGain.connect(oscGain.gain)

      osc.connect(oscGain)
      oscGain.connect(this._masterGain)

      osc.start()
      lfo.start()
      this._activeNodes.push(osc, lfo, oscGain, lfoGain)

      // Jawari buzzing harmonics
      ;[2, 3, 4, 5].forEach((mult, idx) => {
        const hOsc = this._ctx.createOscillator()
        hOsc.type = 'sine'
        hOsc.frequency.value = str.freq * mult
        hOsc.detune.value = str.detune + (idx * 2 - 1)

        const hGain = this._ctx.createGain()
        hGain.gain.value = (0.02 / mult) * 0.7

        hOsc.connect(hGain)
        hGain.connect(this._masterGain)
        hOsc.start()
        this._activeNodes.push(hOsc, hGain)
      })
    })
  }

  // 2. 136.1 Hz Cosmic Om / Sadja with Vocal Formants
  _buildCosmicOm() {
    const omFreq = 136.1 // Cosmic Ohm / Sadja fundamental

    const fundamental = this._ctx.createOscillator()
    fundamental.type = 'sawtooth'
    fundamental.frequency.value = omFreq

    // Resonant vocal formant bandpass filters for authentic chanting timbre (A-U-M)
    const formants = [
      { freq: 320, Q: 6.0, gain: 0.22 }, // F1 throat vowel
      { freq: 850, Q: 5.0, gain: 0.18 }, // F2 chest vowel
      { freq: 2400, Q: 4.0, gain: 0.08 }, // F3 nasal resonance
    ]

    formants.forEach((f) => {
      const bq = this._ctx.createBiquadFilter()
      bq.type = 'bandpass'
      bq.frequency.value = f.freq
      bq.Q.value = f.Q

      const fGain = this._ctx.createGain()
      fGain.gain.value = f.gain

      fundamental.connect(bq)
      bq.connect(fGain)
      fGain.connect(this._masterGain)

      this._activeNodes.push(bq, fGain)
    })

    // Sub-harmonic octave (68 Hz) for deep meditative presence
    const subOsc = this._ctx.createOscillator()
    subOsc.type = 'sine'
    subOsc.frequency.value = omFreq / 2

    const subGain = this._ctx.createGain()
    subGain.gain.value = 0.25
    subOsc.connect(subGain)
    subGain.connect(this._masterGain)

    // Breathing LFO
    const breathLfo = this._ctx.createOscillator()
    breathLfo.type = 'sine'
    breathLfo.frequency.value = 0.1 // 10 second meditative breath cycle

    const breathGain = this._ctx.createGain()
    breathGain.gain.value = 0.08
    breathLfo.connect(breathGain)
    breathGain.connect(subGain.gain)

    fundamental.start()
    subOsc.start()
    breathLfo.start()
    this._activeNodes.push(fundamental, subOsc, subGain, breathLfo, breathGain)
  }

  // 3. Sanctum Mandir Bells & Ghanta
  _buildMandirBells() {
    // Warm background ambient drone
    const drone = this._ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 220
    const droneGain = this._ctx.createGain()
    droneGain.gain.value = 0.06
    drone.connect(droneGain)
    droneGain.connect(this._masterGain)
    drone.start()
    this._activeNodes.push(drone, droneGain)

    // Periodic randomized authentic brass bell strikes
    const triggerBell = () => {
      if (!this._running || !this._ctx) return
      const now = this._ctx.currentTime
      const baseNotes = [440, 523.25, 659.25, 880]
      const freq = baseNotes[Math.floor(Math.random() * baseNotes.length)]

      const masterBell = this._ctx.createGain()
      masterBell.gain.setValueAtTime(0.12, now)
      masterBell.gain.exponentialRampToValueAtTime(0.0001, now + 3.0)
      masterBell.connect(this._masterGain)

      ;[1.0, 2.76, 5.4, 8.9].forEach((ratio, idx) => {
        const osc = this._ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq * ratio, now)

        const pGain = this._ctx.createGain()
        pGain.gain.setValueAtTime(0.5 / (idx + 1), now)
        pGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8 / ratio)

        osc.connect(pGain)
        pGain.connect(masterBell)
        osc.start(now)
        osc.stop(now + 3.1)
      })
    }

    // Strike bell every 3.5 to 5.5 seconds
    triggerBell()
    const interval = setInterval(() => {
      if (Math.random() > 0.15) triggerBell()
    }, 3800)
    this._intervals.push(interval)
  }

  // 4. Sacred Shankh (Conch) & Aarti Resonance
  _buildShankhAarti() {
    const shankhFundamental = 110 // Deep resonant brass conch

    // Conch drone with rich odd harmonics
    ;[1, 3, 5, 7].forEach((harmonic, i) => {
      const osc = this._ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = shankhFundamental * harmonic

      const gain = this._ctx.createGain()
      gain.gain.value = 0.14 / (i + 1)

      // Breath waver
      const lfo = this._ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.2 + i * 0.05
      const lfoG = this._ctx.createGain()
      lfoG.gain.value = gain.gain.value * 0.4
      lfo.connect(lfoG)
      lfoG.connect(gain.gain)

      osc.connect(gain)
      gain.connect(this._masterGain)

      osc.start()
      lfo.start()
      this._activeNodes.push(osc, gain, lfo, lfoG)
    })

    // Aarti rhythm chimes
    const triggerChime = () => {
      if (!this._running || !this._ctx) return
      const now = this._ctx.currentTime
      const bell = this._ctx.createOscillator()
      bell.type = 'sine'
      bell.frequency.setValueAtTime(1760, now)

      const bGain = this._ctx.createGain()
      bGain.gain.setValueAtTime(0.08, now)
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)

      bell.connect(bGain)
      bGain.connect(this._masterGain)
      bell.start(now)
      bell.stop(now + 1.3)
    }

    const interval = setInterval(triggerChime, 2200)
    this._intervals.push(interval)
  }

  // 5. Divine Krishna Bansuri Flute (Raag Yaman / Bhupali Notes)
  _buildDivineFlute() {
    // Warm background tanpura bed (C3 & G3)
    ;[130.81, 196.0].forEach((f) => {
      const osc = this._ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      const g = this._ctx.createGain()
      g.gain.value = 0.06
      osc.connect(g)
      g.connect(this._masterGain)
      osc.start()
      this._activeNodes.push(osc, g)
    })

    // Flute melody notes in pentatonic Raag Bhupali: Sa (261.63), Re (293.66), Ga (329.63), Pa (392.00), Dha (440.00), Sa' (523.25)
    const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63]
    let noteIdx = 0

    const playFluteNote = () => {
      if (!this._running || !this._ctx) return
      const now = this._ctx.currentTime
      const freq = notes[noteIdx % notes.length]
      noteIdx++

      const osc = this._ctx.createOscillator()
      osc.type = 'triangle' // Pure, breathy flute timbre
      osc.frequency.setValueAtTime(freq, now)

      // Subtle vibrato
      const vibrato = this._ctx.createOscillator()
      vibrato.type = 'sine'
      vibrato.frequency.value = 5.0
      const vibGain = this._ctx.createGain()
      vibGain.gain.value = 2.5
      vibrato.connect(vibGain)
      vibGain.connect(osc.frequency)

      // Flute envelope (soft breath attack and gentle release)
      const noteGain = this._ctx.createGain()
      noteGain.gain.setValueAtTime(0.0001, now)
      noteGain.gain.linearRampToValueAtTime(0.12, now + 0.4)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2)

      // Warm lowpass filter to emulate bamboo pipe resonance
      const filter = this._ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1400

      osc.connect(filter)
      filter.connect(noteGain)
      noteGain.connect(this._masterGain)

      osc.start(now)
      vibrato.start(now)
      osc.stop(now + 3.4)
      vibrato.stop(now + 3.4)
    }

    playFluteNote()
    const interval = setInterval(playFluteNote, 3200)
    this._intervals.push(interval)
  }

  // 6. Himalayan Singing Bowls (432 Hz Binaural Relaxation)
  _buildHimalayanBowls() {
    const bowlFreqs = [
      { f: 216, gain: 0.15, pan: -0.4 },
      { f: 432, gain: 0.18, pan: 0.0 },
      { f: 436, gain: 0.16, pan: 0.4 }, // 4 Hz binaural relaxation beat
      { f: 648, gain: 0.08, pan: -0.2 },
    ]

    bowlFreqs.forEach((b) => {
      const osc = this._ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = b.f

      const gain = this._ctx.createGain()
      gain.gain.value = b.gain

      // Slow amplitude pulsing LFO (singing bowl rim rotation)
      const lfo = this._ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.07 + Math.random() * 0.05
      const lfoGain = this._ctx.createGain()
      lfoGain.gain.value = b.gain * 0.4
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)

      // Stereo panner
      if (this._ctx.createStereoPanner) {
        const panner = this._ctx.createStereoPanner()
        panner.pan.value = b.pan
        osc.connect(gain)
        gain.connect(panner)
        panner.connect(this._masterGain)
        this._activeNodes.push(panner)
      } else {
        osc.connect(gain)
        gain.connect(this._masterGain)
      }

      osc.start()
      lfo.start()
      this._activeNodes.push(osc, gain, lfo, lfoGain)
    })
  }

  // 7. Maha Mrityunjaya Mantra (Lord Shiva Rudra Resonance & Damru Rhythm)
  _buildMahaMrityunjaya() {
    // Fundamental Shiva drone (C# / 138.2 Hz)
    const drone = this._ctx.createOscillator()
    drone.type = 'sawtooth'
    drone.frequency.value = 138.2

    const lowpass = this._ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 420

    const droneGain = this._ctx.createGain()
    droneGain.gain.value = 0.12

    drone.connect(lowpass)
    lowpass.connect(droneGain)
    droneGain.connect(this._masterGain)
    drone.start()
    this._activeNodes.push(drone, lowpass, droneGain)

    // Resonant Rudra vocal formants chanting Om Tryambakam
    const formants = [
      { freq: 280, Q: 5.0, gain: 0.18 },
      { freq: 720, Q: 4.5, gain: 0.15 },
      { freq: 2100, Q: 3.5, gain: 0.08 },
    ]
    formants.forEach((f) => {
      const bq = this._ctx.createBiquadFilter()
      bq.type = 'bandpass'
      bq.frequency.value = f.freq
      bq.Q.value = f.Q

      const fGain = this._ctx.createGain()
      fGain.gain.value = f.gain

      drone.connect(bq)
      bq.connect(fGain)
      fGain.connect(this._masterGain)
      this._activeNodes.push(bq, fGain)
    })

    // Acoustic Shiva Damru Rhythm (Double-tap percussion every 2.4s)
    const triggerDamru = () => {
      if (!this._running || !this._ctx) return
      const now = this._ctx.currentTime
      ;[0, 0.18].forEach((offset) => {
        const hitTime = now + offset
        const osc = this._ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(160, hitTime)
        osc.frequency.exponentialRampToValueAtTime(70, hitTime + 0.12)

        const hitGain = this._ctx.createGain()
        hitGain.gain.setValueAtTime(0.2, hitTime)
        hitGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.14)

        osc.connect(hitGain)
        hitGain.connect(this._masterGain)
        osc.start(hitTime)
        osc.stop(hitTime + 0.15)
      })
    }

    triggerDamru()
    const damruInterval = setInterval(triggerDamru, 2400)
    this._intervals.push(damruInterval)

    // Sanctum Temple Bell chime every 6s
    const triggerBell = () => {
      if (!this._running || !this._ctx) return
      const now = this._ctx.currentTime
      const bell = this._ctx.createOscillator()
      bell.type = 'sine'
      bell.frequency.setValueAtTime(880, now)

      const bGain = this._ctx.createGain()
      bGain.gain.setValueAtTime(0.08, now)
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0)

      bell.connect(bGain)
      bGain.connect(this._masterGain)
      bell.start(now)
      bell.stop(now + 3.1)
    }

    const bellInterval = setInterval(triggerBell, 6000)
    this._intervals.push(bellInterval)
  }

  // 8. Sacred Gayatri Maha Mantra (Solar 432 Hz Golden Resonance)
  _buildGayatriMantra() {
    const fundamental = this._ctx.createOscillator()
    fundamental.type = 'sawtooth'
    fundamental.frequency.value = 108 // Sub-harmonic of 432 Hz

    const sunDrone = this._ctx.createGain()
    sunDrone.gain.value = 0.1

    const filter = this._ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 360

    fundamental.connect(filter)
    filter.connect(sunDrone)
    sunDrone.connect(this._masterGain)
    fundamental.start()
    this._activeNodes.push(fundamental, filter, sunDrone)

    // 432Hz pure solar shimmer
    const solarTone = this._ctx.createOscillator()
    solarTone.type = 'sine'
    solarTone.frequency.value = 432
    const solarGain = this._ctx.createGain()
    solarGain.gain.value = 0.04
    solarTone.connect(solarGain)
    solarGain.connect(this._masterGain)
    solarTone.start()
    this._activeNodes.push(solarTone, solarGain)

    // Vedic Sanskrit Chant Formants: Om Bhur Bhuva Swaha
    const formants = [
      { freq: 380, Q: 6.0, gain: 0.16 },
      { freq: 920, Q: 5.0, gain: 0.14 },
      { freq: 2600, Q: 4.0, gain: 0.06 },
    ]
    formants.forEach((f) => {
      const bq = this._ctx.createBiquadFilter()
      bq.type = 'bandpass'
      bq.frequency.value = f.freq
      bq.Q.value = f.Q

      const fGain = this._ctx.createGain()
      fGain.gain.value = f.gain

      // Rhythmic 8-beat Gayatri meter pulsing
      const lfo = this._ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.125 // 8-second chant cycle

      const lfoG = this._ctx.createGain()
      lfoG.gain.value = f.gain * 0.4
      lfo.connect(lfoG)
      lfoG.connect(fGain.gain)

      fundamental.connect(bq)
      bq.connect(fGain)
      fGain.connect(this._masterGain)
      lfo.start()
      this._activeNodes.push(bq, fGain, lfo, lfoG)
    })
  }

  // 9. Shri Ram Bhajan & Stuti (Sitar, Harmonium Drone & Manjira Chimes)
  _buildRamBhajan() {
    // Harmonium reed drone in Sa-Ma-Pa (C3=130.81, F3=174.61, G3=196.00)
    ;[130.81, 174.61, 196.00].forEach((freq) => {
      const osc = this._ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq

      const bq = this._ctx.createBiquadFilter()
      bq.type = 'lowpass'
      bq.frequency.value = 550

      const g = this._ctx.createGain()
      g.gain.value = 0.045

      osc.connect(bq)
      bq.connect(g)
      g.connect(this._masterGain)
      osc.start()
      this._activeNodes.push(osc, bq, g)
    })

    // Sitar Devotional Melody in Raag Khamaj
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 440.00, 392.00]
    let nIdx = 0

    const playSitarPluck = () => {
      if (!this._running || !this._ctx) return
      const now = this._ctx.currentTime
      const freq = notes[nIdx % notes.length]
      nIdx++

      const osc = this._ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)

      // Jawari buzzing overtone
      const buzz = this._ctx.createOscillator()
      buzz.type = 'sawtooth'
      buzz.frequency.setValueAtTime(freq * 2, now)

      const noteGain = this._ctx.createGain()
      noteGain.gain.setValueAtTime(0.12, now)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)

      const buzzGain = this._ctx.createGain()
      buzzGain.gain.setValueAtTime(0.02, now)
      buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)

      osc.connect(noteGain)
      buzz.connect(buzzGain)
      noteGain.connect(this._masterGain)
      buzzGain.connect(this._masterGain)

      osc.start(now)
      buzz.start(now)
      osc.stop(now + 1.9)
      buzz.stop(now + 1.9)

      // Manjira (brass finger cymbal chime)
      const manjira = this._ctx.createOscillator()
      manjira.type = 'sine'
      manjira.frequency.setValueAtTime(2489, now)
      const mGain = this._ctx.createGain()
      mGain.gain.setValueAtTime(0.035, now)
      mGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

      manjira.connect(mGain)
      mGain.connect(this._masterGain)
      manjira.start(now)
      manjira.stop(now + 0.85)
    }

    playSitarPluck()
    const interval = setInterval(playSitarPluck, 2200)
    this._intervals.push(interval)
  }

  // 10. Anand Sankirtan & Bhajan Dhun (Mridanga, Kartal & Harmonium)
  _buildDivineKirtan() {
    // Harmonium chord bed (C major / Sa-Ga-Pa: 130.81, 164.81, 196.00)
    ;[130.81, 164.81, 196.00].forEach((freq) => {
      const osc = this._ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const g = this._ctx.createGain()
      g.gain.value = 0.05
      osc.connect(g)
      g.connect(this._masterGain)
      osc.start()
      this._activeNodes.push(osc, g)
    })

    // Mridanga rhythm: rhythmic bass beat + treble slap (at ~84 BPM = 714ms)
    let beatStep = 0
    const playMridangaBeat = () => {
      if (!this._running || !this._ctx) return
      const now = this._ctx.currentTime

      // Bass beat on 1 and 3
      if (beatStep % 2 === 0) {
        const bassOsc = this._ctx.createOscillator()
        bassOsc.type = 'sine'
        bassOsc.frequency.setValueAtTime(95, now)
        bassOsc.frequency.exponentialRampToValueAtTime(45, now + 0.16)

        const bGain = this._ctx.createGain()
        bGain.gain.setValueAtTime(0.18, now)
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

        bassOsc.connect(bGain)
        bGain.connect(this._masterGain)
        bassOsc.start(now)
        bassOsc.stop(now + 0.25)
      }

      // Kartal metallic clack on every beat
      const kartal = this._ctx.createOscillator()
      kartal.type = 'sine'
      kartal.frequency.setValueAtTime(3135, now)
      const kGain = this._ctx.createGain()
      kGain.gain.setValueAtTime(0.04, now)
      kGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)
      kartal.connect(kGain)
      kGain.connect(this._masterGain)
      kartal.start(now)
      kartal.stop(now + 0.18)

      beatStep++
    }

    playMridangaBeat()
    const interval = setInterval(playMridangaBeat, 714)
    this._intervals.push(interval)
  }

  dispose() {
    this.stop()
    if (this._ctx) {
      setTimeout(() => {
        this._ctx.close().catch(() => {})
        this._ctx = null
      }, 1400)
    }
  }
}
