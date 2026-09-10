import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playCelebrationChimes } from '../audio/chimeSound'

const CIRCUIT_SLOKAS = {
  jyotirlinga: {
    title: 'द्वादश ज्योतिर्लिङ्ग स्तोत्रम्',
    sanskrit: `सौराष्ट्रे सोमनाथं च श्रीशैले मल्लिकार्जुनम् ।
उज्जयिन्यां महाकालमोङ्कारममलेश्वरम् ॥
परल्यां वैद्यनाथं च डाकिन्यां भीमशङ्करम् ।
सेतुबन्धे तु रामेशं नागेशं दारुकावने ॥
वाराणस्यां तु विश्वेशं त्र्यम्बकं गौतमीतटे ।
हिमालये तु केदारं घृष्णेशं च शिवालये ॥`,
    meaning:
      'Whoever remembers these 12 Jyotirlingas of Mahadeva at dawn and dusk is liberated from all sorrows and blessed with supreme peace and auspiciousness.',
    chant: 'हर हर महादेव! 🔱 Har Har Mahadev!',
  },
  'char dham': {
    title: 'महा चार धाम महात्म्य',
    sanskrit: `बद्रीनाथं च पूर्वे तु श्रीजगन्नाथमेव च ।
दक्षिणे सेतुबन्धं च पश्चिमे द्वारकापुरीम् ॥`,
    meaning:
      'The sacred pilgrimage across the four cardinal directions of Bharat Varsha leads the soul to ultimate Moksha and eternal dharma.',
    chant: 'जय बद्री विशाल! 🛕 Jai Shri Krishna!',
  },
  'shakti peetha': {
    title: 'श्री शक्ति स्तुति',
    sanskrit: `सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके ।
शरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते ॥`,
    meaning:
      'Salutations to the Divine Mother, the auspiciousness of all that is auspicious, the fulfiller of every noble intent and refuge of all creation.',
    chant: 'जय माता दी! 🌺 Jai Maa Durga!',
  },
  default: {
    title: 'शान्ति मन्त्र',
    sanskrit: `ॐ सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः ।
सर्वे भद्राणि पश्यन्तु मा कश्चिद्दुःखभाग्भवेत् ॥`,
    meaning:
      'May all beings be happy, may all beings be healthy, may all see what is good, and may no one suffer.',
    chant: 'ॐ शान्तिः शान्तिः शान्तिः ✦',
  },
}

// Generate animated floating flower petals and golden dust
function FlowerShower() {
  const petals = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    emoji: ['🌸', '🌼', '🪔', '✨', '🌺', '🕉️'][i % 6],
    left: `${(i * 3.6 + Math.random() * 2) % 96}%`,
    duration: 3.5 + (i % 5) * 0.7,
    delay: (i % 7) * 0.35,
    rotate: (i % 2 === 0 ? 1 : -1) * (180 + i * 20),
    size: 16 + (i % 4) * 6,
  }))

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {petals.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{
            y: ['0vh', '110vh'],
            opacity: [0, 1, 0.9, 0],
            rotate: p.rotate,
            x: [0, (p.id % 2 === 0 ? 30 : -30), 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute select-none"
          style={{ left: p.left, fontSize: `${p.size}px` }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  )
}

export default function YatraCompleteModal({
  isOpen,
  circuitName,
  circuitTemples,
  onClose,
  onRevisit,
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      playCelebrationChimes()
    }
  }, [isOpen])

  if (!isOpen) return null

  const key = Object.keys(CIRCUIT_SLOKAS).find((k) =>
    (circuitName || '').toLowerCase().includes(k)
  )
  const sloka = CIRCUIT_SLOKAS[key] || CIRCUIT_SLOKAS.default
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleShare = async () => {
    const text = `🙏 I have completed the sacred ${circuitName} Pilgrimage on Divine India! May Lord Mahadeva and the holy shrines bless all with peace and prosperity. 🛕✨ https://divineindia.shreehanumanchalisa.in/`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Divine India — ${circuitName} Completed`,
          text: text,
          url: 'https://divineindia.shreehanumanchalisa.in/',
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar bg-black/80 backdrop-blur-md">
        <FlowerShower />

        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative z-30 max-w-xl w-full glass-strong rounded-3xl p-5 sm:p-8 shadow-2xl border-2 border-[var(--border-saffron)] text-center overflow-hidden my-auto"
        >
          {/* Radiant background radial glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-saffron/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button top-right */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 rounded-full glass theme-muted hover:theme-title hover:border-saffron transition-colors text-xs font-bold"
            aria-label="Close celebration modal"
          >
            ✕
          </button>

          {/* Top Diya / Kalash Icon */}
          <div className="relative inline-block mx-auto mb-3">
            <motion.div
              animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-4xl sm:text-5xl select-none"
            >
              🔱
            </motion.div>
          </div>

          {/* Title Header */}
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-saffron font-cinzel block mb-1">
            ✦ पवित्र यात्रा पूर्णा · Yatra Sampoornam ✦
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-cinzel text-shimmer tracking-wide mb-1">
            {circuitName} Pilgrimage Completed!
          </h2>
          <p className="text-xs sm:text-sm theme-gold font-sans font-medium mb-4">
            {sloka.chant}
          </p>

          {/* Sacred Sanskrit Sloka Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-saffron/10 border border-saffron/30 text-left mb-5">
            <div className="text-[10px] sm:text-xs font-bold font-cinzel text-saffron uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{sloka.title}</span>
              <span className="text-xs">🪔</span>
            </div>
            <pre className="font-serif text-xs sm:text-sm leading-relaxed text-amber-200 dark:text-amber-300 whitespace-pre-wrap select-text mb-2 italic">
              {sloka.sanskrit}
            </pre>
            <p className="text-[11px] sm:text-xs theme-muted font-sans leading-relaxed">
              {sloka.meaning}
            </p>
          </div>

          {/* Holy Yatra Certificate Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl glass border border-[var(--border-gold)] text-left mb-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border-gold)] pb-2 mb-2.5">
              <div>
                <span className="text-[9px] uppercase tracking-widest theme-muted font-cinzel block">
                  Sacred Certificate of Pilgrimage
                </span>
                <span className="text-xs sm:text-sm font-bold theme-title font-cinzel">
                  पवित्र दर्शन प्रमाण पत्र
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans">
                  ✓ All {circuitTemples?.length || 0} Shrines Sanctified
                </span>
              </div>
            </div>

            {/* List of Stamped Shrines in Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
              {circuitTemples?.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center gap-1.5 p-1 px-1.5 rounded-lg bg-black/20 text-[10px] font-sans truncate"
                >
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="truncate theme-title font-medium">
                    {idx + 1}. {t.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2.5 pt-2 border-t border-[var(--border-gold)] flex items-center justify-between text-[10px] theme-muted font-sans">
              <span>Sanctified on: {today}</span>
              <span className="text-saffron font-bold">Divine India Parikrama</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              onClick={handleShare}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-saffron to-amber-500 text-slate-950 font-sans font-extrabold text-xs shadow-lg shadow-saffron/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>{copied ? '✓ Blessing Copied!' : '📤 Share Holy Blessing'}</span>
            </button>

            <button
              onClick={onRevisit}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass theme-title hover:border-saffron hover:text-saffron font-sans font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🔄 Revisit Tour</span>
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass theme-muted hover:theme-title font-sans font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
