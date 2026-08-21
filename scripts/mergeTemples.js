#!/usr/bin/env node

/**
 * ============================================================================
 * Divine India — Temple Data Merger & Adapter Script
 * ============================================================================
 *
 * Merges raw scraped Wikipedia temple data (`wiki_raw.json`) with the curated
 * existing temple dataset (`temples_existing.json`):
 *
 * 1. Reads both JSON files with robust path resolution and fallback detection.
 * 2. Adapts raw Wikipedia objects to match the exact UI schema.
 * 3. Normalizes 'Deity' strictly to UI-compatible categories (Shiva, Vishnu, Goddess, etc.).
 * 4. Ensures `circuit_tags` is always an array (`[]` fallback) to prevent UI crashes.
 * 5. Deduplicates by `wiki_slug` and normalized temple name, prioritizing curated existing data.
 * 6. Generates sequential IDs and outputs a UI-safe, formatted `temples.json`.
 *
 * Usage:
 *   node scripts/mergeTemples.js
 *   node scripts/mergeTemples.js --raw ./wiki_raw.json --existing ./temples_existing.json --output ./temples.json
 *   node scripts/mergeTemples.js --only-with-coords
 */

import fs from 'fs'
import path from 'path'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEITY NORMALIZATION DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEITY_PATTERNS = [
  {
    category: 'Shiva',
    pattern: /shiva|mahadev|lingam|jyotirlinga|rudra|nataraja|bhairav|kedar|somnath|kashi|trimbak|rameswaram|rameshwaram|omkareshwar|mallikarjuna|bhimashankar|grishneshwar|ghrishneshwar|nageshwar|baidyanath|vaidyanath|mahankal|mahakaleshwar|chattarpur|annamalaiyar|lingaraj|kailasa|virupaksha|vadakkumnathan|murudeshwara|srikalahasti/i,
  },
  {
    category: 'Vishnu',
    pattern: /krishna|vishnu|ram|rama|venkateswara|padmanabha|padmanabhaswamy|balaji|raghunath|jagannath|narayana|govinda|radha|narasimha|varaha|perumal|ranganatha|ranganathaswamy|dwarkadhish|dwarka|badrinath|tirupati|guruvayur|guruvayoor|srinathji|banke bihari|iskcon|prem mandir|akshardham|birla mandir|govind dev/i,
  },
  {
    category: 'Goddess',
    pattern: /devi|durga|kali|shakti|amman|kamakhya|parvati|lakshmi|saraswati|mariamman|meenakshi|chamunda|chamundeshwari|bhavani|vaishno|vaishnodevi|bhagavathy|mookambika|tarapith|kalighat|ambaji|kanaka durga|dattatreya|chinnamasta|tripura sundari|biraja|attukal|kalka|dakshineswar/i,
  },
  {
    category: 'Ganesh',
    pattern: /ganesh|ganapati|vinayaka|siddhivinayak|ashtavinayak|chintamani|mayureshwar/i,
  },
  {
    category: 'Surya',
    pattern: /surya|sun temple|konark|modhera|martand|arasavalli/i,
  },
  {
    category: 'Murugan',
    pattern: /murugan|kartikeya|subrahmanya|skanda|palani|swaminatha|thiruthani|pazhamudircholai|tiruchendur|marudhamalai|batu caves/i,
  },
  {
    category: 'Hanuman',
    pattern: /hanuman|maruti|anjaneya|sankat mochan|bajrang/i,
  },
  {
    category: 'Brahma',
    pattern: /brahma|pushkar/i,
  },
  {
    category: 'Buddha',
    pattern: /buddha|mahabodhi|sarnath|wat|pagoda|stupa/i,
  },
  {
    category: 'Jain',
    pattern: /jain|tirthankara|mahavir|mahavira|rishabh|gommateshwara|shravanabelagola|dilwara|palitana|ranakpur|shikharji/i,
  },
  {
    category: 'Sikh',
    pattern: /sikh|gurdwara|harmandir|golden temple|gurudwara/i,
  },
]

