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

      return data.elements
        .map((el) => {
          const lat = el.lat ?? el.center?.lat
          const lng = el.lon ?? el.center?.lon

          return {
            id: `osm-${el.id}`,
            name: el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:hi'] || 'Hindu Temple',
            lat,
            lng,
            osmTags: el.tags || {},
            deity: el.tags?.deity || el.tags?.denomination || 'Hindu',
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
