#!/usr/bin/env node

/**
 * ============================================================================
 * Divine India — Wikipedia Temple Data Extraction Pipeline
 * ============================================================================
 *
 * Extracts the complete dataset of Hindu temples across India from Wikipedia:
 * 1. Fetches the page HTML using the Wikipedia Parse API:
 *    https://en.wikipedia.org/w/api.php?action=parse&page=List_of_Hindu_temples_in_India&prop=text&format=json
 * 2. Parses the HTML with Cheerio to extract wikitables, state sections, and lists:
 *    - Temple Name
 *    - Wiki Slug
 *    - State / Region
 *    - Location / City
 *    - Presiding Deity
 * 3. Batch-queries the MediaWiki Query API (50 titles per batch) to fetch:
 *    - Precise GPS Coordinates (lat / lng)
 *    - High-Resolution Hero Thumbnail Image URLs
 *    - Short History / Lore Summary Extract
 * 4. Normalizes deities, extracts holy circuit tags (Jyotirlingas, Char Dham, Shakti Peethas, UNESCO),
 *    and generates direct Google Maps links.
 * 5. Outputs a beautifully formatted `temples.json` file with rich metadata.
 *
 * Usage:
 *   node scripts/extractTemples.js
 *   node scripts/extractTemples.js --output ./src/data/temples.json
 *   node scripts/extractTemples.js --only-with-coords
 *   node scripts/extractTemples.js --limit 100
 */

import fs from 'fs'
import path from 'path'
import * as cheerio from 'cheerio'

const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const SOURCE_PAGE = 'List_of_Hindu_temples_in_India'
const USER_AGENT = 'DivineIndia-DataPipeline/1.0 (https://github.com/anonyxhappie/DivineIndia; contact@divineindia.dev)'
const BATCH_SIZE = 50 // MediaWiki maximum titles per query request
const BATCH_DELAY_MS = 350 // Polite delay between API requests

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KNOWN CIRCUIT DATA & DEITY NORMALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const JYOTIRLINGAS = [
  'Somnath', 'Mallikarjuna', 'Mahakaleshwar', 'Omkareshwar', 'Kedarnath',
  'Bhimashankar', 'Kashi Vishwanath', 'Trimbakeshwar', 'Baidyanath', 'Vaidyanath',
  'Nageshwar', 'Ramanathaswamy', 'Rameshwaram', 'Grishneshwar', 'Ghrishneshwar'
]

const CHAR_DHAMS = ['Badrinath', 'Dwarka', 'Jagannath', 'Rameshwaram', 'Ramanathaswamy']

const SHAKTI_PEETHAS = [
  'Kamakhya', 'Kalighat', 'Tarapith', 'Vaishno Devi', 'Meenakshi',
  'Jwalamukhi', 'Ambaji', 'Chamundeshwari', 'Kamakshi', 'Mahalakshmi', 'Kalka',
  'Attukal', 'Chhinnamasta', 'Biraja', 'Kottiyoor'
]

