/**
 * Community Edits, Contributions & Moderation Service for Divine India.
 *
 * Implements a Wikipedia-style approval workflow:
 * - Submissions start in 'pending' status.
 * - Maintainers can approve ('approved') or request changes ('rejected').
 * - Only approved items merge into the live canonical atlas by default.
 * - Contributors can toggle "Preview Drafts" to see their proposed shrines and photos live on the map.
 */

const STORAGE_KEY = 'divine-india-community-edits'
const GITHUB_REPO = 'anonyxhappie/DivineIndia'
const MAINTAINER_AUTH_KEY = 'divine-maintainer-session'
const MAINTAINER_TOKEN_KEY = 'divine-maintainer-gh-token'
const MAINTAINER_PROFILE_KEY = 'divine-maintainer-profile'

/**
 * Checks if the current browser session has maintainer authentication.
 */
export function isMaintainerAuthenticated() {
  try {
    if (typeof window === 'undefined') return false
    return (
      sessionStorage.getItem(MAINTAINER_AUTH_KEY) === 'true' ||
      localStorage.getItem(MAINTAINER_AUTH_KEY) === 'true'
    )
  } catch {
    return false
  }
}

/**
 * Returns the currently authenticated maintainer's GitHub profile if logged in.
 */
export function getMaintainerProfile() {
  try {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(MAINTAINER_PROFILE_KEY) || sessionStorage.getItem(MAINTAINER_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Authenticates maintainer directly with GitHub Personal Access Token (PAT).
 * Zero secrets in code: GitHub API validates repository push/admin permissions.
 * Only users who possess push/admin access to anonyxhappie/DivineIndia can unlock maintainer mode.
 */
export async function authenticateWithGitHubToken(token, rememberDevice = true) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'GitHub Personal Access Token is required.' }
  }
  const clean = token.trim()
  try {
    // 1. Verify user identity
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${clean}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { success: false, error: 'Invalid or expired GitHub token. Please verify token.' }
      }
      return { success: false, error: `GitHub user check failed (${userRes.status}).` }
    }
    const userData = await userRes.json()

    // 2. Verify repository push/admin permissions
    const repoRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: {
        Authorization: `Bearer ${clean}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!repoRes.ok) {
      return {
        success: false,
        error: `Could not access repository metadata (${repoRes.status}). Ensure token has "repo" scope.`,
      }
    }
    const repoData = await repoRes.json()

    const isOwner = userData.login?.toLowerCase() === 'anonyxhappie'
    const hasPush = Boolean(
      repoData.permissions?.push ||
      repoData.permissions?.admin ||
      isOwner
    )

    if (!hasPush) {
      return {
        success: false,
        error: `Access Denied: @${userData.login} does not have push permissions for ${GITHUB_REPO}. Only repository maintainers can approve edits.`,
      }
    }

    const profile = {
      login: userData.login,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
      verifiedAt: new Date().toISOString(),
    }

    sessionStorage.setItem(MAINTAINER_AUTH_KEY, 'true')
    sessionStorage.setItem(MAINTAINER_PROFILE_KEY, JSON.stringify(profile))

    if (rememberDevice) {
      localStorage.setItem(MAINTAINER_AUTH_KEY, 'true')
      localStorage.setItem(MAINTAINER_TOKEN_KEY, clean)
      localStorage.setItem(MAINTAINER_PROFILE_KEY, JSON.stringify(profile))
    } else {
      localStorage.removeItem(MAINTAINER_AUTH_KEY)
      localStorage.removeItem(MAINTAINER_TOKEN_KEY)
      localStorage.removeItem(MAINTAINER_PROFILE_KEY)
    }

    window.dispatchEvent(new CustomEvent('divine-india-community-updated'))
    return { success: true, user: profile }
  } catch (err) {
    return { success: false, error: `Network error connecting to GitHub: ${err.message}` }
  }
}

/**
 * Logs out of maintainer moderation mode.
 */
export function logoutMaintainer() {
  try {
    sessionStorage.removeItem(MAINTAINER_AUTH_KEY)
    sessionStorage.removeItem(MAINTAINER_PROFILE_KEY)
    localStorage.removeItem(MAINTAINER_AUTH_KEY)
    localStorage.removeItem(MAINTAINER_TOKEN_KEY)
    localStorage.removeItem(MAINTAINER_PROFILE_KEY)
    window.dispatchEvent(new CustomEvent('divine-india-community-updated'))
  } catch {}
}

/**
 * Uploads a base64 or blob image to a public CDN (tmpfiles.org) with CORS support.
 * Returns direct public HTTPS image URL or null.
 */
export async function uploadPhotoToPublicCdn(dataUrl, filename = 'shrine_photo.png') {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl
  }
  if (!dataUrl.startsWith('data:')) return null
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const formData = new FormData()
    formData.append('file', blob, filename)

    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
    })

    if (uploadRes.ok) {
      const json = await uploadRes.json()
      if (json?.data?.url) {
        // tmpfiles.org/XXXX -> direct link tmpfiles.org/dl/XXXX
        return json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
      }
    }
  } catch (err) {
    console.warn('[uploadPhotoToPublicCdn] Upload error:', err)
  }
  return null
}

/**
 * Copies an image dataUrl directly into the user's system clipboard as an image blob.
 * Enables instant pasting (Cmd+V / Ctrl+V) into GitHub issue comments.
 */
export async function copyImageDataUrlToClipboard(dataUrl) {
  if (typeof window === 'undefined' || !navigator.clipboard?.write) return false
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const item = new ClipboardItem({ [blob.type || 'image/png']: blob })
    await navigator.clipboard.write([item])
    return true
  } catch (err) {
    console.warn('[copyImageDataUrlToClipboard] Failed:', err)
    return false
  }
}

/**
 * Returns current community contributions from localStorage.
 * Structure: {
 *   edits: { [templeId]: { id, original, patch, updated, diff, status: 'pending'|'approved'|'rejected', ... } },
 *   newTemples: [ { id, name, status: 'pending'|'approved'|'rejected', photos: [...], ... } ],
 *   photos: [ { id, templeId, dataUrl, caption, contributor, status: 'pending'|'approved'|'rejected', ... } ]
 * }
 */
export function getCommunityEdits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { edits: {}, newTemples: [], photos: [] }
    const parsed = JSON.parse(raw)
    return {
      edits: parsed.edits || {},
      newTemples: Array.isArray(parsed.newTemples) ? parsed.newTemples : [],
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    }
  } catch (err) {
    console.warn('[communityEditsService] Failed to read edits:', err)
    return { edits: {}, newTemples: [], photos: [] }
  }
}

/**
 * Saves community edits to localStorage and notifies listeners.
 */
function persistCommunityEdits(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    // Dispatch custom event so reactive components update immediately
    window.dispatchEvent(new CustomEvent('divine-india-community-updated'))
    return true
  } catch (err) {
    console.error('[communityEditsService] Failed to write edits:', err)
    return false
  }
}

/**
 * Calculates differences between original and updated temple objects.
 * Strictly ignores immutable ID, photo arrays, and system fields.
 */
export function calculateTempleDiff(original, updated) {
  const diff = {}
  if (!original || !updated) return diff

  const ignoredKeys = new Set([
    'id', // Canonical ID is IMMUTABLE and never part of a diff
    'contributor_name',
    'edit_note',
    'updated_at',
    'created_at',
    'reviewed_at',
    'review_note',
    'moderationNotes',
    'isCommunityEdited',
    'isCommunityAdded',
    'isDraftPending',
    'status',
    'photos',
    'community_photos',
    'images',
  ])

  const editableKeys = [
    'name',
    'deity',
    'state',
    'location',
    'country',
    'lat',
    'lng',
    'era',
    'period',
    'circuit_tags',
    'wiki_slug',
    'image_url',
    'google_maps_link',
    'description',
    'timings',
    'festivals',
    'dress_code',
    'significance',
    'history',
    'contact_info',
    'entry_fee',
  ]

  for (const key of editableKeys) {
    if (ignoredKeys.has(key)) continue
    if (!(key in updated) || updated[key] === undefined) continue

    const origVal = original[key]
    const newVal = updated[key]

    // Ignore base64 data URLs in image_url when comparing against canonical URL
    if (key === 'image_url' && typeof newVal === 'string' && newVal.startsWith('data:')) {
      continue
    }

    if (key === 'circuit_tags') {
      const origArr = Array.isArray(origVal)
        ? origVal
        : typeof origVal === 'string'
        ? origVal.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const newArr = Array.isArray(newVal)
        ? newVal
        : typeof newVal === 'string'
        ? newVal.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      if (JSON.stringify(origArr.sort()) !== JSON.stringify(newArr.sort())) {
        diff[key] = { from: origArr, to: newArr }
      }
    } else if (key === 'lat' || key === 'lng') {
      const origNum = origVal != null && origVal !== '' ? Number(origVal) : null
      const newNum = newVal != null && newVal !== '' ? Number(newVal) : null
      if (newNum !== null && !isNaN(newNum) && (origNum === null || Math.abs(origNum - newNum) > 0.00001)) {
        diff[key] = { from: origVal, to: newNum }
      }
    } else {
      const strOrig = origVal != null ? String(origVal).trim() : ''
      const strNew = newVal != null ? String(newVal).trim() : ''
      if (strOrig !== strNew) {
        diff[key] = { from: origVal || '', to: newVal }
      }
    }
  }

  return diff
}

/**
 * Proposes a granular edit for an existing temple (starts in 'pending' status).
 * Saves ONLY the modified fields in `patch` to prevent overwriting untouched data.
 */
export function saveTempleEdit(templeId, original, updated, contributor = '', note = '', photos = []) {
  const data = getCommunityEdits()
  const diff = calculateTempleDiff(original, updated)

  // Extract granular patch containing ONLY the modified fields
  const patch = {}
  for (const [key, change] of Object.entries(diff)) {
    if (key !== 'id') {
      patch[key] = change.to
    }
  }

  // If nothing changed and no photos attached, return early
  if (Object.keys(patch).length === 0 && (!photos || photos.length === 0)) {
    return { success: false, reason: 'No field changes or photos detected' }
  }

  const existing = data.edits[templeId]

  const updatedRecord = {
    ...original,
    ...patch,
    id: templeId, // Guaranteed canonical ID
    isCommunityEdited: true,
    contributor_name: contributor.trim() || 'Anonymous Devotee',
    edit_note: note.trim(),
    updated_at: Date.now(),
    status: existing?.status === 'approved' ? 'approved' : 'pending',
    photos: photos || [],
  }

  data.edits[templeId] = {
    id: templeId,
    type: 'edit',
    original: { ...original },
    patch, // Granular delta: only the fields changed by contributor
    updated: updatedRecord,
    diff,
    status: existing?.status === 'approved' ? 'approved' : 'pending',
    timestamp: Date.now(),
    contributor: contributor.trim() || 'Anonymous Devotee',
    note: note.trim(),
    photos: photos || [],
  }

  persistCommunityEdits(data)
  return { success: true, edit: data.edits[templeId] }
}

/**
 * Proposes a brand new sacred shrine (starts in 'pending' status).
 */
export function saveNewCommunityTemple(templeData, contributor = '', note = '', photos = []) {
  const data = getCommunityEdits()
  const newId = `community_${Date.now()}`

  const heroPhoto = photos.find((p) => p.isHero) || photos[0]
  const imageUrl = heroPhoto ? heroPhoto.dataUrl : templeData.image_url || ''

  const newTemple = {
    ...templeData,
    id: newId,
    type: 'new_temple',
    country: templeData.country || 'India',
    isCommunityAdded: true,
    status: 'pending', // Wikipedia-style review queue
    contributor_name: contributor.trim() || 'Anonymous Devotee',
    edit_note: note.trim(),
    created_at: Date.now(),
    updated_at: Date.now(),
    circuit_tags: templeData.circuit_tags || ['Community Shrine'],
    image_url: imageUrl,
    photos: photos || [],
  }

  // Generate Google Maps link if missing
  if (!newTemple.google_maps_link && newTemple.lat && newTemple.lng) {
    newTemple.google_maps_link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${newTemple.name}, ${newTemple.state || ''}, ${newTemple.country}`
    )}`
  }

  data.newTemples.unshift(newTemple)
  persistCommunityEdits(data)
  return { success: true, temple: newTemple }
}

/**
 * Contributes a photo to an existing temple (starts in 'pending' status).
 */
export function saveTemplePhotoContribution(templeId, photoData, contributor = '', caption = '') {
  const data = getCommunityEdits()
  const photoId = `cphoto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  const photoEntry = {
    id: photoId,
    templeId,
    dataUrl: photoData.dataUrl || photoData,
    caption: caption.trim(),
    contributor: contributor.trim() || 'Anonymous Devotee',
    status: 'pending',
    timestamp: Date.now(),
    isHero: Boolean(photoData.isHero),
  }

  data.photos.unshift(photoEntry)
  persistCommunityEdits(data)
  return { success: true, photo: photoEntry }
}

