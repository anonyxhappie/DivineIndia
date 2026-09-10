/**
 * Overpass API service for querying OpenStreetMap Hindu temples.
 *
 * Uses resilient multi-endpoint fallback with automatic retries and
 * bounding box clamping to prevent 504 Gateway Timeout errors.
 */

// List of public Overpass API mirrors
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

/**
 * Clamps bounding box if it spans too large an area (which triggers 504 Gateway Timeouts).
 */
function clampBounds(bounds, maxSpan = 0.8) {
  let { south, west, north, east } = bounds

  const latSpan = north - south
  const lngSpan = east - west

  if (latSpan > maxSpan || lngSpan > maxSpan) {
    const centerLat = (south + north) / 2
    const centerLng = (west + east) / 2
    const halfLat = Math.min(latSpan, maxSpan) / 2
    const halfLng = Math.min(lngSpan, maxSpan) / 2

    south = centerLat - halfLat
    north = centerLat + halfLat
    west = centerLng - halfLng
    east = centerLng + halfLng
  }

  return { south, west, north, east }
}

/**
 * Fetch Hindu temples within a bounding box from OSM via Overpass.
 * Attempts multiple endpoints on failure/timeout.
 *
 * @param {{ south: number, west: number, north: number, east: number }} rawBounds
 * @param {number} [limit=150] — max results to fetch
 * @returns {Promise<Array<{ id: string, name: string, lat: number, lng: number, osmTags: Object, deity?: string, isOSM: boolean }>>}
 */
export async function fetchOSMTemples(rawBounds, limit = 150) {
  const { south, west, north, east } = clampBounds(rawBounds)

  // Lightweight Overpass QL query with strict timeout and result limits
  const query = `
    [out:json][timeout:10][maxsize:10485760];
    (
      node["amenity"="place_of_worship"]["religion"="hindu"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)});
      way["amenity"="place_of_worship"]["religion"="hindu"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)});
      node["historic"="temple"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)});
      way["historic"="temple"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)});
      node["building"="temple"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)});
      way["building"="temple"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)});
    );
    out center ${limit};
  `.trim()

  let lastError = null

  // Try each mirror endpoint in sequence
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 9000)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 504 || response.status === 429 || response.status === 502 || response.status === 503) {
        lastError = new Error(`Mirror ${endpoint} returned status ${response.status}`)
        continue // Try next mirror
      }

      if (!response.ok) {
        lastError = new Error(`Overpass error: ${response.status} ${response.statusText}`)
        continue
      }

      const data = await response.json()

      if (!data || !Array.isArray(data.elements)) {
        return []
      }

      const inferDeityFromTags = (tags) => {
        if (tags.deity) return tags.deity
        if (tags.denomination) return tags.denomination
        const n = (tags.name || '').toLowerCase()
        if (n.includes('shiva') || n.includes('mahadev') || n.includes('nath') || n.includes('somnath') || n.includes('umeshwar') || n.includes('gopinath') || n.includes('gopi nath')) return 'Shiva'
        if (n.includes('krishna') || n.includes('dwarka') || n.includes('vishnu') || n.includes('ram') || n.includes('narayan') || n.includes('bethak') || n.includes('mahaprabhuji')) return 'Vishnu'
        if (n.includes('mata') || n.includes('devi') || n.includes('aashapura') || n.includes('ambaji') || n.includes('durga') || n.includes('shakti') || n.includes('chamunda')) return 'Goddess'
        if (n.includes('ganesh') || n.includes('vinayak') || n.includes('ganpati')) return 'Ganesh'
        if (n.includes('hanuman') || n.includes('maruti') || n.includes('balaji')) return 'Hanuman'
        return 'Hindu'
      }

      return data.elements
        .map((el) => {
          const lat = el.lat ?? el.center?.lat
          const lng = el.lon ?? el.center?.lon

          const hasPersoArabic = (str) =>
            str && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str)

          let cleanName = el.tags?.['name:en'] || el.tags?.['name:hi'] || el.tags?.name || 'Hindu Shrine'
          if (hasPersoArabic(cleanName)) {
            cleanName = el.tags?.['name:en'] || el.tags?.['name:hi'] || 'Sacred Heritage Shrine'
          }

          const tags = el.tags || {}

          return {
            id: `osm-${el.id}`,
            name: cleanName,
            lat,
            lng,
            osmTags: tags,
            deity: inferDeityFromTags(tags),
            state: tags['addr:state'] || '',
            country: tags['addr:country'] || 'India',
            period: 'Historic',
            circuit_tags: ['Local Shrine'],
            description: tags.description || `Sacred local Hindu shrine documented on OpenStreetMap & Google Maps.`,
            isOSM: true,
          }
        })
        .filter((t) => t.lat != null && t.lng != null)
    } catch (err) {
      lastError = err
      // Continue to next mirror on timeout/abort/network failure
    }
  }

  // If all mirrors failed
  throw new Error(
    lastError?.name === 'AbortError' || lastError?.message?.includes('504')
      ? 'Overpass API servers are currently busy. Please zoom in closer to narrow the area and try again.'
      : (lastError?.message || 'Failed to fetch local temples from OpenStreetMap.')
  )
}