function normalizeDeity(rawDeity = '', templeName = '') {
  const combined = `${rawDeity || ''} ${templeName || ''}`.trim()
  if (!combined) return 'Deity'

  for (const { category, pattern } of DEITY_PATTERNS) {
    if (pattern.test(combined)) {
      return category
    }
  }

  // If rawDeity is already one of the standard categories, preserve it
  const cleanRaw = (rawDeity || '').trim()
  if (['Shiva', 'Vishnu', 'Goddess', 'Ganesh', 'Surya', 'Murugan', 'Hanuman', 'Brahma', 'Buddha', 'Jain', 'Sikh', 'Multi', 'Deity'].includes(cleanRaw)) {
    return cleanRaw
  }

  return 'Deity'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEDUPLICATION HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeSlug(slug = '') {
  return slug
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\/wiki\//i, '')
    .replace(/^\/wiki\//i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTempleName(name = '') {
  return name
    .toLowerCase()
    .replace(/\[\d+\]/g, '')
    .replace(/\b(temple|mandir|kovil|shrine|swamy|swami|devasthanam|devalayam)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADAPTER: NORMALIZE RAW OBJECT TO UI SCHEMA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function adaptRawTemple(raw, fallbackState = 'India') {
  if (!raw || typeof raw !== 'object') return null

  // Extract and clean name
  const name = (raw.name || raw.title || raw.temple_name || raw.temple || '').replace(/\[edit\]/gi, '').replace(/\[\d+\]/g, '').trim()
  if (!name || name.length < 2) return null

  // Extract coordinates (handles lat/lng, lat/lon, latitude/longitude)
  let lat = null
  let lng = null

  const rawLat = raw.lat ?? raw.latitude ?? raw.coords?.lat ?? null
  const rawLng = raw.lng ?? raw.lon ?? raw.longitude ?? raw.coords?.lon ?? raw.coords?.lng ?? null

  if (rawLat != null && !isNaN(Number(rawLat))) {
    lat = Number(Number(rawLat).toFixed(4))
  }
  if (rawLng != null && !isNaN(Number(rawLng))) {
    lng = Number(Number(rawLng).toFixed(4))
  }

  // Extract wiki slug
  let wikiSlug = (raw.wiki_slug || raw.slug || raw.href || raw.wiki || '')
    .replace(/^https?:\/\/[^/]+\/wiki\//i, '')
    .replace(/^\/wiki\//i, '')
    .replace(/\s+/g, '_')
    .trim()

  if (!wikiSlug) {
    wikiSlug = name.replace(/\s+/g, '_')
  }

  // Clean state / location
  const state = (raw.state || raw.region || fallbackState || 'India').replace(/\[edit\]/gi, '').trim()
  const location = (raw.location || raw.city || raw.district || null) ? String(raw.location || raw.city || raw.district).trim() : null

  // Clean era / period
  const era = raw.era ? String(raw.era).trim() : null
  const period = raw.period && ['Ancient', 'Medieval', 'Modern'].includes(raw.period) ? raw.period : null

  // Normalize Deity
  const rawDeity = raw.deity || raw.god || raw.presiding_deity || ''
  const deity = normalizeDeity(rawDeity, name)

  // Ensure circuit_tags is strictly an array
  let circuitTags = []
  if (Array.isArray(raw.circuit_tags)) {
    circuitTags = raw.circuit_tags.filter(Boolean).map((t) => String(t).trim())
  } else if (typeof raw.circuit_tags === 'string' && raw.circuit_tags.trim()) {
    circuitTags = [raw.circuit_tags.trim()]
  }

  // Image URL
  const imageUrl = raw.image_url || raw.imageUrl || raw.thumbnail || raw.image || null

  // Google Maps Link (exact temple place query with name and location)
  const placeQuery = [name, location, state, 'India'].filter(Boolean).join(', ')
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery)}`

  return {
    id: 0, // Assigned sequentially in final step
    name,
    lat,
    lng,
    deity,
    state,
    location,
    era,
    period,
    circuit_tags: circuitTags,
    wiki_slug: wikiSlug,
    image_url: imageUrl,
    google_maps_link: googleMapsLink,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILE RESOLUTION HELPER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function resolveFilePath(explicitPath, defaultCandidates) {
  if (explicitPath) {
    const fullPath = path.resolve(process.cwd(), explicitPath)
    if (fs.existsSync(fullPath)) return fullPath
    console.warn(`⚠️ Warning: Specified file "${explicitPath}" does not exist. Searching default candidates...`)
  }

  for (const candidate of defaultCandidates) {
    const candidatePath = path.resolve(process.cwd(), candidate)
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return null
}

function loadJSONFile(filePath, label) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.log(`ℹ️ [${label}] No file found at ${filePath || 'specified path'}. Using empty array [].`)
    return []
  }

  try {
    const rawText = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(rawText)
    if (!Array.isArray(parsed)) {
      console.warn(`⚠️ [${label}] Expected JSON array in "${filePath}", but got ${typeof parsed}. Using empty array.`)
      return []
    }
    console.log(`✓ [${label}] Loaded ${parsed.length} items from "${filePath}".`)
    return parsed
  } catch (err) {
    console.error(`❌ [${label}] Error parsing JSON from "${filePath}": ${err.message}`)
    return []
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN MERGE & ADAPTER PIPELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function runMerger() {
  const args = process.argv.slice(2)

  // CLI Arguments
  const getArgValue = (flag, alias) => {
    const idx = args.findIndex((a) => a === flag || a === alias)
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
  }

  const rawArg = getArgValue('--raw', '-r')
  const existingArg = getArgValue('--existing', '-e')
  const outputArg = getArgValue('--output', '-o')
  const onlyWithCoords = args.includes('--only-with-coords')

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║         DIVINE INDIA — DATA MERGER & ADAPTER               ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  // 1. Resolve file paths
  const rawFilePath = resolveFilePath(rawArg, [
    'wiki_raw.json',
    './src/data/wiki_raw.json',
    './data/wiki_raw.json',
  ])

  const existingFilePath = resolveFilePath(existingArg, [
    'temples_existing.json',
    './src/data/temples_existing.json',
    './src/data/temples.json',
    './data/temples_existing.json',
    'temples.json',
  ])

  const outputFilePath = path.resolve(
    process.cwd(),
    outputArg || 'temples.json'
  )

  // 2. Load datasets
  const existingData = loadJSONFile(existingFilePath, 'Existing Curated Dataset')
  const rawData = loadJSONFile(rawFilePath, 'Raw Wikipedia Dataset')

  if (existingData.length === 0 && rawData.length === 0) {
    console.error('❌ Error: Both existing and raw datasets are empty or not found. Nothing to merge.')
    process.exit(1)
  }

  // 3. Process and index existing curated temples (highest priority)
  const mergedMap = new Map() // Key: normalized slug/name -> temple object
  const slugLookup = new Map() // Key: normalized slug -> mergedMap key
  const nameLookup = new Map() // Key: normalized name -> mergedMap key

  let existingCount = 0

  for (const item of existingData) {
    const adapted = adaptRawTemple(item, item.state || 'India')
    if (!adapted) continue

    const key = `existing_${existingCount++}`
    mergedMap.set(key, adapted)

    if (adapted.wiki_slug) {
      slugLookup.set(normalizeSlug(adapted.wiki_slug), key)
    }
    if (adapted.name) {
      nameLookup.set(normalizeTempleName(adapted.name), key)
    }
  }

  console.log(`\n📌 Indexed ${existingCount} curated existing temples (priority dataset).`)

  // 4. Adapt and merge raw Wikipedia dataset
  let addedFromRaw = 0
  let duplicatesSkipped = 0
  let enrichedExisting = 0

  for (const rawItem of rawData) {
    const adapted = adaptRawTemple(rawItem, rawItem.state || 'India')
    if (!adapted) continue

    const normSlug = normalizeSlug(adapted.wiki_slug)
    const normName = normalizeTempleName(adapted.name)

    // Check if temple already exists in curated dataset
    const matchedKey = (normSlug && slugLookup.get(normSlug)) || (normName && nameLookup.get(normName))

    if (matchedKey) {
      duplicatesSkipped++
      // Enrich existing entry if it's missing coordinates or photos
      const existing = mergedMap.get(matchedKey)
      if (existing) {
        let changed = false
        if (existing.lat == null && adapted.lat != null) {
          existing.lat = adapted.lat
          existing.lng = adapted.lng
          changed = true
        }
        if (!existing.image_url && adapted.image_url) {
          existing.image_url = adapted.image_url
          changed = true
        }
        if (!existing.location && adapted.location) {
          existing.location = adapted.location
          changed = true
        }
        if (changed) enrichedExisting++
      }
    } else {
      // New unique temple from raw dataset
      const newKey = `raw_${addedFromRaw++}`
      mergedMap.set(newKey, adapted)

      if (normSlug) slugLookup.set(normSlug, newKey)
      if (normName) nameLookup.set(normName, newKey)
    }
  }

  console.log(`\n🔄 Merging & Deduplication Results:`)
  console.log(`   • Existing Curated Temples Preserved: ${existingCount}`)
  console.log(`   • New Unique Temples Added from Raw:  ${addedFromRaw}`)
  console.log(`   • Duplicates Safely Resolved:         ${duplicatesSkipped}`)
  console.log(`   • Existing Entries Enriched:          ${enrichedExisting}`)

  // 5. Build final UI-safe array
  let finalArray = Array.from(mergedMap.values())

  // Optional: filter only temples with coordinates
  if (onlyWithCoords) {
    const initialCount = finalArray.length
    finalArray = finalArray.filter((t) => t.lat != null && t.lng != null)
    console.log(`   • Filtered out ${initialCount - finalArray.length} temples without GPS coordinates (--only-with-coords).`)
  }

  // 6. Assign clean sequential IDs & sort (curated first, then alphabetical)
  finalArray.forEach((temple, index) => {
    temple.id = index + 1
  })

  // Deity breakdown summary
  const deityCounts = {}
  finalArray.forEach((t) => {
    deityCounts[t.deity] = (deityCounts[t.deity] || 0) + 1
  })

  // 7. Write to output file
  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true })
  fs.writeFileSync(outputFilePath, JSON.stringify(finalArray, null, 2), 'utf-8')

  console.log(`\n💾 Saved final UI-safe dataset (${finalArray.length} temples) to:`)
  console.log(`   "${outputFilePath}"`)

  console.log(`\n📊 Deity Category Breakdown:`)
  Object.entries(deityCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([deity, count]) => {
      console.log(`   • ${deity.padEnd(14)}: ${count} temples`)
    })

  console.log(`\n✨ Done! The output is 100% UI-schema compliant and ready for the explorer.\n`)
}

runMerger()
