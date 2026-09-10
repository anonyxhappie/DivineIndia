/**
 * IndexedDB storage engine for Divine India Community Media.
 *
 * Stores device photos, camera captures, and media assets in IndexedDB
 * so local contributions can hold high-res photos without exhausting the 5MB localStorage limit.
 */

const DB_NAME = 'divine_india_community_db'
const DB_VERSION = 1
const STORE_NAME = 'photos'

let dbPromise = null

function getDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('templeId', 'templeId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.warn('[communityStorage] IndexedDB open error:', request.error)
      resolve(null)
    }
  })

  return dbPromise
}

/**
 * Saves or updates a community photo.
 */
export async function saveCommunityPhoto(photo) {
  try {
    const db = await getDb()
    if (!db) return false

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const entry = {
        id: photo.id || `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        templeId: photo.templeId || null,
        dataUrl: photo.dataUrl,
        caption: photo.caption || '',
        contributor: photo.contributor || 'Devotee',
        createdAt: photo.createdAt || Date.now(),
        sizeBytes: photo.sizeBytes || 0,
        width: photo.width || null,
        height: photo.height || null,
      }
      store.put(entry)
      tx.oncomplete = () => resolve(entry)
      tx.onerror = () => resolve(false)
    })
  } catch (err) {
    console.warn('[communityStorage] Error saving photo:', err)
    return false
  }
}

/**
 * Retrieves a photo by its unique ID.
 */
export async function getCommunityPhoto(photoId) {
  try {
    const db = await getDb()
    if (!db) return null

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(photoId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Retrieves all photos associated with a specific temple.
 */
export async function getPhotosForTemple(templeId) {
  try {
    const db = await getDb()
    if (!db) return []

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('templeId')
      const request = index.getAll(templeId)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

/**
 * Deletes a photo by its unique ID.
 */
export async function deleteCommunityPhoto(photoId) {
  try {
    const db = await getDb()
    if (!db) return false

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(photoId)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}
