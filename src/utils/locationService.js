/**
 * Resilient 3-Tier Geolocation Service
 *
 * 1. Tier 1: Browser GPS (high accuracy)
 * 2. Tier 2: Browser Wi-Fi/Cell trilateration (standard accuracy)
 * 3. Tier 3: IP-based city geolocation fallback (ipwho.is / freeipapi.com)
 */

async function fetchIPLocation() {
  try {
    const res = await fetch('https://ipwho.is/')
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.latitude != null && data.longitude != null) {
        return {
          lat: Number(data.latitude.toFixed(4)),
          lng: Number(data.longitude.toFixed(4)),
          city: data.city || data.region || 'Your City',
          source: 'ip',
        }
      }
    }
  } catch {}

  try {
    const res = await fetch('https://freeipapi.com/api/json')
    if (res.ok) {
      const data = await res.json()
      if (data.latitude != null && data.longitude != null) {
        return {
          lat: Number(data.latitude.toFixed(4)),
          lng: Number(data.longitude.toFixed(4)),
          city: data.cityName || data.regionName || 'Your City',
          source: 'ip',
        }
      }
    }
  } catch {}

  throw new Error('All location providers failed')
}

export function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      fetchIPLocation()
        .then(resolve)
        .catch(() => resolve(null))
      return
    }

    // Try Tier 1: High Accuracy GPS (6s timeout)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
          city: null,
          source: 'gps',
        })
      },
      () => {
        // Tier 2: Fallback to standard accuracy (8s timeout, cached up to 5 mins)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: Number(pos.coords.latitude.toFixed(4)),
              lng: Number(pos.coords.longitude.toFixed(4)),
              city: null,
              source: 'standard',
            })
          },
          () => {
            // Tier 3: Seamless fallback to IP location
            fetchIPLocation()
              .then(resolve)
              .catch(() => resolve(null))
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        )
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    )
  })
}