/**
 * Moderation: Approves a pending contribution (edit, new temple, or photo).
 * STRICTLY MAINTAINER-ONLY: Requires authenticated maintainer session.
 * Supports both approveContribution(id, note) and approveContribution(type, id, note).
 */
export function approveContribution(idOrType, secondArg = 'Approved by maintainer', thirdArg) {
  if (!isMaintainerAuthenticated()) {
    console.warn('[communityEditsService] Unauthorized attempt to approve contribution. Maintainer access required.')
    return false
  }

  let targetId = idOrType
  let reviewNote = secondArg

  if (['edit', 'newTemple', 'temple', 'photo'].includes(idOrType) && secondArg) {
    targetId = secondArg
    reviewNote = thirdArg || 'Approved by maintainer'
  }

  const data = getCommunityEdits()
  let found = false

  // 1. Check edits
  if (data.edits[targetId]) {
    data.edits[targetId].status = 'approved'
    if (data.edits[targetId].updated) {
      data.edits[targetId].updated.status = 'approved'
      data.edits[targetId].updated.reviewed_at = Date.now()
      data.edits[targetId].updated.review_note = reviewNote
    }
    data.edits[targetId].reviewed_at = Date.now()
    data.edits[targetId].review_note = reviewNote
    found = true
  }

  // 2. Check new temples
  const newT = data.newTemples.find((t) => t.id === targetId)
  if (newT) {
    newT.status = 'approved'
    newT.reviewed_at = Date.now()
    newT.review_note = reviewNote
    found = true
  }

  // 3. Check photos
  const photo = data.photos.find((p) => p.id === targetId)
  if (photo) {
    photo.status = 'approved'
    photo.reviewed_at = Date.now()
    photo.review_note = reviewNote
    found = true
  }

  if (found) {
    persistCommunityEdits(data)
    return true
  }
  return false
}

