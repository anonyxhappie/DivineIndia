import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const PrevIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const NextIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

/**
 * Full-screen Image Lightbox Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - whether lightbox is visible
 * @param {Array<string>} props.images - array of image URLs
 * @param {number} props.currentIndex - active image index
 * @param {string} [props.title] - temple title or image description
 * @param {Function} props.onClose - callback to close lightbox
 * @param {Function} props.onNavigate - callback(newIndex) to navigate
 */
export default function Lightbox({
  isOpen,
  images = [],
  currentIndex = 0,
  title = '',
  onClose,
  onNavigate,
}) {
  const total = images.length
  const currentImage = images[currentIndex] || images[0]

  const handlePrev = useCallback((e) => {
    e?.stopPropagation()
    if (total <= 1) return
    const nextIdx = (currentIndex - 1 + total) % total
    onNavigate(nextIdx)
  }, [currentIndex, total, onNavigate])

  const handleNext = useCallback((e) => {
    e?.stopPropagation()
    if (total <= 1) return
    const nextIdx = (currentIndex + 1) % total
    onNavigate(nextIdx)
  }, [currentIndex, total, onNavigate])

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, handlePrev, handleNext])

  return (
    <AnimatePresence>
      {isOpen && currentImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8 select-none"
        >
          {/* Top Bar Header inside Lightbox */}
          <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-8 sm:right-8 flex items-center justify-between z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl pointer-events-auto">
              <h3 className="text-white font-cinzel font-bold text-sm sm:text-base leading-tight">
                {title || 'Sacred Temple View'}
              </h3>
              {total > 1 && (
                <p className="text-[11px] text-amber-400/90 font-mono font-semibold">
                  Photo {currentIndex + 1} of {total}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all pointer-events-auto shadow-xl"
              aria-label="Close image lightbox"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Left Arrow Button */}
          {total > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all z-10 shadow-2xl"
              aria-label="Previous image"
            >
              <PrevIcon />
            </button>
          )}

          {/* Centered High-Res Image with smooth transition */}
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[90vw] max-h-[82vh] flex items-center justify-center"
          >
            <img
              src={currentImage}
              alt={title || 'Temple Fullscreen View'}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </motion.div>

          {/* Right Arrow Button */}
          {total > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 sm:right-6 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all z-10 shadow-2xl"
              aria-label="Next image"
            >
              <NextIcon />
            </button>
          )}

          {/* Bottom Thumbnails Navigation Dots */}
          {total > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 overflow-x-auto max-w-[90vw]"
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate(idx)}
                  className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    idx === currentIndex
                      ? 'border-amber-400 scale-110 shadow-md'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
