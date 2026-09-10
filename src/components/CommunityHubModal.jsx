import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getCommunityEdits,
  approveContribution,
  rejectContribution,
  withdrawContribution,
  revertTempleEdit,
  deleteCommunityTemple,
  exportApprovedTemplesJson,
  exportContributionsJson,
  generateGitHubIssueUrl,
  isMaintainerAuthenticated,
  getMaintainerProfile,
  authenticateWithGitHubToken,
  logoutMaintainer,
  uploadPhotoToPublicCdn,
  copyImageDataUrlToClipboard,
} from '../utils/communityEditsService'
import { playTempleChime } from '../audio/chimeSound'

export default function CommunityHubModal({
  isOpen,
  onClose,
  onOpenAddModal,
  onOpenEditModal,
  onSelectTemple,
  previewPending = true,
  onTogglePreviewPending,
}) {
  const [data, setData] = useState({ edits: {}, newTemples: [], photos: [] })
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'approved' | 'rejected'
  const [isMaintainer, setIsMaintainer] = useState(isMaintainerAuthenticated())
  const [maintainerUser, setMaintainerUser] = useState(getMaintainerProfile())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [gitHubTokenInput, setGitHubTokenInput] = useState('')
  const [rememberDevice, setRememberDevice] = useState(true)
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false)
  const [submittingId, setSubmittingId] = useState(null)
  const [submitStatusText, setSubmitStatusText] = useState('')
  const [authError, setAuthError] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [expandedDiffId, setExpandedDiffId] = useState(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null)

  const reloadData = () => {
    setData(getCommunityEdits())
    setIsMaintainer(isMaintainerAuthenticated())
    setMaintainerUser(getMaintainerProfile())
  }

  useEffect(() => {
    if (isOpen) {
      reloadData()
    }
  }, [isOpen])

  // Listen to window updates
  useEffect(() => {
    const handleUpdate = () => reloadData()
    window.addEventListener('divine-india-community-updated', handleUpdate)
    return () => window.removeEventListener('divine-india-community-updated', handleUpdate)
  }, [])

  const editedList = Object.values(data.edits || {})
  const addedList = data.newTemples || []
  const photosList = data.photos || []

  // Combine into a unified contributions feed
  const allContributions = [
    ...addedList.map((t) => ({ ...t, itemType: 'new_shrine' })),
    ...editedList.map((e) => ({ ...e, itemType: 'edit' })),
    ...photosList.map((p) => ({ ...p, itemType: 'photo' })),
  ].sort((a, b) => (b.timestamp || b.created_at || 0) - (a.timestamp || a.created_at || 0))

  const pendingCount = allContributions.filter((c) => (c.status || 'pending') === 'pending').length
  const approvedCount = allContributions.filter((c) => c.status === 'approved').length
  const rejectedCount = allContributions.filter((c) => c.status === 'rejected').length
  const totalContributions = allContributions.length

  const filteredContributions = allContributions.filter((c) => {
    const st = c.status || 'pending'
    if (statusFilter === 'all') return true
    return st === statusFilter
  })

  const showFeedback = (msg) => {
    setActionSuccessMessage(msg)
    setTimeout(() => setActionSuccessMessage(null), 3500)
  }

  const handleLoginMaintainer = async (e) => {
    e?.preventDefault()
    setAuthError('')
    setIsVerifyingAuth(true)

    try {
      const res = await authenticateWithGitHubToken(gitHubTokenInput, rememberDevice)
      if (res.success) {
        setIsMaintainer(true)
        setMaintainerUser(res.user)
        setShowAuthModal(false)
        setGitHubTokenInput('')
        playTempleChime()
        showFeedback(`👑 Welcome @${res.user.login}! Verified by GitHub API as repository maintainer.`)
      } else {
        setAuthError(res.error || 'GitHub verification failed. Push access required.')
      }
    } catch (err) {
      setAuthError('Authentication error: ' + err.message)
    } finally {
      setIsVerifyingAuth(false)
    }
  }

  const handleSubmitToGitHub = async (item) => {
    const itemId = item.id || item.templeId
    setSubmittingId(itemId)
    setSubmitStatusText('Uploading...')

    // Open target window synchronously in user click event to prevent popup blocker
    const targetWin = window.open('about:blank', '_blank')

    try {
      const rawPhotos = []
      if (Array.isArray(item.photos)) {
        rawPhotos.push(...item.photos)
      }
      if (item.dataUrl) {
        rawPhotos.push({ dataUrl: item.dataUrl, caption: item.caption })
      }
      if (item.image_url && (item.image_url.startsWith('data:') || item.image_url.startsWith('http'))) {
        if (!rawPhotos.some((p) => p.dataUrl === item.image_url)) {
          rawPhotos.push({ dataUrl: item.image_url, caption: item.name })
        }
      }
      if (item.updated?.photos && Array.isArray(item.updated.photos)) {
        for (const p of item.updated.photos) {
          if (!rawPhotos.some((rp) => rp.dataUrl === p.dataUrl)) rawPhotos.push(p)
        }
      }

      const uploadedUrls = []
      if (rawPhotos.length > 0) {
        if (rawPhotos[0]?.dataUrl && rawPhotos[0].dataUrl.startsWith('data:')) {
          copyImageDataUrlToClipboard(rawPhotos[0].dataUrl).catch(() => {})
        }
        for (let i = 0; i < rawPhotos.length; i++) {
          const p = rawPhotos[i]
          setSubmitStatusText(`Uploading photo ${i + 1}/${rawPhotos.length}...`)
          const uUrl = await uploadPhotoToPublicCdn(p.dataUrl, `temple_photo_${i + 1}.png`)
          if (uUrl) uploadedUrls.push(uUrl)
        }
      }

      const payload = item.updated || item
      const issueUrl = generateGitHubIssueUrl(payload, uploadedUrls)

      if (targetWin) {
        targetWin.location.href = issueUrl
      } else {
        window.location.href = issueUrl
      }

      showFeedback(
        `Opened GitHub Issue for "${payload.name || 'Shrine'}"${
          uploadedUrls.length > 0 ? ` with ${uploadedUrls.length} photo(s) uploaded & embedded!` : '!'
        }`
      )
    } catch (err) {
      if (targetWin) targetWin.close()
      showFeedback(`Error opening GitHub: ${err.message}`)
    } finally {
      setSubmittingId(null)
      setSubmitStatusText('')
    }
  }

  const handleLogoutMaintainer = () => {
    logoutMaintainer()
    setIsMaintainer(false)
    setMaintainerUser(null)
    showFeedback('Logged out of maintainer mode. Devotee submitter view active.')
  }

  const handleApprove = (id, name) => {
    if (!isMaintainer) {
      setShowAuthModal(true)
      return
    }
    const ok = approveContribution(id, 'Verified and approved for canonical inclusion')
    if (ok) {
      playTempleChime()
      showFeedback(`Approved "${name || 'Contribution'}"! Now active in the canonical atlas.`)
      reloadData()
    } else {
      showFeedback('Approval failed: Maintainer authentication required.')
    }
  }

  const handleReject = (id, name) => {
    if (!isMaintainer) {
      setShowAuthModal(true)
      return
    }
    const reason = window.prompt(`Enter revision note for "${name || 'Contribution'}":`, 'Please verify coordinates and provide clearer photos.')
    if (reason !== null) {
      const ok = rejectContribution(id, reason.trim() || 'Changes requested')
      if (ok) {
        showFeedback(`Marked "${name || 'Contribution'}" as Needs Revision.`)
        reloadData()
      }
    }
  }

  const handleWithdraw = (item) => {
    const name = item.name || item.updated?.name || 'this proposal'
    if (window.confirm(`Withdraw and cancel "${name}"? This removes your pending draft.`)) {
      const ok = withdrawContribution(item.id || item.templeId)
      if (ok) {
        showFeedback(`Withdrew "${name}"`)
        reloadData()
      }
    }
  }

  const handleRevert = (item) => {
    const name = item.name || item.updated?.name || 'this contribution'
    if (window.confirm(`Delete and discard "${name}" from local records?`)) {
      if (item.itemType === 'new_shrine') {
        deleteCommunityTemple(item.id)
      } else {
        revertTempleEdit(item.id || item.templeId)
      }
      showFeedback(`Discarded "${name}"`)
      reloadData()
    }
  }

  const handleCopyCardJson = (item) => {
    const isEdit = item.itemType === 'edit'
    const payload = {
      id: item.id || item.templeId,
      name: item.name || item.updated?.name || (item.templeId ? `Temple #${item.templeId}` : 'Sacred Shrine'),
      type: item.itemType,
      contributor: item.contributor_name || item.contributor || 'Devotee',
      note: item.edit_note || item.note || item.caption || '',
      patch: isEdit ? (item.patch || item.diff) : item,
    }
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopiedId(item.id || item.templeId)
    setTimeout(() => setCopiedId(null), 2500)
    showFeedback('📋 Proposal JSON copied to clipboard!')
  }

  const handleExportApproved = () => {
    exportApprovedTemplesJson()
    showFeedback('Downloaded Approved Temples JSON for repository inclusion!')
  }

  const handleExportAll = () => {
    exportContributionsJson()
    showFeedback('Downloaded complete community contributions JSON backup.')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#16151f] border border-amber-500/40 rounded-2xl shadow-2xl shadow-black/95 overflow-hidden text-stone-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-amber-500/25 bg-gradient-to-r from-amber-500/15 via-purple-950/25 to-stone-900/60">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl select-none filter drop-shadow">🪔</span>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white tracking-wide drop-shadow-sm">
                    Community Contributions Hub
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/40 font-mono">
                    {totalContributions} {totalContributions === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-300 font-sans mt-0.5 leading-normal">
                  Wikipedia-style moderation queue: review proposals, verify photos, and approve shrines
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  onClose()
                  onOpenAddModal?.()
                }}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>➕</span> Add Shrine
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors text-lg cursor-pointer"
                title="Close modal"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Banner notification feedback */}
          {actionSuccessMessage && (
            <div className="px-6 py-2.5 bg-amber-500/25 border-b border-amber-500/40 text-xs font-semibold text-amber-200 flex items-center justify-between">
              <span>✨ {actionSuccessMessage}</span>
              <button
                onClick={() => setActionSuccessMessage(null)}
                className="text-amber-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Subheader Toolbar */}
          <div className="px-6 py-3 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
            {/* Moderation Status Tabs */}
            <div className="flex items-center gap-1.5 bg-stone-900/90 p-1 rounded-xl border border-white/15 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold shadow'
                    : 'text-stone-300 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                All ({totalContributions})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-stone-950 font-extrabold shadow'
                    : 'text-amber-300 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <span>🟡</span>
                <span>Pending ({pendingCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-500 text-stone-950 font-extrabold shadow'
                    : 'text-emerald-300 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <span>🟢</span>
                <span>Approved ({approvedCount})</span>
              </button>
              {rejectedCount > 0 && (
                <button
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'rejected'
                      ? 'bg-rose-600 text-white font-extrabold shadow'
                      : 'text-rose-300 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  <span>🔴</span>
                  <span>Revision ({rejectedCount})</span>
                </button>
              )}
            </div>

            {/* Controls: Preview Drafts Toggle & Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Preview Drafts Toggle */}
              {onTogglePreviewPending && (
                <label className="flex items-center gap-2 text-xs text-stone-300 bg-stone-900/90 border border-white/15 px-3 py-1.5 rounded-xl cursor-pointer hover:border-amber-400/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={previewPending}
                    onChange={(e) => onTogglePreviewPending(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Preview Pending Drafts on Map</span>
                </label>
              )}

              {/* Maintainer Mode State / Login Trigger */}
              {isMaintainer ? (
                <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/50 px-3 py-1.5 rounded-xl text-xs text-emerald-300 font-bold shadow-sm">
                  {maintainerUser?.avatar && (
                    <img
                      src={maintainerUser.avatar}
                      alt=""
                      className="w-4 h-4 rounded-full border border-emerald-400/60"
                    />
                  )}
                  <span>👑 @{maintainerUser?.login || 'Maintainer'}</span>
                  <button
                    onClick={handleLogoutMaintainer}
                    className="ml-1 px-2 py-0.5 rounded bg-emerald-500/25 hover:bg-emerald-500/40 text-[10px] text-white transition-colors cursor-pointer"
                    title="Log out of Maintainer Mode"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all cursor-pointer shadow-sm"
                  title="Authenticate via GitHub Token to review and approve proposals"
                >
                  <span>🔐</span>
                  <span>Maintainer Access</span>
                </button>
              )}

              {isMaintainer && (
                <button
                  onClick={handleExportApproved}
                  disabled={approvedCount === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Download approved contributions for Git commit"
                >
                  <span>📥</span> Export Approved JSON
                </button>
              )}

              <button
                onClick={handleExportAll}
                disabled={totalContributions === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-600 bg-stone-800/90 hover:bg-stone-700 text-stone-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                title="Download complete contributions backup"
              >
                <span>💾</span> Backup
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            {filteredContributions.length === 0 ? (
              <div className="py-16 text-center space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/10">
                  🕉️
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-lg sm:text-xl font-cinzel font-bold text-white tracking-wide">
                    {statusFilter === 'all'
                      ? 'No Local Contributions Yet'
                      : `No ${statusFilter.toUpperCase()} contributions`}
                  </h3>
                  <p className="text-sm text-stone-300 font-sans leading-relaxed">
                    You can enrich Divine India by proposing corrections to temple descriptions,
                    timings, coordinates, or uploading photos from your device.
                  </p>
                </div>
                <div className="pt-3">
                  <button
                    onClick={() => {
                      onClose()
                      onOpenAddModal?.()
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
                  >
                    ➕ Propose a Sacred Shrine
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredContributions.map((item) => {
                  const isNewShrine = item.itemType === 'new_shrine'
                  const isPhoto = item.itemType === 'photo'
                  const isEdit = item.itemType === 'edit'
                  const itemId = item.id || item.templeId
                  const itemStatus = item.status || 'pending'
                  const titleName =
                    item.name ||
                    item.updated?.name ||
                    (item.templeId ? `Temple ID #${item.templeId}` : 'Sacred Shrine')

                  const photos = item.photos || (item.dataUrl ? [item] : [])

                  return (
                    <div
                      key={`${item.itemType}_${itemId}`}
                      className="p-4 sm:p-5 rounded-2xl bg-stone-900/80 border border-white/15 hover:border-amber-500/30 transition-all space-y-3 shadow-lg"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl p-2 rounded-xl bg-black/40 border border-white/10 select-none">
                            {isNewShrine ? '🏛️' : isPhoto ? '📸' : '✏️'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm sm:text-base font-bold font-cinzel text-white">
                                {titleName}
                              </h4>

                              {/* Status Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold border ${
                                  itemStatus === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : itemStatus === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                                }`}
                              >
                                {itemStatus === 'approved'
                                  ? '🟢 Approved in Canonical Atlas'
                                  : itemStatus === 'rejected'
                                  ? '🔴 Revision Requested'
                                  : '🟡 Pending Maintainer Review'}
                              </span>

                              {/* Contribution Type Pill */}
                              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-white/10 text-stone-300 border border-white/10">
                                {isNewShrine ? 'New Shrine' : isPhoto ? 'Photo Contribution' : 'Field Edits'}
                              </span>
                            </div>

                            <p className="text-xs text-amber-300 font-semibold font-sans mt-0.5">
                              {item.location || item.state || item.updated?.location || item.updated?.state || 'Sacred Shrine'}
                              {(item.contributor_name || item.contributor) && (
                                <span className="text-stone-300 font-normal">
                                  {' '}• Contributed by <strong className="text-stone-100">{item.contributor_name || item.contributor}</strong>
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Top Action Buttons: Copy JSON, GitHub, Discard/Withdraw */}
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <button
                            onClick={() => handleCopyCardJson(item)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 transition-colors cursor-pointer"
                            title="Copy structured proposal JSON to clipboard"
                          >
                            {copiedId === itemId ? '✓ Copied' : '📋 Copy JSON'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSubmitToGitHub(item)}
                            disabled={submittingId === itemId}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/50 text-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Upload photo(s) & submit to repository on GitHub"
                          >
                            {submittingId === itemId ? (
                              <>
                                <span className="inline-block animate-spin text-[10px]">⏳</span>
                                <span>{submitStatusText || 'Uploading...'}</span>
                              </>
                            ) : (
                              <>
                                <span>🐙</span>
                                <span>Submit</span>
                              </>
                            )}
                          </button>

                          {isMaintainer ? (
                            <button
                              onClick={() => handleRevert(item)}
                              className="p-1.5 text-red-400 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-colors text-sm cursor-pointer"
                              title="Discard / delete from local records"
                            >
                              🗑️
                            </button>
                          ) : (
                            itemStatus === 'pending' && (
                              <button
                                onClick={() => handleWithdraw(item)}
                                className="px-2 py-1 text-xs font-medium text-stone-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                                title="Withdraw unapproved proposal"
                              >
                                ↩️ Withdraw
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Description or Notes */}
                      {(item.description || item.updated?.description || item.edit_note || item.caption) && (
                        <p className="text-xs text-stone-200 font-sans leading-relaxed italic bg-black/30 p-2.5 rounded-xl border border-white/10">
                          "{item.description || item.updated?.description || item.edit_note || item.caption}"
                        </p>
                      )}

                      {/* Reviewer Note if rejected */}
                      {item.review_note && itemStatus === 'rejected' && (
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 font-sans">
                          <strong>Moderator Note:</strong> {item.review_note}
                        </div>
                      )}

                      {/* Attached Photos Strip */}
                      {photos.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-stone-300 font-sans uppercase tracking-wider">
                            Attached Photos ({photos.length}):
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto py-1">
                            {photos.map((p, idx) => (
                              <div
                                key={p.id || idx}
                                className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 flex-shrink-0 group"
                              >
                                <img src={p.dataUrl} alt={p.caption || ''} className="w-full h-full object-cover" />
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

                      {/* Diff Toggle for Edits */}
                      {isEdit && item.diff && (
                        <div className="pt-1">
                          <button
                            onClick={() => setExpandedDiffId(expandedDiffId === itemId ? null : itemId)}
                            className="text-xs text-amber-300 hover:text-white font-bold underline cursor-pointer"
                          >
                            {expandedDiffId === itemId ? 'Hide Field Changes ▲' : 'Inspect Field Changes ▼'}
                          </button>

                          {expandedDiffId === itemId && (
                            <div className="mt-2.5 p-3.5 bg-black/60 border border-white/15 rounded-xl space-y-2.5 text-xs">
                              {Object.entries(item.diff).map(([key, change]) => (
                                <div key={key} className="space-y-1">
                                  <span className="font-mono text-amber-300 font-bold capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                                    <div className="p-2 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 break-words">
                                      <span className="text-red-400 font-black block text-[10px] uppercase mb-0.5">
                                        Canonical:
                                      </span>
                                      {String(change.from || '(empty)')}
                                    </div>
                                    <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 break-words">
                                      <span className="text-emerald-400 font-black block text-[10px] uppercase mb-0.5">
                                        Proposed:
                                      </span>
                                      {String(change.to || '(empty)')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Action Row */}
                      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              onClose()
                              onSelectTemple?.(item.updated || item)
                            }}
                            className="text-amber-300 hover:text-amber-100 font-bold underline cursor-pointer"
                          >
                            View on Map ↗
                          </button>
                          {isEdit && (
                            <button
                              onClick={() => {
                                onClose()
                                onOpenEditModal?.(item.updated || item)
                              }}
                              className="text-stone-300 hover:text-white font-medium cursor-pointer"
                            >
                              Edit Again
                            </button>
                          )}
                        </div>

                        {/* Maintainer Approval Controls (Strictly hidden from regular submitters) */}
                        {isMaintainer ? (
                          <div className="flex items-center gap-2">
                            {itemStatus !== 'approved' && (
                              <button
                                onClick={() => handleApprove(itemId, titleName)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>🟢</span>
                                <span>Approve</span>
                              </button>
                            )}
                            {itemStatus !== 'rejected' && (
                              <button
                                onClick={() => handleReject(itemId, titleName)}
                                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-rose-500/25 border border-stone-600 text-stone-200 hover:text-rose-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span>🔴</span>
                                <span>Request Revision</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 font-sans italic">
                            Devotee Submitter View (Pending maintainer review)
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-stone-950/95 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-300 font-medium">
              <span className="text-base">💡</span>
              <span>
                Moderation workflow: approve submissions locally or export approved JSON for the GitHub repository.
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>

        {/* Maintainer Access Authentication Dialog */}
        {showAuthModal && (
          <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-lg bg-[#181622] border border-amber-500/50 rounded-2xl shadow-2xl p-6 text-stone-100 space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-xl bg-purple-600/20 border border-purple-400/30 select-none">
                  🐙
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-cinzel text-white">
                    Maintainer Moderation Access
                  </h3>
                  <p className="text-xs text-stone-300 font-sans">
                    Restricted exclusively to repository maintainer (<strong className="text-purple-300">@anonyxhappie</strong>)
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-stone-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <span>🛡️</span>
                  <span>Cryptographic GitHub Verification (Zero Passwords in Code)</span>
                </div>
                <p className="leading-relaxed text-stone-300">
                  Divine India verifies push/admin permissions for repository <strong>anonyxhappie/DivineIndia</strong> directly against the official GitHub API. Unauthenticated visitors cannot approve, reject, or modify records.
                </p>
              </div>

              <form onSubmit={handleLoginMaintainer} className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-300">
                      GitHub Personal Access Token (PAT)
                    </label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=Divine+India+Maintainer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                    >
                      Generate token (repo scope) ↗
                    </a>
                  </div>
                  <input
                    type="password"
                    autoFocus
                    value={gitHubTokenInput}
                    onChange={(e) => {
                      setGitHubTokenInput(e.target.value)
                      if (authError) setAuthError('')
                    }}
                    placeholder="ghp_... or github_pat_..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-stone-100 placeholder-stone-500 text-sm font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="accent-purple-500 rounded cursor-pointer"
                    />
                    <span>Remember maintainer session on this trusted browser</span>
                  </label>
                </div>

                {authError && (
                  <p className="text-xs text-rose-400 font-medium pt-1 flex items-start gap-1.5 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
                    <span className="text-sm flex-shrink-0">⚠️</span>
                    <span>{authError}</span>
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(false)
                      setGitHubTokenInput('')
                      setAuthError('')
                    }}
                    className="px-4 py-2 text-xs font-medium rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingAuth || !gitHubTokenInput.trim()}
                    className="px-5 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 hover:brightness-110 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isVerifyingAuth ? (
                      <>
                        <span className="inline-block animate-spin text-xs">⏳</span>
                        <span>Verifying with GitHub...</span>
                      </>
                    ) : (
                      <span>Verify & Unlock Maintainer Mode</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  )
}