/**
 * Moderation: Rejects a contribution with feedback note.
 * STRICTLY MAINTAINER-ONLY: Requires authenticated maintainer session.
 * Supports both rejectContribution(id, reason) and rejectContribution(type, id, reason).
 */
export function rejectContribution(idOrType, secondArg = 'Changes requested', thirdArg) {
  if (!isMaintainerAuthenticated()) {
    console.warn('[communityEditsService] Unauthorized attempt to reject contribution. Maintainer access required.')
    return false
  }

  let targetId = idOrType
  let reason = secondArg

  if (['edit', 'newTemple', 'temple', 'photo'].includes(idOrType) && secondArg) {
    targetId = secondArg
    reason = thirdArg || 'Changes requested'
  }

  const data = getCommunityEdits()
  let found = false

  if (data.edits[targetId]) {
    data.edits[targetId].status = 'rejected'
    if (data.edits[targetId].updated) {
      data.edits[targetId].updated.status = 'rejected'
      data.edits[targetId].updated.review_note = reason
      data.edits[targetId].updated.moderationNotes = reason
    }
    data.edits[targetId].reviewed_at = Date.now()
    data.edits[targetId].review_note = reason
    data.edits[targetId].moderationNotes = reason
    found = true
  }

  const newT = data.newTemples.find((t) => t.id === targetId)
  if (newT) {
    newT.status = 'rejected'
    newT.reviewed_at = Date.now()
    newT.review_note = reason
    newT.moderationNotes = reason
    found = true
  }

  const photo = data.photos.find((p) => p.id === targetId)
  if (photo) {
    photo.status = 'rejected'
    photo.reviewed_at = Date.now()
    photo.review_note = reason
    photo.moderationNotes = reason
    found = true
  }

  if (found) {
    persistCommunityEdits(data)
    return true
  }
  return false
}

