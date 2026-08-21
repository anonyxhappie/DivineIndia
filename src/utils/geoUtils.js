/**
 * Geolocation & Distance Calculation Utilities
 */

/**
 * Calculates the great-circle distance between two points on the Earth
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null
  }

  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * Formats a distance in kilometers to a human-readable string.
 *
 * @param {number|null} distKm - Distance in kilometers
 * @returns {string} Formatted string, e.g. "12.4 km", "850 m"
 */
export function formatDistance(distKm) {
  if (distKm == null || isNaN(distKm)) return null

  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`
  }
  if (distKm < 50) {
    return `${distKm.toFixed(1)} km`
  }
  return `${Math.round(distKm)} km`
}