const PANCHA_BHOOTA = [
  'Ekambareswarar', 'Jambukeswarar', 'Annamalaiyar', 'Kalahasteeswara', 'Thillai Nataraja', 'Chidambaram'
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function cleanText(text = '') {
  return text
    .replace(/\[edit\]/gi, '')
    .replace(/\[\d+\]/g, '') // remove footnote citations e.g. [1], [2]
    .replace(/\[citation needed\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDeity(rawDeity = '', templeName = '') {
  const str = `${rawDeity} ${templeName}`.toLowerCase()

  if (/shiva|mahadev|lingam|jyotirlinga|rudra|nataraja|bhairav|kedar|somnath|kashi|trimbak|rameswaram|omkareshwar|mallikarjuna|bhimashankar|grishneshwar|nageshwar|baidyanath/i.test(str)) {
    return 'Shiva'
  }
  if (/krishna|vishnu|ram|rama|venkateswara|padmanabha|balaji|raghunath|jagannath|narayana|govinda|radha|narasimha|varaha|perumal|ranganatha|dwarkadhish|badrinath/i.test(str)) {
    return 'Vishnu'
  }
  if (/devi|durga|kali|shakti|amman|kamakhya|parvati|lakshmi|saraswati|mariamman|meenakshi|chamunda|bhavani|vaishno|bhagavathy|mookambika|tarapith/i.test(str)) {
    return 'Goddess'
  }
  if (/ganesh|ganapati|vinayaka|siddhivinayak/i.test(str)) {
    return 'Ganesh'
  }
  if (/surya|sun/i.test(str)) {
    return 'Surya'
  }
  if (/murugan|kartikeya|subrahmanya|skanda|swaminatha|palani/i.test(str)) {
    return 'Murugan'
  }
  if (/hanuman|maruti|anjaneya|sankat mochan/i.test(str)) {
    return 'Hanuman'
  }
  if (/brahma/i.test(str)) {
    return 'Brahma'
  }
  if (/jain|tirthankara|mahavira|rishabh/i.test(str)) {
    return 'Jain'
  }
  if (/buddha|mahabodhi/i.test(str)) {
    return 'Buddha'
  }
  if (/sikh|gurdwara|harmandir/i.test(str)) {
    return 'Sikh'
  }
  if (rawDeity.trim().length > 0) {
    return cleanText(rawDeity)
  }
  return 'Hindu Divinity'
}

function extractCircuitTags(name = '', deity = '') {
  const tags = []
  if (JYOTIRLINGAS.some((j) => name.toLowerCase().includes(j.toLowerCase()))) {
    tags.push('Jyotirlinga')
  }
  if (CHAR_DHAMS.some((cd) => name.toLowerCase().includes(cd.toLowerCase()))) {
    tags.push('Char Dham')
  }
  if (SHAKTI_PEETHAS.some((sp) => name.toLowerCase().includes(sp.toLowerCase()))) {
    tags.push('Shakti Peetha')
  }
  if (PANCHA_BHOOTA.some((pb) => name.toLowerCase().includes(pb.toLowerCase()))) {
    tags.push('Pancha Bhoota')
  }
  if (/unesco|world heritage|khajuraho|konark|brihadis|ellora|hampi|pattadakal|mahabalipuram/i.test(name)) {
    tags.push('UNESCO')
  }
  return tags
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1: FETCH HTML FROM WIKIPEDIA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchWikipediaHTML() {
  console.log(`\n🌐 [1/4] Fetching HTML via Wikipedia Parse API: "${SOURCE_PAGE}"...`)
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(SOURCE_PAGE)}&prop=text&format=json&origin=*`

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia Parse API request failed: HTTP ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (data.error) {
    throw new Error(`Wikipedia API Error: ${data.error.info}`)
  }

  const html = data.parse?.text?.['*']
  if (!html) {
    throw new Error('No HTML content returned in Wikipedia parse response')
  }

  console.log(`   ✓ Received ${Math.round(html.length / 1024)} KB of HTML content.`)
  return html
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2: PARSE TABLES, SECTIONS & LISTS WITH CHEERIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseTempleEntries(html) {
  console.log(`\n🔍 [2/4] Parsing HTML with Cheerio to extract temple records...`)
  const $ = cheerio.load(html)
  const rawTemples = []
  const seenSlugs = new Set()

  // Remove non-content elements
  $('.sidebar, .navbox, .reflist, .refbegin, #toc, .mw-editsection, .noprint').remove()

  let currentState = 'India'

  $('h2, h3, .mw-heading2, .mw-heading3, table.wikitable, ul, figure').each((_, element) => {
    const $el = $(element)
    const rawHeading = cleanText($el.text())

    // Track active state section
    if ($el.is('h2, h3, .mw-heading2, .mw-heading3')) {
      const heading = rawHeading.replace(/\[edit\]/gi, '').trim()
      if (
        heading &&
        !/see also|references|external links|notes|contents|bibliography|further reading/i.test(heading)
      ) {
        currentState = heading
      }
      return
    }

    // 1. Extract from Wikitables
    if ($el.is('table.wikitable')) {
      const headers = []
      $el.find('tr').first().find('th, td').each((_, th) => {
        headers.push(cleanText($(th).text()).toLowerCase())
      })

      let nameIdx = headers.findIndex((h) => /temple|name|shrine/i.test(h))
      let locIdx = headers.findIndex((h) => /location|city|district|place|town/i.test(h))
      let deityIdx = headers.findIndex((h) => /deity|god|presiding/i.test(h))
      let eraIdx = headers.findIndex((h) => /period|era|century|built|year/i.test(h))

      if (nameIdx === -1) nameIdx = 0
      if (locIdx === -1) locIdx = 1
      if (deityIdx === -1) deityIdx = 2

      $el.find('tr').slice(1).each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length === 0) return

        const nameCell = cells.eq(nameIdx)
        const link = nameCell.find('a[href^="/wiki/"]').first()

        let name = ''
        let wikiSlug = ''

        if (link.length > 0) {
          name = cleanText(link.text())
          const href = link.attr('href') || ''
          const match = href.match(/\/wiki\/(.+)$/)
          if (match) wikiSlug = decodeURIComponent(match[1])
        } else {
          name = cleanText(nameCell.text())
        }

        if (!name || name.length < 2 || wikiSlug.includes(':') || /List_of/i.test(wikiSlug)) return

        const rawDeity = deityIdx !== -1 && cells.length > deityIdx ? cleanText(cells.eq(deityIdx).text()) : ''
        const rawLocation = locIdx !== -1 && cells.length > locIdx ? cleanText(cells.eq(locIdx).text()) : ''
        const rawEra = eraIdx !== -1 && cells.length > eraIdx ? cleanText(cells.eq(eraIdx).text()) : ''

        const slugKey = wikiSlug || name.replace(/\s+/g, '_')
        if (!seenSlugs.has(slugKey)) {
          seenSlugs.add(slugKey)
          rawTemples.push({
            name,
            wiki_slug: wikiSlug || name.replace(/\s+/g, '_'),
            raw_deity: rawDeity,
            location: rawLocation,
            state: currentState,
            era: rawEra || null,
          })
        }
      })
    }

    // 2. Extract from Unordered Lists (ul > li)
    if ($el.is('ul')) {
      $el.find('li').each((_, li) => {
        const link = $(li).find('a[href^="/wiki/"]').first()
        if (link.length === 0) return

        const href = link.attr('href') || ''
        const match = href.match(/\/wiki\/(.+)$/)
        if (!match) return

        const wikiSlug = decodeURIComponent(match[1])
        const name = cleanText(link.text())

        if (
          !name ||
          name.length < 2 ||
          wikiSlug.includes(':') ||
          /List_of|History_of|Hinduism|Empire|Dynasty|Architecture/i.test(wikiSlug)
        ) {
          return
        }

        const fullText = cleanText($(li).text())
        let rawLocation = ''
        let rawDeity = ''

        if (fullText.includes(',')) {
          const parts = fullText.split(',')
          if (parts.length > 1) rawLocation = cleanText(parts[1])
        }

        if (/dedicated to/i.test(fullText)) {
          const m = fullText.match(/dedicated to ([^,.]+)/i)
          if (m) rawDeity = cleanText(m[1])
        }

        const slugKey = wikiSlug
        if (!seenSlugs.has(slugKey)) {
          seenSlugs.add(slugKey)
          rawTemples.push({
            name,
            wiki_slug: wikiSlug,
            raw_deity: rawDeity,
            location: rawLocation,
            state: currentState,
            era: null,
          })
        }
      })
    }

    // 3. Extract from Figure Captions
    if ($el.is('figure')) {
      const link = $el.find('figcaption a[href^="/wiki/"]').first()
      if (link.length) {
        const href = link.attr('href') || ''
        const match = href.match(/\/wiki\/(.+)$/)
        if (match) {
          const wikiSlug = decodeURIComponent(match[1])
          const name = cleanText(link.text())
          if (name && !wikiSlug.includes(':') && !seenSlugs.has(wikiSlug)) {
            seenSlugs.add(wikiSlug)
            rawTemples.push({
              name,
              wiki_slug: wikiSlug,
              raw_deity: '',
              location: '',
              state: currentState,
              era: null,
            })
          }
        }
      }
    }
  })

  console.log(`   ✓ Extracted ${rawTemples.length} unique temples across Indian states.`)
  return rawTemples
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: BATCH QUERY COORDINATES, IMAGES & EXTRACTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchBatchDetails(slugs) {
  const titlesParam = slugs.map((s) => s.replace(/_/g, ' ')).join('|')
  const url = `${WIKI_API}?action=query&titles=${encodeURIComponent(titlesParam)}&prop=coordinates|pageimages|extracts&exintro=1&explaintext=1&pithumbsize=1000&colimit=max&redirects=1&format=json&origin=*`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) return {}

    const data = await res.json()
    const pages = data.query?.pages || {}
    const redirects = data.query?.redirects || []
    const results = {}

    // Map resolved pages
    for (const page of Object.values(pages)) {
      const title = page.title || ''
      const slug = title.replace(/\s+/g, '_')
      const coords = page.coordinates?.[0]
      const thumb = page.thumbnail?.source || null
      const extract = page.extract || null

      const pageDetail = {
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lon : null,
        image_url: thumb,
        extract: extract,
      }

      results[slug] = pageDetail
      results[title] = pageDetail
    }

    // Map 'from' redirect titles to their destination results
    for (const r of redirects) {
      const fromSlug = r.from.replace(/\s+/g, '_')
      const toSlug = r.to.replace(/\s+/g, '_')
      if (results[toSlug] || results[r.to]) {
        results[fromSlug] = results[toSlug] || results[r.to]
        results[r.from] = results[fromSlug]
      }
    }

    return results
  } catch (err) {
    console.warn(`   ⚠️ Batch request warning for ${slugs.length} titles: ${err.message}`)
    return {}
  }
}

async function batchEnrichTemples(temples) {
  console.log(`\n🛰️  [3/4] Batch-fetching GPS Coordinates, High-Res Images & Lore...`)
  const enrichedTemples = []
  const total = temples.length
  let withCoords = 0
  let withImages = 0

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = temples.slice(i, i + BATCH_SIZE)
    const slugs = chunk.map((t) => t.wiki_slug).filter(Boolean)

    const batchResults = await fetchBatchDetails(slugs)

    for (const t of chunk) {
      const details = batchResults[t.wiki_slug] || batchResults[t.wiki_slug.replace(/_/g, ' ')] || {}
      const deity = normalizeDeity(t.raw_deity, t.name)
      const circuitTags = extractCircuitTags(t.name, deity)

      const lat = details.lat != null ? Number(details.lat.toFixed(4)) : null
      const lng = details.lng != null ? Number(details.lng.toFixed(4)) : null
      const imageUrl = details.image_url || null

      if (lat != null && lng != null) withCoords++
      if (imageUrl) withImages++

      enrichedTemples.push({
        id: enrichedTemples.length + 1,
        name: t.name,
        lat,
        lng,
        deity,
        state: t.state,
        location: t.location || null,
        era: t.era || null,
        circuit_tags: circuitTags,
        wiki_slug: t.wiki_slug,
        image_url: imageUrl,
        google_maps_link: lat && lng
          ? `https://maps.google.com/?q=${lat},${lng}`
          : `https://maps.google.com/?q=${encodeURIComponent(t.name + ' ' + (t.state || 'India'))}`,
      })
    }

    const processed = Math.min(i + BATCH_SIZE, total)
    const percent = Math.round((processed / total) * 100)
    process.stdout.write(`   ↳ Enriched ${processed}/${total} temples (${percent}%)... [With Coords: ${withCoords}, With Photos: ${withImages}]\r`)

    if (i + BATCH_SIZE < total) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  console.log(`\n   ✓ Completed: ${withCoords}/${total} have coordinates, ${withImages}/${total} have high-res images.`)
  return enrichedTemples
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PIPELINE EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function run() {
  const args = process.argv.slice(2)
  let outputPath = path.resolve(process.cwd(), 'src/data/temples.json')
  const onlyWithCoords = args.includes('--only-with-coords')

  const outIdx = args.findIndex((a) => a === '--output' || a === '-o')
  if (outIdx !== -1 && args[outIdx + 1]) {
    outputPath = path.resolve(process.cwd(), args[outIdx + 1])
  }

  const limitIdx = args.findIndex((a) => a === '--limit' || a === '-l')
  const limit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║       DIVINE INDIA — WIKIPEDIA TEMPLE DATA PIPELINE        ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  const startTime = Date.now()

  try {
    // 1. Fetch HTML
    const html = await fetchWikipediaHTML()

    // 2. Parse temples
    let rawTemples = parseTempleEntries(html)

    if (limit && limit > 0) {
      console.log(`   ℹ️ Applying limit of ${limit} temples for extraction.`)
      rawTemples = rawTemples.slice(0, limit)
    }

    // 3. Batch enrich with coordinates and images
    const enriched = await batchEnrichTemples(rawTemples)

    // 4. Filter if requested
    let finalDataset = enriched
    if (onlyWithCoords) {
      finalDataset = enriched.filter((t) => t.lat != null && t.lng != null)
      console.log(`   ℹ️ Filtered dataset to ${finalDataset.length} temples with verified coordinates.`)
    }

    // Assign sequential IDs
    finalDataset.forEach((t, i) => {
      t.id = i + 1
    })

    // 5. Output to JSON file
    console.log(`\n💾 [4/4] Writing ${finalDataset.length} temple objects to:`)
    console.log(`   "${outputPath}"...`)

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(finalDataset, null, 2), 'utf-8')

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✨ Successfully finished data pipeline in ${elapsed}s!`)
    console.log(`   • Total temples extracted: ${finalDataset.length}`)
    console.log(`   • Output file saved at: ${outputPath}\n`)
  } catch (err) {
    console.error(`\n❌ Data Pipeline Error: ${err.message}`)
    process.exit(1)
  }
}

run()