/**
 * Allows a submitter to withdraw their own unapproved pending proposal.
 * Maintainers can also withdraw any entry.
 */
export function withdrawContribution(id) {
  const data = getCommunityEdits()
  let changed = false
  const isMaintainer = isMaintainerAuthenticated()

  // 1. Check edits
  if (data.edits[id]) {
    if (isMaintainer || data.edits[id].status === 'pending') {
      delete data.edits[id]
      data.photos = data.photos.filter((p) => p.templeId !== id)
      changed = true
    }
  }

  // 2. Check new temples
  const newTIdx = data.newTemples.findIndex((t) => t.id === id)
  if (newTIdx !== -1) {
    if (isMaintainer || data.newTemples[newTIdx].status === 'pending') {
      data.newTemples.splice(newTIdx, 1)
      changed = true
    }
  }

  // 3. Check photos
  const photoIdx = data.photos.findIndex((p) => p.id === id)
  if (photoIdx !== -1) {
    if (isMaintainer || data.photos[photoIdx].status === 'pending') {
      data.photos.splice(photoIdx, 1)
      changed = true
    }
  }

  if (changed) {
    persistCommunityEdits(data)
    return true
  }
  return false
}

/**
 * Reverts or removes an edit (maintainers, or unapproved pending draft).
 */
