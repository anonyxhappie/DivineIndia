/**
 * Client-side Image Resizing and Compression Utility for Divine India.
 *
 * Compresses uploaded device camera/gallery photos to optimized WebP/JPEG Data URLs (~80-150KB)
 * so they can be stored efficiently in browser storage and transmitted cleanly.
 */

const MAX_IMAGE_WIDTH = 1280
const MAX_IMAGE_HEIGHT = 1280
const DEFAULT_QUALITY = 0.82
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25MB max input before compression

/**
 * Validates whether the given file is an acceptable image.
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' }
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
  if (file.type && !validTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Please upload a valid image file (JPG, PNG, WebP)' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 25MB limit. Please choose a smaller image.' }
  }

  return { valid: true }
}

/**
 * Compresses an image File or Blob into an optimized Data URL.
 *
 * @param {File|Blob} file - Input image file
 * @param {Object} options - Optional compression configurations
 * @returns {Promise<{ dataUrl: string, width: number, height: number, sizeBytes: number, originalSizeBytes: number }>}
 */
export function compressImage(file, options = {}) {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return reject(new Error(validation.error))
    }

    const maxWidth = options.maxWidth || MAX_IMAGE_WIDTH
    const maxHeight = options.maxHeight || MAX_IMAGE_HEIGHT
    const quality = options.quality || DEFAULT_QUALITY

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file from device'))

    reader.onload = (event) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image for processing'))

      img.onload = () => {
        try {
          let { width, height } = img

          // Calculate aspect ratio preserving dimensions
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            } else {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          // Create offscreen canvas for rendering
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            return reject(new Error('Canvas 2D context unavailable'))
          }

          // High-quality downsampling smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          ctx.drawImage(img, 0, 0, width, height)

          // Try WebP first, fallback to JPEG
          let format = 'image/webp'
          let dataUrl = canvas.toDataURL(format, quality)

          // If browser doesn't support WebP export (e.g. older Safari), fallback to JPEG
          if (!dataUrl.startsWith('data:image/webp')) {
            format = 'image/jpeg'
            dataUrl = canvas.toDataURL(format, quality)
          }

          // Estimate output byte size from base64 length
          const base64Content = dataUrl.split(',')[1] || ''
          const sizeBytes = Math.round((base64Content.length * 3) / 4)

          resolve({
            dataUrl,
            width,
            height,
            format,
            sizeBytes,
            originalSizeBytes: file.size,
          })
        } catch (err) {
          reject(new Error('Image compression error: ' + err.message))
        }
      }

      img.src = event.target.result
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Formats bytes into human-readable string (KB, MB).
 */
export function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  const kb = bytes / 1024
  if (kb < 1024) return kb.toFixed(1) + ' KB'
  return (kb / 1024).toFixed(2) + ' MB'
}
