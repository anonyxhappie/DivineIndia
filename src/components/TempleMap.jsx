import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchOSMTemples } from '../api/overpassService'
import { fetchTempleDetails } from '../api/wikipediaService'
import { calculateDistance, formatDistance } from '../utils/geoUtils'

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
  const scale = isActive ? 1.35 : 1

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52"
         style="filter: drop-shadow(${glow}); transform: scale(${scale});">
      <path d="M20 2 L8 22 L12 22 L12 38 L28 38 L28 22 L32 22 Z"
            fill="#FF9933" stroke="#D4AF37" stroke-width="1.2" opacity="0.95"/>
      <rect x="16" y="26" width="8" height="12" rx="1" fill="#D4AF37" opacity="0.85"/>
      <ellipse cx="20" cy="6" rx="3" ry="5" fill="#FFD700" opacity="0.95"/>
      <ellipse cx="20" cy="5" rx="1.5" ry="3" fill="#FFF5E0" opacity="0.98"/>
      <rect x="10" y="38" width="20" height="4" rx="1" fill="#D4AF37" opacity="0.9"/>
      <path d="M18 42 L20 50 L22 42" fill="#FF9933" opacity="0.95"/>
    </svg>`

  return L.divIcon({
    html: svg,
    className: `temple-marker ${isActive ? 'temple-marker-active' : 'diya-pulse'}`,
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  })
}

function createOSMIcon(isActive = false) {
  const scale = isActive ? 1.3 : 1
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" width="28" height="38"
         style="filter: drop-shadow(0 0 10px rgba(74,222,195,0.8)); transform: scale(${scale});">
      <path d="M14 2 L5 16 L8 16 L8 28 L20 28 L20 16 L23 16 Z"
            fill="#4ADEC3" stroke="#2DD4A8" stroke-width="1.2" opacity="0.9"/>
      <rect x="11" y="19" width="6" height="9" rx="1" fill="#2DD4A8" opacity="0.75"/>
      <ellipse cx="14" cy="5" rx="2" ry="3.5" fill="#7FFFDC" opacity="0.9"/>
      <rect x="7" y="28" width="14" height="3" rx="1" fill="#2DD4A8" opacity="0.8"/>
      <path d="M12 31 L14 37 L16 31" fill="#4ADEC3" opacity="0.9"/>
    </svg>`

  return L.divIcon({
    html: svg,
    className: 'osm-marker',
    iconSize: [28, 38],
    iconAnchor: [14, 37],
    popupAnchor: [0, -37],
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Temple Card Tooltip Component with Image & Distance
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TempleTooltipContent({ temple, activeImage, userLocation }) {
  const deityEmoji = DEITY_EMOJIS[temple.deity] || '🛕'
  const imgUrl = activeImage || temple.image_url || null

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
  userLocation = null,
  onUpdateUserLocation = null,
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

  // Active temple image state for the floating map card
  const [activeTempleImage, setActiveTempleImage] = useState(null)

  useEffect(() => {
    if (!selectedTemple) {
      setActiveTempleImage(null)
      return
    }

    if (selectedTemple.image_url) {
      setActiveTempleImage(selectedTemple.image_url)
      return
    }

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
      }
    } catch (err) {
      showMessage(err.message || 'Overpass servers are busy. Please zoom in closer and retry.', 'error', 5500)
    } finally {
      setOsmLoading(false)
    }
  }, [mapBounds])

  const clearOSMResults = useCallback(() => {
    setOsmTemples([])
    setOsmMessage(null)
  }, [])

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  // Positions array for glowing pilgrimage circuit polyline (null-safe)
  const circuitPositions = useMemo(() => {
    if (!activeCircuit || !circuitTemples || circuitTemples.length < 2) return []
    return circuitTemples
      .filter((t) => t && t.lat != null && t.lng != null && !isNaN(t.lat) && !isNaN(t.lng))
      .map((t) => [t.lat, t.lng])
  }, [activeCircuit, circuitTemples])

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
        zoomControl={false}
        className="w-full h-full"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Theme Tile layer */}
        <TileLayer
          key={theme}
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          subdomains="abc"
          maxZoom={19}
          className={theme === 'dark' ? 'dark-map-filter' : ''}
        />

        {/* Custom positioned ZoomControl at bottom-right */}
        <ZoomControl position="bottomright" />

        {/* Smooth camera flyTo on temple selection or user location */}
        {flyTarget && flyTarget.center && <FlyToController target={flyTarget} />}

        {/* Track map bounds */}
        <BoundsWatcher onBoundsChange={setMapBounds} />

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
                weight: 8,
                opacity: 0.3,
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
                dashArray: '10, 12',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
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
          {mapTemples.map((temple) => {
            const isSelected = selectedTemple?.id === temple.id

            return (
              <Marker
                key={temple.id}
                position={[temple.lat, temple.lng]}
                icon={isSelected ? activeIcon : defaultIcon}
                zIndexOffset={isSelected ? 1000 : 1}
                eventHandlers={{
                  click: () => onSelectTemple?.(temple),
                }}
              >
                {!isSelected && (
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
                )}
              </Marker>
            )
          })}
        </MarkerClusterGroup>

        {/* Dedicated active selected marker (always in foreground with pulsing Shikhara pin + floating image card) */}
        {selectedTemple &&
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
                offset={[0, -62]}
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

      {/* ── Scan Region Controls (bottom-center when not in tour mode) ── */}
      {!activeCircuit && (
        <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-[997] flex flex-col items-center gap-2 max-w-[92vw]">
          <AnimatePresence>
            {osmMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`glass-strong rounded-xl px-4 py-2 text-xs font-sans text-center shadow-lg ${
                  osmMessageType === 'error'
                    ? 'text-red-500 border-red-500/30'
                    : 'theme-gold border-soft-gold/30'
                }`}
              >
                {osmMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <motion.button
              onClick={handleScanRegion}
              disabled={osmLoading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="glass-strong rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2
                         text-xs sm:text-sm font-semibold font-sans
                         text-emerald-600 dark:text-emerald-400 hover:scale-105
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-xl"
            >
              {osmLoading ? <SpinnerIcon /> : <RadarIcon />}
              {osmLoading ? 'Scanning Region…' : 'Scan This Region (OSM)'}
            </motion.button>

            {osmTemples.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <span className="glass rounded-lg px-3 py-2 text-xs font-sans text-emerald-600 dark:text-emerald-400 font-semibold">
                  🗺️ {osmTemples.length} temple{osmTemples.length !== 1 ? 's' : ''} found
                </span>
                <button
                  onClick={clearOSMResults}
                  className="glass rounded-lg p-2 theme-muted hover:text-red-500 transition-colors"
                  title="Clear OSM results"
                >
                  <ClearIcon />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