export function revertTempleEdit(templeId) {
  return withdrawContribution(templeId)
}

/**
 * Deletes a user-added community shrine (maintainers, or unapproved pending draft).
 */
export function deleteCommunityTemple(templeId) {
  return withdrawContribution(templeId)
}

/**
 * Merges community edits over base temples list according to moderation status.
 *
 * GUARANTEES:
 * 1. Canonical temple IDs are permanently locked and never changed.
 * 2. Only granularly modified fields (in edit.patch) are applied over canonical data.
 *    Untouched fields (lat, lng, gmap link, description, era, etc.) are 100% preserved.
 * 3. Community photos are appended to community_photos & gallery images; canonical image_url is NEVER overwritten.
 *
 * @param {Array} baseTemples - Canonical list of temples
 * @param {Object} options
 * @param {boolean} options.includePending - If true, pending draft contributions are included with draft watermarks
 * @returns {Array} Merged temples list
 */
export function mergeCommunityEdits(baseTemples, { includePending = false } = {}) {
  const { edits, newTemples, photos } = getCommunityEdits()

  // Collect approved and/or pending photos grouped by templeId
  const photosByTemple = {}
  for (const p of photos) {
    const isApplicable = p.status === 'approved' || (includePending && p.status === 'pending')
    if (isApplicable && p.templeId) {
      if (!photosByTemple[p.templeId]) photosByTemple[p.templeId] = []
      photosByTemple[p.templeId].push(p)
    }
  }

  const mergedBase = baseTemples.map((t) => {
    let temple = { ...t }

    // Merge photo contributions into gallery without replacing canonical image_url
    if (photosByTemple[t.id]) {
      const extraPhotos = photosByTemple[t.id]
      temple.community_photos = extraPhotos
      if (Array.isArray(temple.images)) {
        const photoUrls = extraPhotos.map((p) => p.dataUrl).filter(Boolean)
        temple.images = Array.from(new Set([...temple.images, ...photoUrls]))
      }
    }

    const edit = edits[t.id]
    if (edit) {
      const isApplicable =
        edit.status === 'approved' || (includePending && edit.status === 'pending')

      if (isApplicable) {
        // Apply ONLY the granular patch!
        const patchToApply = edit.patch || {}
        const combinedPhotos = [
          ...(temple.community_photos || []),
          ...(edit.photos || []),
        ]

        temple = {
          ...temple,
          ...patchToApply,
          id: t.id, // IMMUTABLE ID: canonical temple.id is strictly preserved
          isCommunityEdited: true,
          status: edit.status,
          isDraftPending: edit.status === 'pending',
          community_photos: combinedPhotos,
        }

        // Append edit photos to gallery without overwriting canonical image_url
        if (combinedPhotos.length > 0) {
          const photoUrls = combinedPhotos.map((p) => p.dataUrl).filter(Boolean)
          temple.images = Array.from(new Set([...(temple.images || []), ...photoUrls]))
        }
      }
    }

    return temple
  })

  // Filter and prepend new community shrines
  const applicableNew = newTemples
    .filter((t) => t.status === 'approved' || (includePending && t.status === 'pending'))
    .map((t) => ({
      ...t,
      isDraftPending: t.status === 'pending',
    }))

  return [...applicableNew, ...mergedBase]
}

