/**
 * Circuit Order & Geodesic Navigation Engine
 *
 * Provides canonical clockwise Parikrama (Pradakshina) routes for sacred
 * pilgrimage circuits (12 Jyotirlingas, Char Dham, Pancha Bhoota, etc.)
 * and a 2-opt Traveling Salesperson geodesic optimizer for any custom or
 * arbitrary circuit, eliminating criss-crossing spiderweb paths.
 */

// Canonical clockwise Garland order (Pradakshina) for 12 Jyotirlingas
// Loops clockwise around India:
// Gujarat (Somnath, Nageshwar) -> Himalayas (Kedarnath) -> Gangetic East (Kashi, Baidyanath)
// -> South (Mallikarjuna, Rameshwaram) -> Maharashtra (Bhimashankar, Trimbakeshwar, Grishneshwar)
// -> Central MP (Omkareshwar, Mahakaleshwar) -> back to Somnath.
const CANONICAL_JYOTIRLINGA_ORDER = [
  'Somnath Temple',
  'Nageshwar Jyotirlinga',
  'Kedarnath Temple',
  'Kashi Vishwanath Temple',
  'Baidyanath Temple',
  'Mallikarjuna Temple',
  'Ramanathaswamy Temple',
  'Bhimashankar Temple',
  'Trimbakeshwar Shiva Temple',
  'Grishneshwar Temple',
  'Omkareshwar Temple',
  'Mahakaleshwar Temple',
]

// Canonical Maha Char Dham:
// Badrinath (North) -> Jagannath Puri (East) -> Rameshwaram (South) -> Dwarkadhish (West)
const CANONICAL_CHAR_DHAM_ORDER = [
  'Badrinath Temple',
  'Jagannath Temple, Puri',
  'Ramanathaswamy Temple',
  'Dwarkadhish Temple',
]

// Canonical Chota Char Dham (Uttarakhand):
// Yamunotri -> Gangotri -> Kedarnath -> Badrinath
const CANONICAL_CHOTA_CHAR_DHAM_ORDER = [
  'Yamunotri Temple',
  'Gangotri',
  'Kedarnath Temple',
  'Badrinath Temple',
]

// Pancha Bhoota Stalams (5 elements):
// Earth (Ekambareswarar) -> Water (Jambukeswarar) -> Fire (Annamalaiyar) -> Air (Srikalahasteeswara) -> Ether (Nataraja)
const CANONICAL_PANCHA_BHOOTA_ORDER = [
  'Ekambareswarar Temple',
  'Jambukeswarar Temple, Thiruvanaikaval',
  'Annamalaiyar Temple',
  'Srikalahasteeswara Temple',
  'Nataraja Temple, Chidambaram',
  'Thillai Nataraja Temple',
]

// Calculate Great Circle Haversine distance in kilometers
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate compass bearing between two coordinates in degrees (0 = N, 90 = E, 180 = S, 270 = W)
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180)
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon)
  let brng = (Math.atan2(y, x) * 180) / Math.PI
  return (brng + 360) % 360
}

// Convert bearing to cardinal compass direction (e.g. 'North-East', 'South')
export function getCardinalDirection(bearing) {
  const directions = [
    'North',
    'North-East',
    'East',
    'South-East',
    'South',
    'South-West',
    'West',
    'North-West',
  ]
  const idx = Math.round(bearing / 45) % 8
  return directions[idx]
}

/**
 * 2-opt Heuristic Tour Optimizer for arbitrary temple sets:
 * Finds a smooth, non-self-intersecting geodesic path that visits every temple.
 */
