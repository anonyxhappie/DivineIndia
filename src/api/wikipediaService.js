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

    const mainImageUrl = page.thumbnail?.source ?? null
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

        // Filter out non-content SVGs, logos, icons, flags
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
      extract: page.extract ?? null,
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