/**
 * Generates a pre-filled GitHub Issue URL for submitting community contributions.
 */
export function generateGitHubIssueUrl(contribution, uploadedPhotoUrls = []) {
  const isNew = Boolean(
    contribution.isCommunityAdded ||
    contribution.type === 'add' ||
    contribution.itemType === 'new_shrine'
  )
  const isPhotoOnly = contribution.type === 'photo' || contribution.itemType === 'photo' || contribution.itemType === 'photo_only'
  const templeName =
    contribution.name ||
    contribution.updated?.name ||
    (contribution.templeId ? `Temple ID #${contribution.templeId}` : 'Sacred Shrine')

  let titlePrefix = '[Community Edit]'
  if (isNew) titlePrefix = '[Community Addition]'
  if (isPhotoOnly) titlePrefix = '[Community Photo]'

  const title = encodeURIComponent(`${titlePrefix} ${templeName}`)

  let body = `### 🙏 Divine India Community Contribution\n\n`
  body += `**Type**: ${isNew ? 'New Sacred Shrine' : isPhotoOnly ? 'Temple Photo Contribution' : 'Edit Existing Temple'}\n`
  body += `**Temple Name**: ${templeName}\n`
  body += `**Contributor**: ${contribution.contributor_name || contribution.contributor || 'Devotee'}\n`
  body += `**Current Status**: 🟡 Submitted for Maintainer Review\n`
  if (contribution.edit_note || contribution.note) {
    body += `**Notes/Rationale**: ${contribution.edit_note || contribution.note}\n`
  }

  // Include uploaded image markdown if available
  if (uploadedPhotoUrls && uploadedPhotoUrls.length > 0) {
    body += `\n### 📸 Attached Photos\n`
    uploadedPhotoUrls.forEach((url, i) => {
      body += `![Shrine Photo ${i + 1}](${url})\n\n`
    })
    body += `*(Photos uploaded & embedded automatically from Divine India contribution portal)*\n`
  } else if (contribution.photos && contribution.photos.length > 0) {
    body += `\n### 📸 Attached Photos (${contribution.photos.length})\n`
    body += `> 💡 **Image is ready on your clipboard!** Simply press **Cmd+V** (Mac) or **Ctrl+V** (Windows) right here in this box to attach your photo.\n`
  }

  if (contribution.diff && Object.keys(contribution.diff).length > 0) {
    body += `\n#### 🔍 Proposed Field Changes\n`
    for (const [k, change] of Object.entries(contribution.diff)) {
      body += `- **${k}**: \`${JSON.stringify(change.from)}\` ➔ \`${JSON.stringify(change.to)}\`\n`
    }
  }

  body += `\n#### 📋 Structured JSON Payload (For Repository Maintainer)\n`
  body += '```json\n'

  const sanitized = {
    id: contribution.id || contribution.templeId,
    type: contribution.type,
    name: templeName,
    contributor: contribution.contributor_name || contribution.contributor,
    note: contribution.edit_note || contribution.note,
    patch: contribution.patch || contribution.diff,
    uploadedPhotoUrls: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
  }

  body += JSON.stringify(sanitized, null, 2)
  body += '\n```\n\n'
  body += `*Submitted via Divine India Community Contribution Portal.*`

  return `https://github.com/${GITHUB_REPO}/issues/new?title=${title}&body=${encodeURIComponent(body)}`
}

/**
 * Exports approved contributions formatted for direct merge into repository.
 */
export function exportApprovedTemplesJson() {
  const { edits, newTemples, photos } = getCommunityEdits()

  const approvedEdits = Object.values(edits).filter((e) => e.status === 'approved')
  const approvedNew = newTemples.filter((t) => t.status === 'approved')
  const approvedPhotos = photos.filter((p) => p.status === 'approved')

  const exportPayload = {
    generatedAt: new Date().toISOString(),
    approvedNewTemples: approvedNew,
    approvedEdits,
    approvedPhotos,
  }

  if (typeof document !== 'undefined') {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `divine_india_approved_contributions_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return exportPayload
}

/**
 * Generates a downloadable JSON file of all local contributions.
 */
export function exportContributionsJson() {
  const data = getCommunityEdits()
  if (typeof document !== 'undefined') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `divine_india_community_contributions_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  return data
}
