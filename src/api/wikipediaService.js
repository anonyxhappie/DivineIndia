/**
 * Wikipedia API service for fetching temple details and Wikimedia gallery images.
 *
 * Uses the public MediaWiki Action API with `origin=*` for CORS.
 * Returns a high-resolution page image, additional gallery images, and intro extract.
 */

const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php'

// In-memory cache to avoid redundant network calls within a session
const cache = new Map()

/**
 * Sanitizes Wikipedia extracts to remove modern post-1947 partition references,
 * non-indic scripts (Urdu, Arabic, Shina), and geopolitical terms.
 *
 * @param {string|null} text
 * @returns {string|null}
 */
export function sanitizeTempleText(text) {
  if (!text) return null
  let cleaned = text

  // 1. Remove parenthetical transliterations in non-indic scripts (Urdu, Shina, Arabic, Persian, etc.)
  cleaned = cleaned.replace(/\s*\((?:Urdu|Shina|Persian|Arabic|Pashto|Nastaliq)[^)]*\)/gi, '')

  // 2. Remove any remaining Perso-Arabic / Urdu script characters
  cleaned = cleaned.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, '')

  // 3. Remove modern partition & administrative phrases
  cleaned = cleaned.replace(/,\s*Gilgit-Baltistan,\s*Pakistan\b/gi, ', Gilgit-Baltistan')
  cleaned = cleaned.replace(/,\s*Azad Kashmir,\s*Pakistan\b/gi, ', Jammu and Kashmir')
  cleaned = cleaned.replace(/\bin\s+Azad\s+Kashmir,\s*Pakistan\b/gi, 'in Jammu and Kashmir')
  cleaned = cleaned.replace(/\bin\s+Azad\s+Kashmir\b/gi, 'in Jammu and Kashmir')
  cleaned = cleaned.replace(/,\s*Pakistan\b/gi, '')
  cleaned = cleaned.replace(/,\s*China\b/gi, '')
  cleaned = cleaned.replace(/\b(?:in|of)\s+Pakistan\b/gi, 'in the region')
  cleaned = cleaned.replace(/\b(?:in|of)\s+China\b/gi, 'in the region')
  cleaned = cleaned.replace(/\b(?:Pakistan|Pakistani|China|Chinese)-administered\s*/gi, '')
  cleaned = cleaned.replace(/\b(?:Pakistan|Pakistani|China|Chinese)-controlled\s*/gi, '')
  cleaned = cleaned.replace(/\b(?:administered|controlled)\s+by\s+(?:Pakistan|China)\s*/gi, '')
  cleaned = cleaned.replace(/\bunder\s+(?:Pakistani|Pakistan|Chinese|China)\s+(?:control|administration)\s*/gi, '')
  cleaned = cleaned.replace(/\bthe\s+People's\s+Republic\s+of\s+China\b/gi, 'the region')
  cleaned = cleaned.replace(/\bPRC\b/g, '')
  cleaned = cleaned.replace(/\b(?:Pakistan|Pakistani)\b/gi, '')
  cleaned = cleaned.replace(/\b(?:China|Chinese)\b/gi, '')

  // 4. Clean up grammatical and punctuation artifacts
  cleaned = cleaned.replace(/\b(?:from|between)\s+and\b/gi, '')
  cleaned = cleaned.replace(/\b(?:and|or)\s+(?:and|or)\b/gi, 'and')
  cleaned = cleaned.replace(/\(\s*[,;\s]*\)/g, '') // empty parens
  cleaned = cleaned.replace(/\s+,/g, ',')
  cleaned = cleaned.replace(/,\s*,+/g, ',')
  cleaned = cleaned.replace(/,\s*\./g, '.')
  cleaned = cleaned.replace(/\s+\./g, '.')
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  cleaned = cleaned.trim()

  return cleaned || null
}

