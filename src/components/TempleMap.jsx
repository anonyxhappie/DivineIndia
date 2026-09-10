import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, ZoomControl, GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchOSMTemples } from '../api/overpassService'
import { fetchTempleDetails } from '../api/wikipediaService'
import { calculateDistance, formatDistance } from '../utils/geoUtils'
import indiaBoundaryData from '../data/india-boundary.json'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Deity Emojis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEITY_EMOJIS = {
  Shiva: '🔱',
  Vishnu: '🪷',
  Surya: '☀️',
  Goddess: '🌺',
  Ganesh: '🐘',
  Buddha: '☸️',
  Jain: '🕉️',
  Sikh: '☬',
  Brahma: '📿',
  Multi: '🛕',
  Hindu: '🕉️',
  Deity: '🛕',
}

const LayersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

export const MAP_STYLES = {
  roadmap: {
    id: 'roadmap',
    label: 'Roadmap (Google)',
    shortLabel: 'Roadmap',
    icon: '🗺️',
    description: 'Streets, cities & English names (Google)',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=IN',
    subdomains: '0123',
    maxZoom: 19,
    nativeMaxZoom: 18,
    attribution: '&copy; Google Maps',
    supportsDarkFilter: true,
  },
  terrain: {
    id: 'terrain',
    label: 'Terrain (Google)',
    shortLabel: 'Terrain',
    icon: '⛰️',
    description: 'Topographic relief & English names (Google)',
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=en&gl=IN',
    subdomains: '0123',
    maxZoom: 19,
    nativeMaxZoom: 18,
    attribution: '&copy; Google Maps',
    supportsDarkFilter: true,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite (Google)',
    shortLabel: 'Satellite',
    icon: '🛰️',
    description: 'Aerial photography with English labels',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=en&gl=IN',
    subdomains: '0123',
    maxZoom: 20,
    nativeMaxZoom: 20,
    attribution: '&copy; Google Maps',
    supportsDarkFilter: false,
  },
  osm: {
    id: 'osm',
    label: 'OpenStreetMap',
    shortLabel: 'OSM',
    icon: '🌐',
    description: 'Community street map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    nativeMaxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    supportsDarkFilter: true,
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Custom temple & user location SVG marker icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createUserLocationIcon() {
  const svg = `
    <div style="position: relative; width: 40px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: grab;">
      <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(14, 165, 233, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; top: 2px; width: 26px; height: 26px; border-radius: 50%; background: #0284C7; border: 3px solid #FFFFFF; box-shadow: 0 0 18px rgba(14, 165, 233, 0.95); display: flex; align-items: center; justify-content: center;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #FFFFFF;"></div>
      </div>
      <div style="position: absolute; bottom: 6px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 9px solid #0284C7;"></div>
    </div>`

  return L.divIcon({
    html: svg,
    className: 'user-location-marker',
    iconSize: [40, 44],
    iconAnchor: [20, 38],
    popupAnchor: [0, -38],
  })
}

function createTempleIcon(isActive = false, isLight = false) {
  const glow = isActive
    ? '0 0 24px rgba(255,153,51,1)'
    : isLight
      ? '0 0 8px rgba(217,101,0,0.6)'
      : '0 0 10px rgba(255,153,51,0.6)'

  const html = `
    <div class="temple-marker-inner ${isActive ? 'temple-marker-active-inner' : 'diya-pulse-inner'}"
         style="width: 40px; height: 52px; display: flex; align-items: center; justify-content: center; transform-origin: 20px 52px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52"
           style="filter: drop-shadow(${glow});">
        <path d="M20 2 L8 22 L12 22 L12 38 L28 38 L28 22 L32 22 Z"
              fill="#FF9933" stroke="#D4AF37" stroke-width="1.2" opacity="0.95"/>
        <rect x="16" y="26" width="8" height="12" rx="1" fill="#D4AF37" opacity="0.85"/>
        <ellipse cx="20" cy="6" rx="3" ry="5" fill="#FFD700" opacity="0.95"/>
        <ellipse cx="20" cy="5" rx="1.5" ry="3" fill="#FFF5E0" opacity="0.98"/>
        <rect x="10" y="38" width="20" height="4" rx="1" fill="#D4AF37" opacity="0.9"/>
        <path d="M18 42 L20 52 L22 42" fill="#FF9933" opacity="0.95"/>
      </svg>
    </div>`

  return L.divIcon({
    html,
    className: 'temple-marker-wrapper',
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -52],
  })
}

function createOSMIcon(isActive = false) {
  const html = `
    <div class="osm-marker-inner ${isActive ? 'osm-marker-active-inner' : ''}"
         style="width: 28px; height: 38px; display: flex; align-items: center; justify-content: center; transform-origin: 14px 38px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" width="28" height="38"
           style="filter: drop-shadow(0 0 10px rgba(74,222,195,0.8));">
        <path d="M14 2 L5 16 L8 16 L8 28 L20 28 L20 16 L23 16 Z"
              fill="#4ADEC3" stroke="#2DD4A8" stroke-width="1.2" opacity="0.9"/>
        <rect x="11" y="19" width="6" height="9" rx="1" fill="#2DD4A8" opacity="0.75"/>
        <ellipse cx="14" cy="5" rx="2" ry="3.5" fill="#7FFFDC" opacity="0.9"/>
        <rect x="7" y="28" width="14" height="3" rx="1" fill="#2DD4A8" opacity="0.8"/>
        <path d="M12 31 L14 38 L16 31" fill="#4ADEC3" opacity="0.9"/>
      </svg>
    </div>`

  return L.divIcon({
    html,
    className: 'osm-marker-wrapper',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  })
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount()
  let size = 'small'
  if (count >= 20) size = 'large'
  else if (count >= 10) size = 'medium'

  const sizes = { small: 36, medium: 44, large: 52 }
  const px = sizes[size]

  return L.divIcon({
    html: `<div style="
      width: ${px}px; height: ${px}px;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle, rgba(255,153,51,0.45) 0%, rgba(255,153,51,0.18) 70%);
      border: 2px solid rgba(212,175,55,0.6);
      border-radius: 50%;
      color: #FFD700;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: ${size === 'large' ? 16 : size === 'medium' ? 14 : 12}px;
      backdrop-filter: blur(8px);
      box-shadow: 0 0 20px rgba(255,153,51,0.5);
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(px, px),
  })
}

function createCircuitStopIcon({ stopNumber, isVisited = false, isActive = false, isLight = false }) {
  const size = isActive ? 42 : 34
  const bg = isActive
    ? 'linear-gradient(135deg, #FF9933 0%, #E65100 100%)'
    : isVisited
    ? 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
    : isLight
    ? 'linear-gradient(135deg, #FFF8E7 0%, #FFE082 100%)'
    : 'linear-gradient(135deg, #2A241A 0%, #1A1610 100%)'

  const border = isActive
    ? '#FFF5E0'
    : isVisited
    ? '#A7F3D0'
    : '#FFD700'

  const textColor = isActive
    ? '#FFFFFF'
    : isVisited
    ? '#FFFFFF'
    : isLight
    ? '#92400E'
    : '#FFD700'

  const glow = isActive
    ? '0 0 28px rgba(255,153,51,1), 0 0 14px rgba(255,215,0,0.8)'
    : isVisited
    ? '0 0 12px rgba(16,185,129,0.7)'
    : '0 0 12px rgba(255,215,0,0.5)'

  const displayChar = isVisited && !isActive ? '✓' : stopNumber

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size + 8}px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: pointer; filter: drop-shadow(${glow});">
      ${isActive ? `<div style="position: absolute; top: -5px; width: ${size + 10}px; height: ${size + 10}px; border-radius: 50%; background: rgba(255,153,51,0.35); animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
      <div style="
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: ${bg};
        border: ${isActive ? '2.5px' : '2px'} solid ${border};
        display: flex; align-items: center; justify-content: center;
        font-family: 'Cinzel', 'Outfit', sans-serif;
        font-weight: 800;
        font-size: ${isVisited && !isActive ? '15px' : isActive ? '15px' : '13px'};
        color: ${textColor};
        box-shadow: 0 4px 10px rgba(0,0,0,0.45);
        z-index: 2;
      ">${displayChar}</div>
      <div style="
        width: 0; height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 6px solid ${border};
        margin-top: -1px;
        z-index: 1;
      "></div>
    </div>`

  return L.divIcon({
    html,
    className: `circuit-stop-marker ${isActive ? 'circuit-stop-active' : ''}`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FlyTo controller
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function FlyToController({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target && target.center && target.center[0] != null && target.center[1] != null) {
      map.flyTo(target.center, target.zoom || 13, {
        duration: 1.4,
        easeLinearity: 0.25,
      })
    }
  }, [target, map])
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Bounds provider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BoundsWatcher({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds()
      onBoundsChange({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
        zoom: map.getZoom(),
      })
    },
  })

  useEffect(() => {
    const b = map.getBounds()
    onBoundsChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
      zoom: map.getZoom(),
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng)
    },
  })
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Temple Card Tooltip Component with Image & Distance
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TempleTooltipContent({ temple, activeImage, userLocation }) {
  const [imgError, setImgError] = useState(false)
  const deityEmoji = DEITY_EMOJIS[temple.deity] || '🛕'
  const imgUrl = !imgError ? (activeImage || temple.image_url || null) : null

  useEffect(() => {
    setImgError(false)
  }, [temple?.id, activeImage])

  const distanceKm = userLocation && temple.lat != null && temple.lng != null
    ? calculateDistance(userLocation.lat, userLocation.lng, temple.lat, temple.lng)
    : null
  const formattedDist = distanceKm != null ? formatDistance(distanceKm) : null

  return (
    <div className="temple-tooltip-bubble">
      <div className="flex items-center gap-3 p-1 pr-2.5">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={temple.name}
            onError={() => setImgError(true)}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-[var(--border-gold)] shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-saffron/20 border border-[var(--border-gold)] flex-shrink-0 text-xl">
            {deityEmoji}
          </div>
        )}
        <div className="flex flex-col justify-center min-w-0">
          <span className="font-bold text-xs sm:text-sm font-cinzel leading-snug whitespace-nowrap theme-title">
            {temple.name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
            <span className="text-[10px] text-saffron font-sans font-semibold">
              ✦ {temple.deity || 'Hindu Shrine'} {temple.state ? `· ${temple.state}` : ''}
            </span>
            {formattedDist && (
              <span className="text-[9.5px] font-sans font-bold px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                📍 {formattedDist}
              </span>
            )}
          </div>
          {temple.era && (
            <span className="text-[9px] theme-muted font-sans mt-0.5 whitespace-nowrap">
              {temple.era}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SVG Icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RadarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" opacity="0.3" />
    <circle cx="12" cy="12" r="6" opacity="0.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const ClearIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main TempleMap component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INDIA_CENTER = [22.5, 79.0]
const DEFAULT_ZOOM = 5

export default function TempleMap({
  filteredTemples = [],
  selectedTemple = null,
  onSelectTemple,
  flyTarget = null,
  theme = 'dark',
  activeCircuit = null,
  circuitTemples = [],
  visitedIds = new Set(),
  userLocation = null,
  onUpdateUserLocation = null,
  onAddDiscoveredTemples = null,
}) {
  const defaultIcon = useMemo(() => createTempleIcon(false, theme === 'light'), [theme])
  const activeIcon = useMemo(() => createTempleIcon(true, theme === 'light'), [theme])
  const osmIcon = useMemo(() => createOSMIcon(false), [])
  const activeOsmIcon = useMemo(() => createOSMIcon(true), [])
  const userIcon = useMemo(() => createUserLocationIcon(), [])

  // Safely filter out temples with null/undefined/invalid coordinates for map marker rendering
  const mapTemples = useMemo(() => {
    return filteredTemples.filter(
      (t) => t && t.lat != null && t.lng != null && !isNaN(t.lat) && !isNaN(t.lng)
    )
  }, [filteredTemples])

  // Active circuit temple IDs to isolate them from MarkerClusterGroup
  const circuitTempleIds = useMemo(() => {
    if (!activeCircuit || !circuitTemples) return new Set()
    return new Set(circuitTemples.map((t) => t.id))
  }, [activeCircuit, circuitTemples])

  // Temples that should participate in clustering (when tour is active, circuit temples are unclustered)
  const nonCircuitTemples = useMemo(() => {
    if (!activeCircuit) return mapTemples
    return mapTemples.filter((t) => !circuitTempleIds.has(t.id))
  }, [activeCircuit, mapTemples, circuitTempleIds])

  // Active temple image state for the floating map card
  const [activeTempleImage, setActiveTempleImage] = useState(null)

  useEffect(() => {
    if (!selectedTemple) {
      setActiveTempleImage(null)
      return
    }

    setActiveTempleImage(selectedTemple.image_url || null)

    if (selectedTemple.wiki_slug) {
      let isCurrent = true
      fetchTempleDetails(selectedTemple.wiki_slug)
        .then((res) => {
          if (isCurrent && res?.imageUrl) {
            setActiveTempleImage(res.imageUrl)
          }
        })
        .catch(() => {})
      return () => {
        isCurrent = false
      }
    }
  }, [selectedTemple?.id, selectedTemple?.wiki_slug, selectedTemple?.image_url])

  // OSM discovery state
  const [osmTemples, setOsmTemples] = useState([])
  const [osmLoading, setOsmLoading] = useState(false)
  const [osmMessage, setOsmMessage] = useState(null)
  const [osmMessageType, setOsmMessageType] = useState('error')
  const [mapBounds, setMapBounds] = useState(null)

  const showMessage = (msg, type = 'error', duration = 4000) => {
    setOsmMessage(msg)
    setOsmMessageType(type)
    setTimeout(() => setOsmMessage(null), duration)
  }

  const handleScanRegion = useCallback(async () => {
    if (!mapBounds) return

    if (mapBounds.zoom < 8) {
      showMessage('Please zoom into a city or district (zoom ≥ 8) to scan local temples.', 'info', 4000)
      return
    }

    setOsmLoading(true)
    setOsmMessage(null)

    try {
      const results = await fetchOSMTemples(mapBounds)
      setOsmTemples(results)
      if (results.length === 0) {
        showMessage('No unlisted Hindu places of worship found in this specific area. Try panning nearby.', 'info', 4500)
      } else {
        onAddDiscoveredTemples?.(results)
      }
    } catch (err) {
      showMessage(err.message || 'Overpass servers are busy. Please zoom in closer and retry.', 'error', 5500)
    } finally {
      setOsmLoading(false)
    }
  }, [mapBounds, onAddDiscoveredTemples])

  const clearOSMResults = useCallback(() => {
    setOsmTemples([])
    setOsmMessage(null)
  }, [])

  // Click-to-Select temple directly from Google Maps & OpenStreetMap
  const handleMapClick = useCallback(
    async (latlng) => {
      if (!latlng || latlng.lat == null || latlng.lng == null) return
      const { lat, lng } = latlng

      // 1. Check if user clicked close to an existing temple (within ~150 meters)
      const existing = [...mapTemples, ...osmTemples].find((t) => {
        if (t.lat == null || t.lng == null) return false
        const d = calculateDistance(lat, lng, t.lat, t.lng)
        return d <= 0.15 // 150m
      })

      if (existing) {
        onSelectTemple?.(existing)
        return
      }

      // 2. Identify temple from Google Maps & OpenStreetMap at clicked coordinates
      showMessage('🔍 Identifying shrine from map…', 'info', 2500)
      try {
        // Quick query around 350m for explicit place_of_worship
        const bounds = {
          south: lat - 0.0035,
          north: lat + 0.0035,
          west: lng - 0.0035,
          east: lng + 0.0035,
        }
        let results = []
        try {
          results = await fetchOSMTemples(bounds, 5)
        } catch {}

        if (results.length > 0) {
          const matched = results[0]
          setOsmTemples((prev) => {
            const ids = new Set(prev.map((p) => p.id))
            const added = results.filter((r) => !ids.has(r.id))
            return [...prev, ...added]
          })
          onAddDiscoveredTemples?.(results)
          onSelectTemple?.(matched)
          showMessage(`✨ Selected "${matched.name}" from Google Maps!`, 'info', 4000)
          return
        }

        // 3. Reverse geocode via Nominatim to get the exact location name on Google Maps
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: { 'Accept-Language': 'en' },
            signal: controller.signal,
          }
        )
        clearTimeout(timeoutId)

        if (res.ok) {
          const data = await res.json()
          if (data && (data.name || data.display_name)) {
            let title = data.name || data.display_name.split(',')[0]
            if (
              !title.toLowerCase().includes('mandir') &&
              !title.toLowerCase().includes('temple') &&
              !title.toLowerCase().includes('shrine')
            ) {
              title = `${title} Mandir`
            }

            const state = data.address?.state || data.address?.province || ''
            const country = data.address?.country || 'India'

            const inferDeityFromName = (n) => {
              const lower = n.toLowerCase()
              if (lower.includes('shiva') || lower.includes('mahadev') || lower.includes('bheruji') || lower.includes('bhairo') || lower.includes('nath') || lower.includes('harshnath')) return 'Shiva'
              if (lower.includes('krishna') || lower.includes('shyam') || lower.includes('ram') || lower.includes('balaji') || lower.includes('vishnu') || lower.includes('narayan') || lower.includes('goga')) return 'Vishnu'
              if (lower.includes('mata') || lower.includes('devi') || lower.includes('jeen') || lower.includes('durga') || lower.includes('shakti') || lower.includes('chamunda')) return 'Goddess'
              if (lower.includes('ganesh') || lower.includes('vinayak')) return 'Ganesh'
              if (lower.includes('hanuman') || lower.includes('maruti')) return 'Hanuman'
              return 'Hindu'
            }

            const clickedShrine = {
              id: `map-select-${lat.toFixed(5)}-${lng.toFixed(5)}`,
              name: title,
              lat: Number(lat.toFixed(5)),
              lng: Number(lng.toFixed(5)),
              state,
              country,
              deity: inferDeityFromName(title),
              period: 'Sacred Site',
              circuit_tags: ['Local Shrine'],
              description: `Sacred shrine location selected from map near ${data.display_name}.`,
              isOSM: true,
              isMapClicked: true,
            }

            setOsmTemples((prev) => [clickedShrine, ...prev])
            onAddDiscoveredTemples?.([clickedShrine])
            onSelectTemple?.(clickedShrine)
            showMessage(`✨ Selected "${title}" from Google Maps!`, 'info', 4000)
          }
        }
      } catch {
        showMessage('Could not identify shrine at this exact point. Try tapping near the marker.', 'info', 3500)
      }
    },
    [mapTemples, osmTemples, onSelectTemple, onAddDiscoveredTemples]
  )

  // Map tile style state (defaults to Google Roadmap with clean English labels & Indian perspective)
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      const saved = localStorage.getItem('divine-india-map-style')
      if (!saved || saved === 'terrain') {
        localStorage.setItem('divine-india-map-style', 'roadmap')
        return 'roadmap'
      }
      return MAP_STYLES[saved] ? saved : 'roadmap'
    } catch {
      return 'roadmap'
    }
  })
  const [isLayersOpen, setIsLayersOpen] = useState(false)
  const layersRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem('divine-india-map-style', mapStyle)
    } catch {}
  }, [mapStyle])

  // Click outside listener for layers dropdown
  useEffect(() => {
    if (!isLayersOpen) return
    const handleClickOutside = (e) => {
      if (layersRef.current && !layersRef.current.contains(e.target)) {
        setIsLayersOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isLayersOpen])

  const currentStyle = MAP_STYLES[mapStyle] || MAP_STYLES.roadmap

  // Positions array for glowing pilgrimage circuit polyline (null-safe)
  const circuitPositions = useMemo(() => {
    if (!activeCircuit || !circuitTemples || circuitTemples.length < 2) return []
    const valid = circuitTemples
      .filter((t) => t && t.lat != null && t.lng != null && !isNaN(t.lat) && !isNaN(t.lng))
      .map((t) => [t.lat, t.lng])
    if (valid.length > 2) {
      return [...valid, valid[0]] // Complete sacred pradakshina garland loop
    }
    return valid
  }, [activeCircuit, circuitTemples])

  // Active leg segment between selected shrine and the next shrine
  const activeSegmentPositions = useMemo(() => {
    if (!activeCircuit || !circuitTemples || circuitTemples.length < 2 || !selectedTemple) return null
    const curIdx = circuitTemples.findIndex((t) => t.id === selectedTemple.id)
    if (curIdx === -1) return null
    const current = circuitTemples[curIdx]
    const next = circuitTemples[(curIdx + 1) % circuitTemples.length]
    if (current && next && current.lat != null && current.lng != null && next.lat != null && next.lng != null) {
      return [[current.lat, current.lng], [next.lat, next.lng]]
    }
    return null
  }, [activeCircuit, circuitTemples, selectedTemple])

  // Drag handler for user location pin
  const handleUserMarkerDragEnd = useCallback(
    (e) => {
      const marker = e.target
      if (marker != null) {
        const pos = marker.getLatLng()
        onUpdateUserLocation?.({
          lat: Number(pos.lat.toFixed(4)),
          lng: Number(pos.lng.toFixed(4)),
          isManual: true,
        })
      }
    },
    [onUpdateUserLocation]
  )

  return (
    <>
      <MapContainer
        center={INDIA_CENTER}
        zoom={DEFAULT_ZOOM}
        maxZoom={20}
        zoomControl={false}
        className="w-full h-full"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Active Tile layer: Defaults to Google Terrain/Roadmap with hl=en & gl=IN (all English names, official Indian boundaries) */}
        <TileLayer
          key={`${theme}-${currentStyle.id}`}
          url={currentStyle.url}
          attribution={currentStyle.attribution}
          subdomains={currentStyle.subdomains}
          maxZoom={currentStyle.maxZoom}
          maxNativeZoom={currentStyle.nativeMaxZoom ?? currentStyle.maxZoom}
          className={currentStyle.supportsDarkFilter && theme === 'dark' ? 'dark-map-filter' : ''}
        />

        {/* Official Survey of India International Boundary Overlay (encloses J&K, Ladakh, PoK & CoK / Aksai Chin) */}
        {indiaBoundaryData && (
          <>
            {/* Outer subtle glow/casing to ensure high contrast against both dark and light tiles */}
            <GeoJSON
              key={`india-boundary-casing-${theme}-${currentStyle.id}`}
              data={indiaBoundaryData}
              style={() => ({
                color: theme === 'dark' ? '#FF9933' : '#B84E00',
                weight: 4.5,
                opacity: theme === 'dark' ? 0.35 : 0.22,
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false,
              })}
              interactive={false}
            />
            {/* Core crisp international border (Survey of India standard dash-dot delineation) */}
            <GeoJSON
              key={`india-boundary-core-${theme}-${currentStyle.id}`}
              data={indiaBoundaryData}
              style={() => ({
                color: theme === 'dark' ? '#FFD700' : '#854800',
                weight: 2.2,
                opacity: 0.95,
                dashArray: '10, 5, 2, 5',
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false,
              })}
              interactive={false}
            />
          </>
        )}

        {/* Custom positioned ZoomControl at bottom-right */}
        <ZoomControl position="bottomright" />

        {/* Smooth camera flyTo on temple selection or user location */}
        {flyTarget && flyTarget.center && <FlyToController target={flyTarget} />}

        {/* Track map bounds */}
        <BoundsWatcher onBoundsChange={setMapBounds} />

        {/* Click on any temple / location on map to select and take darshan */}
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Draggable User Current Location Marker with Note */}
        {userLocation && userLocation.lat != null && userLocation.lng != null && (
          <Marker
            key="user-current-location"
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            draggable={true}
            zIndexOffset={4000}
            eventHandlers={{
              dragend: handleUserMarkerDragEnd,
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -28]}
              opacity={1}
              permanent={false}
              className="custom-temple-tooltip"
            >
              <div className="temple-tooltip-bubble !px-3 !py-1.5 flex items-center justify-center gap-1.5 font-bold text-xs font-sans text-sky-500 shadow-xl border border-sky-500/40">
                <span>📍 Your Location</span>
              </div>
            </Tooltip>
          </Marker>
        )}

        {/* Pilgrimage Circuit Golden Path Polyline */}
        {circuitPositions.length > 1 && (
          <>
            {/* Glowing ambient outer glow */}
            <Polyline
              positions={circuitPositions}
              pathOptions={{
                color: '#FF9933',
                weight: 9,
                opacity: 0.28,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Pulsing dashed golden sacred route */}
            <Polyline
              positions={circuitPositions}
              pathOptions={{
                color: '#FFD700',
                weight: 3.5,
                opacity: 0.95,
                dashArray: '10, 10',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Vibrant active leg from current shrine to next shrine */}
            {activeSegmentPositions && (
              <>
                <Polyline
                  positions={activeSegmentPositions}
                  pathOptions={{
                    color: '#FF5722',
                    weight: 7,
                    opacity: 0.45,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={activeSegmentPositions}
                  pathOptions={{
                    color: '#FFF5E0',
                    weight: 3.2,
                    opacity: 1,
                    dashArray: '6, 8',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </>
            )}
          </>
        )}

        {/* Clustered curated temple markers with spiderfy on max zoom */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          spiderfyDistanceMultiplier={1.8}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          disableClusteringAtZoom={10}
          animate={true}
        >
          {nonCircuitTemples
            .filter((temple) => temple.id !== selectedTemple?.id)
            .map((temple) => {
              return (
                <Marker
                  key={temple.id}
                  position={[temple.lat, temple.lng]}
                  icon={defaultIcon}
                  zIndexOffset={1}
                  eventHandlers={{
                    click: () => onSelectTemple?.(temple),
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -56]}
                    opacity={1}
                    className="custom-temple-tooltip"
                  >
                    <TempleTooltipContent
                      temple={temple}
                      activeImage={null}
                      userLocation={userLocation}
                    />
                  </Tooltip>
                </Marker>
              )
            })}
        </MarkerClusterGroup>

        {/* Active Circuit Shrines — ALWAYS UNCLUSTERED as prominent numbered stops */}
        {activeCircuit &&
          circuitTemples
            .filter((t) => t && t.lat != null && t.lng != null && !isNaN(t.lat) && !isNaN(t.lng))
            .map((temple, idx) => {
              const isSelected = selectedTemple?.id === temple.id
              const isVisited = visitedIds ? visitedIds.has(temple.id) : false
              const stopIcon = createCircuitStopIcon({
                stopNumber: idx + 1,
                isVisited,
                isActive: isSelected,
                isLight: theme === 'light',
              })

              return (
                <Marker
                  key={`circuit-stop-${temple.id}`}
                  position={[temple.lat, temple.lng]}
                  icon={stopIcon}
                  zIndexOffset={isSelected ? 3500 : 1500}
                  eventHandlers={{
                    click: () => onSelectTemple?.(temple),
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, isSelected ? -52 : -44]}
                    opacity={1}
                    permanent={isSelected}
                    className="custom-temple-tooltip"
                  >
                    <TempleTooltipContent
                      temple={temple}
                      activeImage={isSelected ? activeTempleImage : null}
                      userLocation={userLocation}
                    />
                  </Tooltip>
                </Marker>
              )
            })}

        {/* Dedicated active selected marker when not in circuit tour */}
        {!activeCircuit &&
          selectedTemple &&
          selectedTemple.lat != null &&
          selectedTemple.lng != null &&
          !isNaN(selectedTemple.lat) &&
          !isNaN(selectedTemple.lng) && (
            <Marker
              key={`active-selected-${selectedTemple.id}`}
              position={[selectedTemple.lat, selectedTemple.lng]}
              icon={selectedTemple.isOSM ? activeOsmIcon : activeIcon}
              zIndexOffset={3000}
              eventHandlers={{
                click: () => onSelectTemple?.(selectedTemple),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -64]}
                opacity={1}
                permanent={true}
                className="custom-temple-tooltip"
              >
                <TempleTooltipContent
                  temple={selectedTemple}
                  activeImage={activeTempleImage}
                  userLocation={userLocation}
                />
              </Tooltip>
            </Marker>
          )}

        {/* OSM discovery markers (null-safe) */}
        {osmTemples
          .filter((t) => t && t.lat != null && t.lng != null && !isNaN(t.lat) && !isNaN(t.lng))
          .map((t) => {
            const isSelected = selectedTemple?.id === t.id

            return (
              <Marker
                key={t.id}
                position={[t.lat, t.lng]}
                icon={isSelected ? activeOsmIcon : osmIcon}
                zIndexOffset={isSelected ? 1000 : 1}
                eventHandlers={{
                  click: () => onSelectTemple?.(t),
                }}
              >
                {!isSelected && (
                  <Tooltip
                    direction="top"
                    offset={[0, -42]}
                    opacity={1}
                    className="custom-temple-tooltip"
                  >
                    <TempleTooltipContent
                      temple={t}
                      activeImage={null}
                      userLocation={userLocation}
                    />
                  </Tooltip>
                )}
              </Marker>
            )
          })}
      </MapContainer>

      {/* ── Floating Notification Toast for Map Inspection & Radar ── */}
      <AnimatePresence>
        {osmMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-16 sm:top-14 left-1/2 -translate-x-1/2 z-[1003] glass-strong rounded-2xl px-4 py-2 text-xs font-sans font-bold text-center shadow-2xl border ${
              osmMessageType === 'error'
                ? 'text-red-400 border-red-500/40 bg-red-950/40'
                : 'text-amber-400 border-saffron/40 bg-amber-950/40'
            }`}
          >
            {osmMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Map Style Switcher (docked cleanly above bottom-right ZoomControl) ── */}
      <div
        ref={layersRef}
        className="fixed bottom-[138px] sm:bottom-[132px] right-3 sm:right-4 z-[996] flex flex-col items-end pointer-events-auto"
      >
        <AnimatePresence>
          {isLayersOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.18 }}
              className="glass-strong rounded-2xl p-2 mb-2 shadow-2xl border border-[var(--border-gold)] min-w-[210px]"
            >
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider font-cinzel theme-gold flex items-center justify-between border-b border-[var(--border-gold)]/40 pb-1.5 mb-1">
                <span>Map View</span>
                <span className="text-[9px] text-saffron normal-case font-sans font-semibold">English (IN)</span>
              </div>
              <div className="space-y-1">
                {Object.values(MAP_STYLES).map((s) => {
                  const isSelected = mapStyle === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setMapStyle(s.id)
                        setIsLayersOpen(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-sans transition-all text-left ${
                        isSelected
                          ? 'bg-saffron/20 border border-saffron/40 text-saffron font-bold shadow-sm'
                          : 'theme-title hover:bg-white/10 dark:hover:bg-white/5 border border-transparent font-medium'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{s.icon}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="leading-tight font-semibold">{s.label}</span>
                        <span className="text-[9.5px] theme-muted truncate">{s.description}</span>
                      </div>
                      {isSelected && <span className="text-saffron font-bold text-xs">✓</span>}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setIsLayersOpen((prev) => !prev)}
          className={`glass-strong p-2.5 rounded-xl theme-title hover:text-saffron shadow-xl border border-[var(--border-gold)] transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 ${
            isLayersOpen ? 'ring-2 ring-saffron/60 text-saffron' : ''
          }`}
          title="Change Map Style (Terrain, Roadmap, Satellite)"
          aria-label="Map style layers"
        >
          <LayersIcon />
          <span className="hidden sm:inline text-[11px] font-sans font-bold theme-gold">
            {currentStyle.shortLabel}
          </span>
        </button>
      </div>
    </>
  )
}