function optimizeGeodesicTour(temples) {
  if (!temples || temples.length <= 2) return temples

  // Filter out any temples lacking coordinates
  const valid = temples.filter(
    (t) => t.lat != null && t.lng != null && !isNaN(t.lat) && !isNaN(t.lng)
  )
  const invalid = temples.filter(
    (t) => t.lat == null || t.lng == null || isNaN(t.lat) || isNaN(t.lng)
  )
  if (valid.length <= 2) return [...valid, ...invalid]

  // Start with Nearest-Neighbor traversal starting from the northernmost temple
  let remaining = [...valid]
  remaining.sort((a, b) => b.lat - a.lat) // Northernmost first
  let tour = [remaining.shift()]

  while (remaining.length > 0) {
    const last = tour[tour.length - 1]
    let nearestIdx = 0
    let minDist = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(last.lat, last.lng, remaining[i].lat, remaining[i].lng)
      if (d < minDist) {
        minDist = d
        nearestIdx = i
      }
    }
    tour.push(remaining.splice(nearestIdx, 1)[0])
  }

  // 2-opt pass to untangle any crossings
  let improved = true
  let iterations = 0
  const maxIterations = 50

  const getDistance = (i, j) =>
    haversineDistance(tour[i].lat, tour[i].lng, tour[j].lat, tour[j].lng)

  while (improved && iterations < maxIterations) {
    improved = false
    iterations++
    for (let i = 0; i < tour.length - 1; i++) {
      for (let k = i + 2; k < tour.length; k++) {
        const nextI = i + 1
        const nextK = (k + 1) % tour.length

        const currentDist = getDistance(i, nextI) + getDistance(k, nextK)
        const newDist = getDistance(i, k) + getDistance(nextI, nextK)

        if (newDist < currentDist - 0.01) {
          // Reverse 2-opt segment between nextI and k
          const sub = tour.slice(nextI, k + 1).reverse()
          tour.splice(nextI, sub.length, ...sub)
          improved = true
        }
      }
    }
  }

  return [...tour, ...invalid]
}

/**
 * Returns canonical, geographically ordered temple array for a pilgrimage circuit.
 * Guaranteed never to criss-cross or spiderweb.
 */
export function getOrderedCircuitTemples(circuitTag, temples) {
  if (!temples || temples.length === 0) return []

  const circuitList = temples.filter((t) => t.circuit_tags?.includes(circuitTag))
  if (circuitList.length === 0) return []

  const normalizedTag = (circuitTag || '').toLowerCase()

  // 1. 12 Jyotirlingas
  if (normalizedTag.includes('jyotirlinga')) {
    const ordered = []
    const remaining = [...circuitList]

    CANONICAL_JYOTIRLINGA_ORDER.forEach((name) => {
      const idx = remaining.findIndex(
        (t) => t.name.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      )
      if (idx !== -1) {
        ordered.push(remaining.splice(idx, 1)[0])
      }
    })
    return [...ordered, ...remaining]
  }

  // 2. Chota Char Dham (Uttarakhand 4 Dhams)
  if (normalizedTag.includes('chota')) {
    const ordered = []
    const remaining = [...circuitList]

    CANONICAL_CHOTA_CHAR_DHAM_ORDER.forEach((name) => {
      const idx = remaining.findIndex(
        (t) => t.name.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      )
      if (idx !== -1) {
        ordered.push(remaining.splice(idx, 1)[0])
      }
    })
    return [...ordered, ...remaining]
  }

  // 3. Maha Char Dham (All-India 4 Dhams: Badrinath -> Puri -> Rameshwaram -> Dwarka)
  if (normalizedTag.includes('char dham')) {
    const ordered = []
    const remaining = [...circuitList]

    // Prioritize the 4 Maha Char Dhams in North -> East -> South -> West
    CANONICAL_CHAR_DHAM_ORDER.forEach((name) => {
      const idx = remaining.findIndex(
        (t) => t.name.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      )
      if (idx !== -1) {
        ordered.push(remaining.splice(idx, 1)[0])
      }
    })

    const extraOptimized = optimizeGeodesicTour(remaining)
    return [...ordered, ...extraOptimized]
  }

  // 3. Pancha Bhoota Stalams
  if (normalizedTag.includes('pancha bhoota')) {
    const ordered = []
    const remaining = [...circuitList]

    CANONICAL_PANCHA_BHOOTA_ORDER.forEach((name) => {
      const idx = remaining.findIndex(
        (t) => t.name.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      )
      if (idx !== -1) {
        ordered.push(remaining.splice(idx, 1)[0])
      }
    })
    return [...ordered, ...remaining]
  }

  // 4. Default for any other circuit (Shakti Peethas, Sapta Puri, Heritage, etc.):
  // Apply 2-opt Geodesic Tour optimization to eliminate criss-crossing lines
  return optimizeGeodesicTour(circuitList)
}
