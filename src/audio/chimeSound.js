/**
 * Procedural Temple Bell / Brass Chime Generator — Web Audio API
 *
 * Synthesizes a delicate, sacred brass chime with bell overtones
 * and exponential natural ring-down decay.
 */

let chimeCtx = null

export function playTempleChime() {
  try {
    if (!chimeCtx) {
      chimeCtx = new (window.AudioContext || window.webkitAudioContext)()
    }

    if (chimeCtx.state === 'suspended') {
      chimeCtx.resume()
    }

    const now = chimeCtx.currentTime

    // Master gain for chime
    const masterGain = chimeCtx.createGain()
    masterGain.gain.setValueAtTime(0.18, now)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4)
    masterGain.connect(chimeCtx.destination)

    // Bell chime harmonic partials (ratios relative to fundamental)
    const baseFreq = 880 // A5 crystalline chime
    const partials = [
      { ratio: 1.0, gain: 0.7 },
      { ratio: 2.76, gain: 0.35 },
      { ratio: 5.40, gain: 0.18 },
      { ratio: 8.93, gain: 0.08 },
    ]

    partials.forEach(({ ratio, gain }) => {
      const osc = chimeCtx.createOscillator()
      const pGain = chimeCtx.createGain()

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
    // Gracefully ignore if audio context is blocked by browser
  }
}