/**
 * Search global temples on demand via Nominatim OpenStreetMap API
 * Enables pilgrims to find any unlisted Hindu temple in India or anywhere worldwide.
 *
 * @param {string} query — search term e.g. "Umeshwar Mahadev", "BAPS London", "Pashupatinath"
 * @returns {Promise<Array<{ id: string, name: string, state: string, country: string, lat: number, lng: number, deity: string, isOSM: boolean }>>}
 */
export async function searchGlobalTemples(query) {
  if (!query || query.trim().length < 2) return []

  const cleanQuery = query.trim()
  const q =
    cleanQuery.toLowerCase().includes('temple') || cleanQuery.toLowerCase().includes('mandir')
      ? cleanQuery
      : `${cleanQuery} temple`

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    q
  )}&addressdetails=1&limit=15`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) return []
    const data = await response.json()

    if (!Array.isArray(data)) return []

    const inferDeity = (name) => {
      const lower = name.toLowerCase()
      if (
        lower.includes('shiva') ||
        lower.includes('mahadev') ||
        lower.includes('rudra') ||
        lower.includes('shanker') ||
        lower.includes('ling')
      )
        return 'Shiva'
      if (
        lower.includes('krishna') ||
        lower.includes('vishnu') ||
        lower.includes('ram') ||
        lower.includes('narayan') ||
        lower.includes('venkateswara') ||
        lower.includes('perumal')
      )
        return 'Vishnu'
      if (
        lower.includes('devi') ||
        lower.includes('mata') ||
        lower.includes('durga') ||
        lower.includes('kali') ||
        lower.includes('amman') ||
        lower.includes('shakti')
      )
        return 'Goddess'
      if (lower.includes('ganesh') || lower.includes('vinayak') || lower.includes('ganpati'))
        return 'Ganesh'
      if (lower.includes('hanuman') || lower.includes('maruti') || lower.includes('balaji'))
        return 'Hanuman'
      if (lower.includes('murugan') || lower.includes('subramanya') || lower.includes('kartik'))
        return 'Murugan'
      return 'Hindu'
    }

    return data
      .filter((item) => item.lat != null && item.lon != null)
      .map((item) => {
        const title = item.name || item.display_name.split(',')[0]
        const state = item.address?.state || item.address?.province || item.address?.city || ''
        const country = item.address?.country || 'India'

        return {
          id: `global-search-${item.place_id || Math.random().toString(36).substring(2, 9)}`,
          name: title,
          state: state,
          country: country,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          deity: inferDeity(title),
          period: 'Historic',
          description: `Discovered shrine: ${item.display_name}`,
          isOSM: true,
          isGlobalLive: true,
        }
      })
  } catch {
    return []
  }
}
