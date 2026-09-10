import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  saveTempleEdit,
  saveNewCommunityTemple,
  saveTemplePhotoContribution,
  calculateTempleDiff,
  generateGitHubIssueUrl,
  uploadPhotoToPublicCdn,
  copyImageDataUrlToClipboard,
} from '../utils/communityEditsService'
import { compressImage, formatBytes, validateImageFile } from '../utils/imageCompression'
import { saveCommunityPhoto } from '../utils/communityStorage'
import { getUserLocation } from '../utils/locationService'
import { playTempleChime } from '../audio/chimeSound'

const ALL_DEITIES = [
  'Shiva',
  'Vishnu',
  'Krishna',
  'Goddess',
  'Hanuman',
  'Ganesh',
  'Surya',
  'Murugan',
  'Brahma',
  'Multi',
  'Jain',
  'Buddha',
  'Sikh',
]

const ERA_OPTIONS = ['Ancient', 'Medieval', 'Modern']

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
]

export default function CommunityEditModal({
  isOpen,
  mode = 'edit', // 'edit' | 'add' | 'photo_only'
  temple = null,
  onClose,
  onSaved,
}) {
  const [activeTab, setActiveTab] = useState('general')
  const fileInputRef = useRef(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    deity: 'Shiva',
    state: 'Uttar Pradesh',
    country: 'India',
    location: '',
    lat: '',
    lng: '',
    era: 'Ancient',
    period: 'Ancient',
    wiki_slug: '',
    image_url: '',
    google_maps_link: '',
    description: '',
    timings: '',
    festivals: '',
    dress_code: '',
    significance: '',
    history: '',
    circuit_tags: '',
    contributor_name: '',
    edit_note: '',
  })

  // Attached device photos: Array<{ id, dataUrl, caption, isHero, sizeBytes, format }>
  const [attachedPhotos, setAttachedPhotos] = useState([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [isLocating, setIsLocating] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [submittedFeedback, setSubmittedFeedback] = useState(false)
  const [isUploadingToGitHub, setIsUploadingToGitHub] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const [alsoSubmitToGitHub, setAlsoSubmitToGitHub] = useState(false)

  // Populate when temple or mode changes
  useEffect(() => {
    if (mode === 'photo_only' && temple) {
      setActiveTab('media')
      setFormData((prev) => ({
        ...prev,
        name: temple.name || '',
        deity: temple.deity || 'Shiva',
        state: temple.state || '',
        country: temple.country || 'India',
        location: temple.location || '',
        image_url: temple.image_url || '',
        google_maps_link: temple.google_maps_link || '',
        wiki_slug: temple.wiki_slug || '',
      }))
      setAttachedPhotos([])
    } else if (mode === 'edit' && temple) {
      setActiveTab('general')
      setFormData({
        name: temple.name || '',
        deity: temple.deity || 'Shiva',
        state: temple.state || 'Uttar Pradesh',
        country: temple.country || 'India',
        location: temple.location || '',
        lat: temple.lat != null ? String(temple.lat) : '',
        lng: temple.lng != null ? String(temple.lng) : '',
        era: temple.era || 'Ancient',
        period: temple.period || 'Ancient',
        wiki_slug: temple.wiki_slug || '',
        image_url: temple.image_url || '',
        google_maps_link: temple.google_maps_link || '',
        description: temple.description || '',
        timings: temple.timings || '',
        festivals: temple.festivals || '',
        dress_code: temple.dress_code || '',
        significance: temple.significance || '',
        history: temple.history || '',
        circuit_tags: Array.isArray(temple.circuit_tags) ? temple.circuit_tags.join(', ') : '',
        contributor_name: temple.contributor_name || '',
        edit_note: '',
      })
      // Load any existing community photos for this temple
      if (Array.isArray(temple.community_photos) && temple.community_photos.length > 0) {
        setAttachedPhotos(temple.community_photos)
      } else {
        setAttachedPhotos([])
      }
    } else {
      setActiveTab('general')
      setFormData({
        name: '',
        deity: 'Shiva',
        state: 'Uttar Pradesh',
        country: 'India',
        location: '',
        lat: '',
        lng: '',
        era: 'Ancient',
        period: 'Ancient',
        wiki_slug: '',
        image_url: '',
        google_maps_link: '',
        description: '',
        timings: '',
        festivals: '',
        dress_code: '',
        significance: '',
        history: '',
        circuit_tags: 'Community Shrine',
        contributor_name: '',
        edit_note: '',
      })
      setAttachedPhotos([])
    }
    setFormErrors({})
    setSubmittedFeedback(false)
  }, [mode, temple, isOpen])

  const parsedFormData = useMemo(() => {
    const latNum = parseFloat(formData.lat)
    const lngNum = parseFloat(formData.lng)
    const tags = formData.circuit_tags
      ? formData.circuit_tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    // For brand new shrines, allow primary uploaded photo to act as cover image
    // For existing temples, canonical image_url is preserved; uploaded photos append to community_photos
    const heroPhoto = attachedPhotos.find((p) => p.isHero) || attachedPhotos[0]
    const activeImageUrl = mode === 'add'
      ? (heroPhoto?.dataUrl || formData.image_url)
      : (formData.image_url || temple?.image_url || '')

    return {
      ...formData,
      id: temple?.id, // Locked canonical ID: never changed or cleared
      image_url: activeImageUrl,
      google_maps_link: formData.google_maps_link || temple?.google_maps_link || '',
      lat: !isNaN(latNum) ? latNum : (temple?.lat != null ? temple.lat : null),
      lng: !isNaN(lngNum) ? lngNum : (temple?.lng != null ? temple.lng : null),
      circuit_tags: tags,
      photos: attachedPhotos,
    }
  }, [formData, attachedPhotos, temple, mode])

  const diff = useMemo(() => {
    if (mode !== 'edit' || !temple) return {}
    return calculateTempleDiff(temple, parsedFormData)
  }, [mode, temple, parsedFormData])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Handle Device Photo Upload & Canvas Compression
  const handleProcessImageFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setIsCompressing(true)

    try {
      const newEntries = []
      for (const file of Array.from(fileList)) {
        const check = validateImageFile(file)
        if (!check.valid) {
          alert(check.error)
          continue
        }

        const compressed = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.82 })
        const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

        const photoObj = {
          id: photoId,
          templeId: temple?.id || null,
          dataUrl: compressed.dataUrl,
          caption: '',
          isHero: attachedPhotos.length === 0 && newEntries.length === 0,
          sizeBytes: compressed.sizeBytes,
          format: compressed.format,
          originalSizeBytes: compressed.originalSizeBytes,
        }

        // Also cache to IndexedDB for persistent storage
        saveCommunityPhoto(photoObj).catch(() => {})

        newEntries.push(photoObj)
      }

      if (newEntries.length > 0) {
        setAttachedPhotos((prev) => [...prev, ...newEntries])
        playTempleChime()
      }
    } catch (err) {
      alert('Error optimizing photo: ' + err.message)
    } finally {
      setIsCompressing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSetHeroPhoto = (photoId) => {
    setAttachedPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isHero: p.id === photoId,
      }))
    )
  }

  const handleUpdateCaption = (photoId, caption) => {
    setAttachedPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption } : p))
    )
  }

  const handleRemovePhoto = (photoId) => {
    setAttachedPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== photoId)
      if (filtered.length > 0 && !filtered.some((p) => p.isHero)) {
        filtered[0].isHero = true
      }
      return filtered
    })
  }

  const handleFetchCurrentGps = async () => {
    setIsLocating(true)
    try {
      const loc = await getUserLocation()
      handleChange('lat', loc.lat.toFixed(5))
      handleChange('lng', loc.lng.toFixed(5))
      playTempleChime()
    } catch (err) {
      alert('Could not determine current GPS position: ' + err.message)
    } finally {
      setIsLocating(false)
    }
  }

  const validate = () => {
    const errors = {}
    if (mode === 'photo_only') {
      if (attachedPhotos.length === 0 && !formData.image_url.trim()) {
        errors.photos = 'Please select or upload at least one photo'
      }
      setFormErrors(errors)
      return Object.keys(errors).length === 0
    }

    if (!formData.name.trim()) errors.name = 'Temple name is required'
    if (!formData.state.trim()) errors.state = 'State / Region is required'

    if (formData.lat === '' || isNaN(parseFloat(formData.lat))) {
      errors.lat = 'Valid latitude is required (-90 to 90)'
    } else {
      const lat = parseFloat(formData.lat)
      if (lat < -90 || lat > 90) errors.lat = 'Latitude must be between -90 and 90'
    }

    if (formData.lng === '' || isNaN(parseFloat(formData.lng))) {
      errors.lng = 'Valid longitude is required (-180 to 180)'
    } else {
      const lng = parseFloat(formData.lng)
      if (lng < -180 || lng > 180) errors.lng = 'Longitude must be between -180 and 180'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleOpenGitHub = async (preOpenedWindow = null) => {
    if (!validate()) return
    setIsUploadingToGitHub(true)
    setUploadProgressText('Preparing submission...')

    // Open target window immediately to avoid popup blocker if none passed
    const targetWin = preOpenedWindow || window.open('about:blank', '_blank')

    try {
      const uploadedUrls = []

      // Upload attached photos and copy primary to clipboard
      if (attachedPhotos && attachedPhotos.length > 0) {
        if (attachedPhotos[0]?.dataUrl && attachedPhotos[0].dataUrl.startsWith('data:')) {
          copyImageDataUrlToClipboard(attachedPhotos[0].dataUrl).catch(() => {})
        }
        for (let i = 0; i < attachedPhotos.length; i++) {
          const photo = attachedPhotos[i]
          setUploadProgressText(`Uploading photo ${i + 1} of ${attachedPhotos.length}...`)
          const url = await uploadPhotoToPublicCdn(photo.dataUrl, `shrine_${Date.now()}_${i + 1}.png`)
          if (url) uploadedUrls.push(url)
        }
      } else if (formData.image_url) {
        const url = await uploadPhotoToPublicCdn(formData.image_url, `shrine_cover_${Date.now()}.png`)
        if (url) uploadedUrls.push(url)
      }

      const payload = {
        ...parsedFormData,
        id: temple?.id || 'new_community_temple',
        templeId: temple?.id || null,
        isCommunityAdded: mode === 'add',
        type: mode,
        contributor_name: formData.contributor_name,
        edit_note: formData.edit_note,
        diff: mode === 'edit' ? diff : null,
        photos: attachedPhotos,
      }

      const url = generateGitHubIssueUrl(payload, uploadedUrls)
      if (targetWin) {
        targetWin.location.href = url
      } else {
        window.location.href = url
      }
    } catch (err) {
      if (targetWin) targetWin.close()
      alert('Could not submit to GitHub: ' + err.message)
    } finally {
      setIsUploadingToGitHub(false)
      setUploadProgressText('')
    }
  }

  const handleSubmitForReview = async () => {
    if (!validate()) {
      if (mode === 'photo_only') setActiveTab('media')
      else setActiveTab(formErrors.name || formErrors.state ? 'general' : 'location')
      return
    }

    // If auto GitHub submission is checked, pre-open window in user click event
    let targetWin = null
    if (alsoSubmitToGitHub) {
      targetWin = window.open('about:blank', '_blank')
    }

    playTempleChime()

    if (mode === 'photo_only' && temple) {
      const primaryPhoto = attachedPhotos[0] || { dataUrl: formData.image_url }
      const res = saveTemplePhotoContribution(
        temple.id,
        primaryPhoto,
        formData.contributor_name,
        formData.edit_note || primaryPhoto.caption
      )
      if (res.success && onSaved) {
        onSaved({ photo: res.photo, temple })
      }
    } else if (mode === 'edit' && temple) {
      const res = saveTempleEdit(
        temple.id,
        temple,
        parsedFormData,
        formData.contributor_name,
        formData.edit_note,
        attachedPhotos
      )
      if (!res.success) {
        if (targetWin) targetWin.close()
        alert(res.reason || 'No changes or photos detected to submit')
        return
      }
      if (res.success && onSaved) {
        onSaved({ edit: res.edit, temple: res.edit.updated })
      }
    } else {
      const res = saveNewCommunityTemple(
        parsedFormData,
        formData.contributor_name,
        formData.edit_note,
        attachedPhotos
      )
      if (res.success && onSaved) {
        onSaved({ temple: res.temple })
      }
    }

    if (alsoSubmitToGitHub && targetWin) {
      await handleOpenGitHub(targetWin)
    }

    setSubmittedFeedback(true)
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  const handleCopyJson = () => {
    const payload = {
      id: temple?.id || 'new_community_temple',
      templeName: temple?.name || parsedFormData.name,
      type: mode === 'add' ? 'new_shrine' : 'temple_edit',
      contributor: formData.contributor_name || 'Anonymous Devotee',
      note: formData.edit_note || '',
      patch: mode === 'edit' ? diff : parsedFormData,
      attachedPhotosCount: attachedPhotos.length,
    }
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2500)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1005] flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#16151f] rounded-3xl border border-amber-500/40 shadow-2xl shadow-black/95 overflow-hidden z-10 text-stone-100"
        >
          {/* Header Banner */}
          <div className="p-4 sm:px-6 sm:py-4 border-b border-white/15 bg-gradient-to-r from-amber-500/15 via-purple-950/25 to-stone-900/60 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 rounded-2xl bg-amber-500/20 border border-amber-400/40 shadow-inner select-none">
                {mode === 'photo_only' ? '📸' : mode === 'edit' ? '✏️' : '➕'}
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-cinzel text-white flex items-center gap-2">
                  <span>
                    {mode === 'photo_only'
                      ? 'Contribute Temple Photo'
                      : mode === 'edit'
                      ? 'Suggest Temple Edits'
                      : 'Submit Sacred Shrine'}
                  </span>
                  <span className="text-[10px] font-sans px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/40 font-bold uppercase tracking-wider">
                    Community
                  </span>
                </h2>
                <p className="text-xs text-stone-300 font-sans truncate max-w-sm sm:max-w-md mt-0.5">
                  {temple ? (
                    <>
                      For <strong className="text-amber-300">{temple.name}</strong> · ID #{temple.id}
                    </>
                  ) : (
                    'Contribute an unlisted ancient temple or local sacred heritage shrine'
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-lg"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Success Banner */}
          {submittedFeedback && (
            <div className="px-6 py-2.5 bg-emerald-500/25 border-b border-emerald-500/40 text-xs font-semibold text-emerald-200 flex items-center gap-2">
              <span>✨</span>
              <span>Submitted successfully to community moderation queue!</span>
            </div>
          )}

          {/* Navigation Tabs */}
          {mode !== 'photo_only' && (
            <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-2.5 pb-1.5 border-b border-white/10 bg-black/30 overflow-x-auto custom-scrollbar flex-shrink-0">
              {[
                { id: 'general', label: '1. Basic Info', icon: '🛕' },
                { id: 'location', label: '2. GPS Location', icon: '📍' },
                { id: 'lore', label: '3. Lore & Timings', icon: '📜' },
                { id: 'media', label: '4. Photos', icon: '🖼️' },
                { id: 'review', label: '5. Review & Submit', icon: '✨' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold shadow-md'
                      : 'text-stone-300 hover:text-white hover:bg-white/10 font-semibold'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.id === 'media' && attachedPhotos.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] flex items-center justify-center font-bold">
                      {attachedPhotos.length}
                    </span>
                  )}
                  {tab.id === 'review' && mode === 'edit' && Object.keys(diff).length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
            {/* TAB 1: BASIC INFO */}
            {activeTab === 'general' && mode !== 'photo_only' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                    Temple Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Shree Siddhivinayak Mandir"
                    className={`w-full p-2.5 rounded-xl bg-stone-900/90 border text-sm font-sans text-white placeholder:text-stone-400 outline-none transition-all ${
                      formErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-600 focus:border-amber-400'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-red-400 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Primary Presiding Deity <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.deity}
                      onChange={(e) => handleChange('deity', e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white outline-none focus:border-amber-400"
                    >
                      {ALL_DEITIES.map((d) => (
                        <option key={d} value={d} className="bg-stone-900 text-white">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      State / Province <span className="text-red-400">*</span>
                    </label>
                    <input
                      list="state-options"
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                    <datalist id="state-options">
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      City / District / Kshetra
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="e.g. Prabhadevi, Mumbai"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      placeholder="India"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                    Pilgrimage Circuits (comma separated tags)
                  </label>
                  <input
                    type="text"
                    value={formData.circuit_tags}
                    onChange={(e) => handleChange('circuit_tags', e.target.value)}
                    placeholder="e.g. Shakti Peetha, Jyotirlinga, Char Dham, Ram Circuit"
                    className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: LOCATION & GPS */}
            {activeTab === 'location' && mode !== 'photo_only' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl select-none">📍</span>
                    <div>
                      <p className="text-xs font-bold font-sans text-sky-400">
                        Accurate Geolocation Required
                      </p>
                      <p className="text-xs text-stone-300">
                        Coordinates ensure the temple appears correctly on the Leaflet map and nearby radar.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchCurrentGps}
                    disabled={isLocating}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold font-sans transition-colors flex-shrink-0 cursor-pointer shadow-sm"
                  >
                    {isLocating ? 'Locating…' : '📍 Use My GPS'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Latitude (°N) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lat}
                      onChange={(e) => handleChange('lat', e.target.value)}
                      placeholder="e.g. 19.0169"
                      className={`w-full p-2.5 rounded-xl bg-stone-900/90 border text-sm font-mono text-white placeholder:text-stone-400 outline-none ${
                        formErrors.lat ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-600 focus:border-amber-400'
                      }`}
                    />
                    {formErrors.lat && <p className="text-[11px] text-red-400 mt-1">{formErrors.lat}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Longitude (°E) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lng}
                      onChange={(e) => handleChange('lng', e.target.value)}
                      placeholder="e.g. 72.8303"
                      className={`w-full p-2.5 rounded-xl bg-stone-900/90 border text-sm font-mono text-white placeholder:text-stone-400 outline-none ${
                        formErrors.lng ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-600 focus:border-amber-400'
                      }`}
                    />
                    {formErrors.lng && <p className="text-[11px] text-red-400 mt-1">{formErrors.lng}</p>}
                  </div>
                </div>

                {formData.lat && formData.lng && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/15 text-xs font-sans text-stone-300 flex items-center justify-between">
                    <span>
                      Map Coordinates: [{formData.lat}, {formData.lng}]
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${formData.lat},${formData.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 font-bold hover:underline"
                    >
                      Verify on Google Maps ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LORE & TIMINGS */}
            {activeTab === 'lore' && mode !== 'photo_only' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Architectural Era
                    </label>
                    <select
                      value={formData.era}
                      onChange={(e) => handleChange('era', e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white outline-none focus:border-amber-400"
                    >
                      {ERA_OPTIONS.map((era) => (
                        <option key={era} value={era} className="bg-stone-900 text-white">
                          {era}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Historical Century / Period
                    </label>
                    <input
                      type="text"
                      value={formData.period}
                      onChange={(e) => handleChange('period', e.target.value)}
                      placeholder="e.g. 18th Century CE, Maratha Rule"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                    Spiritual Significance, Sthala Purana & History
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter the sacred legend, deity manifestation lore, miraculous history, or historical facts associated with this shrine..."
                    className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Temple Timings & Aarti Schedules
                    </label>
                    <input
                      type="text"
                      value={formData.timings}
                      onChange={(e) => handleChange('timings', e.target.value)}
                      placeholder="e.g. 5:30 AM – 9:30 PM (Mangala Aarti 6:00 AM)"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Major Festivals Celebrated
                    </label>
                    <input
                      type="text"
                      value={formData.festivals}
                      onChange={(e) => handleChange('festivals', e.target.value)}
                      placeholder="e.g. Mahashivratri, Ganesh Utsav, Navratri"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                    Dress Code & Sacred Guidelines
                  </label>
                  <input
                    type="text"
                    value={formData.dress_code}
                    onChange={(e) => handleChange('dress_code', e.target.value)}
                    placeholder="e.g. Traditional Indian attire recommended; footwear lockers available at entrance."
                    className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: PHOTOS & MEDIA (Supports Device Uploads & Gallery) */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                {/* Device Upload Drag-and-Drop Area */}
                <div>
                  <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                    Upload Photos from Your Device (Camera / Gallery)
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleProcessImageFiles(e.target.files)}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      handleProcessImageFiles(e.dataTransfer.files)
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-white/20 hover:border-amber-400/50 bg-black/30 hover:bg-black/40'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center text-2xl mb-2 text-amber-300">
                      📸
                    </div>
                    <p className="text-sm font-bold text-white font-cinzel">
                      {isCompressing ? 'Optimizing photo for crisp viewing…' : 'Click or Drag Photos from Device'}
                    </p>
                    <p className="text-xs text-stone-300 font-sans mt-1">
                      Auto-compressed with WebP/JPEG for lightning fast load times across devices.
                    </p>
                    <div className="pt-3">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold font-sans pointer-events-none"
                      >
                        Select from Phone / Desktop 📁
                      </button>
                    </div>
                  </div>
                  {formErrors.photos && (
                    <p className="text-xs text-red-400 mt-1 font-semibold">{formErrors.photos}</p>
                  )}
                </div>

                {/* Attached Photos Grid */}
                {attachedPhotos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-cinzel">
                        Attached Photos ({attachedPhotos.length})
                      </h4>
                      <span className="text-[11px] text-stone-300">
                        Choose which photo serves as the primary Hero photo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachedPhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className={`relative rounded-xl border p-2.5 bg-stone-900/90 flex gap-3 items-center ${
                            photo.isHero
                              ? 'border-amber-400 ring-1 ring-amber-400 shadow-md shadow-amber-500/10'
                              : 'border-white/15'
                          }`}
                        >
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10">
                            <img
                              src={photo.dataUrl}
                              alt={photo.caption || 'Temple attachment'}
                              className="w-full h-full object-cover"
                            />
                            {photo.isHero && (
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-stone-950 shadow">
                                ★ Hero
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-stone-400">
                                {formatBytes(photo.sizeBytes)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="p-1 text-red-400 hover:text-red-200 text-xs rounded transition-colors"
                                title="Remove photo"
                              >
                                🗑️
                              </button>
                            </div>

                            <input
                              type="text"
                              value={photo.caption}
                              onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                              placeholder="Photo caption (e.g. Gopuram, Sanctum)"
                              className="w-full px-2 py-1 rounded bg-black/40 border border-stone-600 text-xs text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                            />

                            {!photo.isHero && (
                              <button
                                type="button"
                                onClick={() => handleSetHeroPhoto(photo.id)}
                                className="text-[11px] text-amber-300 hover:text-amber-100 font-bold underline block"
                              >
                                Set as Hero Cover
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional Web URL & Wikipedia Slug Section */}
                <div className="pt-2 border-t border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-stone-200 font-sans">
                    Alternative / External Web Links (Optional)
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold font-sans text-stone-300 mb-1">
                      Web Photo URL (Wikimedia or Direct Image Link)
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => handleChange('image_url', e.target.value)}
                      placeholder="https://upload.wikimedia.org/...jpg or direct image link"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold font-sans text-stone-300 mb-1">
                      Wikipedia Article Slug (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.wiki_slug}
                      onChange={(e) => handleChange('wiki_slug', e.target.value)}
                      placeholder="e.g. Siddhivinayak_Temple,_Mumbai"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                    <p className="text-xs text-stone-300 mt-1 font-sans">
                      Enables automatic fetching of Wikimedia Commons galleries and encyclopedic extracts.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: REVIEW & SUBMIT */}
            {(activeTab === 'review' || mode === 'photo_only') && (
              <div className="space-y-4">
                {/* Wikipedia-Style Review Queue Notice */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-stone-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-sm font-cinzel">
                    <span>🟡</span>
                    <span>Wikipedia-Style Moderation Queue</span>
                  </div>
                  <p className="text-stone-300 font-sans leading-relaxed">
                    Your contribution enters the community review queue as <strong>Pending Review</strong>.
                    It will be verified before global inclusion. You can preview it on your device immediately!
                  </p>
                </div>

                {/* Diff Viewer for Edits */}
                {mode === 'edit' && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="text-xs font-bold font-cinzel text-white">
                        Detected Changes Diff
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                        {Object.keys(diff).length} modified field(s)
                      </span>
                    </div>

                    {Object.keys(diff).length === 0 && attachedPhotos.length === 0 ? (
                      <p className="text-xs text-stone-300 italic py-1">
                        No changes detected yet. Modify any fields in the tabs to propose an update.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {Object.entries(diff).map(([key, change]) => (
                          <div
                            key={key}
                            className="p-2 rounded-lg bg-stone-900/90 text-xs font-sans space-y-0.5 border border-white/10"
                          >
                            <span className="font-bold text-amber-300 uppercase text-[10px] tracking-wider font-cinzel">
                              {key}:
                            </span>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="line-through text-stone-400 truncate max-w-[45%]">
                                {String(change.from || 'None')}
                              </span>
                              <span>→</span>
                              <span className="text-emerald-400 font-semibold truncate max-w-[45%]">
                                {String(change.to || 'None')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Attached Photos Summary */}
                {attachedPhotos.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 space-y-2">
                    <span className="text-xs font-bold font-cinzel text-white block">
                      Photos Attached for Review ({attachedPhotos.length})
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {attachedPhotos.map((p) => (
                        <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
                          <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                          {p.isHero && (
                            <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-stone-950 text-[8px] font-black text-center">
                              HERO
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contributor Attribution Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Your Name / Handle (Optional Credit)
                    </label>
                    <input
                      type="text"
                      value={formData.contributor_name}
                      onChange={(e) => handleChange('contributor_name', e.target.value)}
                      placeholder="e.g. Devotee @Akshay"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-sans text-stone-100 mb-1">
                      Contribution Notes / Source
                    </label>
                    <input
                      type="text"
                      value={formData.edit_note}
                      onChange={(e) => handleChange('edit_note', e.target.value)}
                      placeholder="e.g. Personal darshan photo / verified timings"
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-stone-600 text-sm font-sans text-white placeholder:text-stone-400 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Export & Sharing Helper */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-3.5 py-1.5 rounded-xl border border-stone-600 text-xs font-sans font-semibold text-stone-200 hover:text-white hover:bg-stone-800 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>{copyFeedback ? 'Copied JSON!' : 'Copy Contribution JSON'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGitHub()}
                      disabled={isUploadingToGitHub}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600/25 border border-purple-400/50 text-purple-200 text-xs font-sans font-bold hover:bg-purple-600/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingToGitHub ? (
                        <>
                          <span className="inline-block animate-spin text-xs">⏳</span>
                          <span>{uploadProgressText || 'Uploading to GitHub...'}</span>
                        </>
                      ) : (
                        <>
                          <span>🐙</span>
                          <span>Submit to GitHub Issue ↗</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs text-purple-300 font-sans cursor-pointer bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/30 hover:border-purple-400/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={alsoSubmitToGitHub}
                        onChange={(e) => setAlsoSubmitToGitHub(e.target.checked)}
                        className="accent-purple-500 rounded cursor-pointer"
                      />
                      <span>Upload attached photo(s) and create official GitHub Issue on Submit</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 border-t border-white/15 bg-black/40 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-sans font-semibold text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2.5">
              {activeTab !== 'review' && mode !== 'photo_only' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['general', 'location', 'lore', 'media', 'review']
                    const curIdx = tabs.indexOf(activeTab)
                    if (curIdx < tabs.length - 1) setActiveTab(tabs[curIdx + 1])
                  }}
                  className="px-4 py-2 rounded-xl border border-stone-600 text-xs font-sans font-bold text-stone-200 hover:text-white hover:bg-stone-800 transition-all cursor-pointer"
                >
                  Next Step →
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isUploadingToGitHub}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-saffron to-amber-600 text-stone-950 font-sans font-extrabold text-xs shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUploadingToGitHub ? (
                  <>
                    <span className="inline-block animate-spin text-xs">⏳</span>
                    <span>{uploadProgressText || 'Uploading...'}</span>
                  </>
                ) : (
                  <>
                    <span>🙏</span>
                    <span>Submit for Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