/**
 * Fetch temple details and gallery images from Wikipedia.
 *
 * @param {string} wikiSlug — Wikipedia article title with underscores
 *                             (e.g. "Kedarnath_Temple")
 * @returns {Promise<{ imageUrl: string|null, galleryImages: string[], extract: string|null, title: string }>}
 */
export async function fetchTempleDetails(wikiSlug) {
  if (!wikiSlug) {
    return { imageUrl: null, galleryImages: [], extract: null, title: '' }
  }

  // Return from cache if available
  if (cache.has(wikiSlug)) {
    return cache.get(wikiSlug)
  }

  const cleanTitle = wikiSlug.replace(/_/g, ' ')

  try {
    // 1. Fetch main page thumbnail & intro extract
    const mainParams = new URLSearchParams({
      action: 'query',
      titles: cleanTitle,
      prop: 'pageimages|extracts',
      exintro: 'true',
      explaintext: 'true',
      pithumbsize: '1200',
      redirects: '1',
      format: 'json',
      origin: '*',
    })

    // 2. Fetch gallery images generator
    const galleryParams = new URLSearchParams({
      action: 'query',
      titles: cleanTitle,
      generator: 'images',
      gimlimit: '15',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '900',
      redirects: '1',
      format: 'json',
      origin: '*',
    })

    const [mainRes, galleryRes] = await Promise.all([
      fetch(`${WIKI_API_BASE}?${mainParams.toString()}`).then((r) => r.ok ? r.json() : null),
      fetch(`${WIKI_API_BASE}?${galleryParams.toString()}`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ])

    const pages = mainRes?.query?.pages
    if (!pages) {
      throw new Error('Unexpected Wikipedia API response shape')
    }

    const page = Object.values(pages)[0]

    // Page ID of -1 means article does not exist
    if (page.pageid === undefined || page.missing !== undefined) {
      const result = { imageUrl: null, galleryImages: [], extract: null, title: cleanTitle }
      cache.set(wikiSlug, result)
      return result
    }

    const rawMainImage = page.thumbnail?.source ?? null
    const isMainSafe = rawMainImage &&
      !rawMainImage.toLowerCase().includes('flag') &&
      !rawMainImage.toLowerCase().includes('pakistan') &&
      !rawMainImage.toLowerCase().includes('china')

    const mainImageUrl = isMainSafe ? rawMainImage : null
    const galleryUrls = []

    if (mainImageUrl) {
      galleryUrls.push(mainImageUrl)
    }

    // Parse additional gallery images
    if (galleryRes?.query?.pages) {
      for (const p of Object.values(galleryRes.query.pages)) {
        const title = (p.title || '').toLowerCase()
        const imgInfo = p.imageinfo?.[0]
        const thumbUrl = imgInfo?.thumburl || imgInfo?.url

        // Filter out non-content SVGs, logos, icons, flags, and sensitive content
        if (
          thumbUrl &&
          !title.endsWith('.svg') &&
          !title.includes('icon') &&
          !title.includes('flag') &&
          !title.includes('symbol') &&
          !title.includes('logo') &&
          !title.includes('question_book') &&
          !title.includes('commons-logo') &&
          !title.includes('wikiquote') &&
          !title.includes('padlock') &&
          !title.includes('pakistan') &&
          !title.includes('china') &&
          !thumbUrl.toLowerCase().includes('pakistan') &&
          !thumbUrl.toLowerCase().includes('china') &&
          !galleryUrls.includes(thumbUrl)
        ) {
          galleryUrls.push(thumbUrl)
          if (galleryUrls.length >= 5) break
        }
      }
    }

    const result = {
      imageUrl: mainImageUrl,
      galleryImages: galleryUrls,
      extract: sanitizeTempleText(page.extract ?? null),
      title: page.title ?? cleanTitle,
    }

    cache.set(wikiSlug, result)
    return result
  } catch (err) {
    const fallback = { imageUrl: null, galleryImages: [], extract: null, title: cleanTitle }
    return fallback
  }
}

export function clearCache() {
  cache.clear()
}
