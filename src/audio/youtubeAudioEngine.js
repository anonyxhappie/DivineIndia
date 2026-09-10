import { YOUTUBE_BHAKTI_TRACKS, parseYoutubeInput } from './youtubeBhaktiPlaylists.js'

/**
 * YouTubeAudioEngine — Manages background playback of YouTube Bhakti playlists & tracks.
 *
 * Provides headless playback control, auto-advance, volume management, and error recovery.
 */

let apiLoadingPromise = null
let activeEngine = null

function loadYouTubeIframeAPI() {
  if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }

  if (!apiLoadingPromise) {
    apiLoadingPromise = new Promise((resolve) => {
      let resolved = false
      const checkAndResolve = () => {
        if (!resolved && typeof window !== 'undefined' && window.YT && window.YT.Player) {
          resolved = true
          resolve(window.YT)
        }
      }

      const prevReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') prevReady()
        checkAndResolve()
      }

      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
          clearInterval(checkInterval)
          checkAndResolve()
        }
      }, 100)

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        tag.async = true
        const firstScript = document.getElementsByTagName('script')[0]
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(tag, firstScript)
        } else {
          document.head.appendChild(tag)
        }
      }
    })
  }

  return apiLoadingPromise
}

export class YouTubeAudioEngine {
  constructor() {
    this.player = null
    this.isReady = false
    this.isPlaying = false
    this.isBuffering = false
    this.volume = 0.8
    this.currentTrackIndex = 0
    this.customTrack = null
    this.pendingTrack = null
    this._bufferWatchdog = null
    this._isDestroyed = false
    this.callbacks = {
      onStateChange: () => {},
      onTrackChange: () => {},
      onError: () => {},
    }
  }

  _clearBufferWatchdog() {
    if (this._bufferWatchdog) {
      clearTimeout(this._bufferWatchdog)
      this._bufferWatchdog = null
    }
  }

  get tracks() {
    if (this.customTrack) {
      return [this.customTrack, ...YOUTUBE_BHAKTI_TRACKS]
    }
    return YOUTUBE_BHAKTI_TRACKS
  }

  get currentTrack() {
    if (this.customTrack && this.currentTrackIndex === 0) {
      return this.customTrack
    }
    const trackList = this.tracks
    const idx = Math.max(0, Math.min(this.currentTrackIndex, trackList.length - 1))
    return trackList[idx] || YOUTUBE_BHAKTI_TRACKS[0]
  }

  async init(elementId, callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks }
    this._isDestroyed = false

    // Shutdown previous engine instance if exists (e.g. React StrictMode double mount)
    if (activeEngine && activeEngine !== this) {
      activeEngine.destroy()
    }
    activeEngine = this

    const YT = await loadYouTubeIframeAPI()
    if (this._isDestroyed) return this

    // Clean up any stray player instance globally
    if (typeof window !== 'undefined' && window.__divine_yt_player__) {
      try {
        window.__divine_yt_player__.destroy()
      } catch {}
      window.__divine_yt_player__ = null
    }

    const initialTrack = this.currentTrack

    // Ensure DOM mount element exists
    let mountEl = document.getElementById(elementId)
    if (!mountEl) {
      const container = document.getElementById('youtube-bg-player-container') || document.body
      const newMount = document.createElement('div')
      newMount.id = elementId
      container.appendChild(newMount)
    }

    return new Promise((resolve) => {
      const playerVars = {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
      }

      if (typeof window !== 'undefined' && window.location.origin) {
        playerVars.origin = window.location.origin
      }

      try {
        this.player = new YT.Player(elementId, {
          height: '140',
          width: '240',
          videoId: initialTrack.videoId || 'ijfLsKg8jFY',
          playerVars,
          events: {
            onReady: (event) => {
              if (this._isDestroyed) {
                try { event.target.destroy() } catch {}
                return
              }
              this.isReady = true
              if (typeof window !== 'undefined') {
                window.__divine_yt_player__ = event.target
              }
              try {
                event.target.setVolume(Math.round(this.volume * 100))
                if (this.pendingTrack) {
                  const target = this.pendingTrack
                  this.pendingTrack = null
                  this.loadTrack(target)
                } else if (this.pendingPlay !== false) {
                  this.pendingPlay = null
                  event.target.playVideo()
                }
              } catch (err) {
                console.warn('[YouTubeAudioEngine] onReady play failed:', err)
              }
              resolve(this)
            },
            onStateChange: (event) => {
              if (this._isDestroyed) return
              this._handleStateChange(event.data)
            },
            onError: (event) => {
              if (this._isDestroyed) return
              this._clearBufferWatchdog()
              console.warn('[YouTubeAudioEngine] Player error code:', event.data)
              this.isBuffering = false
              this.callbacks.onStateChange({ isPlaying: false, isBuffering: false })
              this.callbacks.onError(event.data)

              // If a specific track fails or is restricted, advance to next track smoothly
              setTimeout(() => {
                if (!this._isDestroyed) {
                  this.next()
                }
              }, 1200)
            },
          },
        })
      } catch (err) {
        console.warn('[YouTubeAudioEngine] Failed to initialize YT.Player:', err)
        resolve(this)
      }
    })
  }

  _handleStateChange(stateCode) {
    if (typeof window === 'undefined' || !window.YT) return

    switch (stateCode) {
      case window.YT.PlayerState.PLAYING:
        this._clearBufferWatchdog()
        this.isPlaying = true
        this.isBuffering = false
        this.callbacks.onStateChange({ isPlaying: true, isBuffering: false })
        break

      case window.YT.PlayerState.PAUSED:
        this._clearBufferWatchdog()
        this.isPlaying = false
        this.isBuffering = false
        this.callbacks.onStateChange({ isPlaying: false, isBuffering: false })
        break

      case window.YT.PlayerState.BUFFERING:
        this.isBuffering = true
        this.callbacks.onStateChange({ isPlaying: true, isBuffering: true })
        this._clearBufferWatchdog()
        // If buffering takes longer than 3.5s, unfreeze and nudge player
        this._bufferWatchdog = setTimeout(() => {
          if (this.isBuffering && this.player) {
            try {
              if (this.isPlaying && typeof this.player.playVideo === 'function') {
                this.player.playVideo()
              }
            } catch {}
            this.isBuffering = false
            this.callbacks.onStateChange({ isPlaying: this.isPlaying, isBuffering: false })
          }
        }, 3500)
        break

      case window.YT.PlayerState.CUED:
      case -1: // UNSTARTED
        // Track metadata loaded in headless iframe; ensure play command is fulfilled
        if (this.isPlaying && this.player && typeof this.player.playVideo === 'function') {
          try {
            this.player.playVideo()
          } catch (err) {
            console.warn('[YouTubeAudioEngine] CUED playVideo failed:', err)
          }
        } else {
          this._clearBufferWatchdog()
          this.isBuffering = false
          this.callbacks.onStateChange({ isPlaying: this.isPlaying, isBuffering: false })
        }
        break

      case window.YT.PlayerState.ENDED:
        this._clearBufferWatchdog()
        this.isPlaying = false
        this.isBuffering = false
        this.callbacks.onStateChange({ isPlaying: false, isBuffering: false })
        // Auto play next track
        this.next()
        break

      default:
        break
    }
  }

  play() {
    this._clearBufferWatchdog()
    this.isPlaying = true
    this.isBuffering = true
    this.callbacks.onStateChange({ isPlaying: true, isBuffering: true })

    if (this.player && this.isReady && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo()
      } catch (err) {
        console.warn('[YouTubeAudioEngine] play failed:', err)
      }
    } else {
      this.pendingPlay = true
    }

    // Safety watchdog: clear buffering state if play doesn't trigger PLAYING within 3.5s
    this._bufferWatchdog = setTimeout(() => {
      if (this.isBuffering) {
        this.isBuffering = false
        this.callbacks.onStateChange({ isPlaying: this.isPlaying, isBuffering: false })
      }
    }, 3500)
  }

  pause() {
    this._clearBufferWatchdog()
    this.isPlaying = false
    this.isBuffering = false
    this.callbacks.onStateChange({ isPlaying: false, isBuffering: false })

    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo()
      } catch (err) {
        console.warn('[YouTubeAudioEngine] pause failed:', err)
      }
    }
  }

  loadTrack(trackOrId) {
    if (this._isDestroyed) return
    this._clearBufferWatchdog()
    let track = null
    if (typeof trackOrId === 'string') {
      const idx = this.tracks.findIndex((t) => t.id === trackOrId)
      if (idx !== -1) {
        this.currentTrackIndex = idx
        track = this.tracks[idx]
      }
    } else if (typeof trackOrId === 'object' && trackOrId !== null) {
      track = trackOrId
      const idx = this.tracks.findIndex((t) => t.id === track.id)
      if (idx !== -1) {
        this.currentTrackIndex = idx
      } else {
        // Custom track
        this.customTrack = track
        this.currentTrackIndex = 0
      }
    }

    if (!track) track = this.currentTrack

    this.isPlaying = true
    this.isBuffering = true
    this.callbacks.onTrackChange(this.currentTrack)
    this.callbacks.onStateChange({ isPlaying: true, isBuffering: true })

    // Safety watchdog for track loading
    this._bufferWatchdog = setTimeout(() => {
      if (this.isBuffering && this.player && !this._isDestroyed) {
        try {
          if (this.isPlaying && typeof this.player.playVideo === 'function') {
            this.player.playVideo()
          }
        } catch {}
        this.isBuffering = false
        this.callbacks.onStateChange({ isPlaying: this.isPlaying, isBuffering: false })
      }
    }, 3500)

    if (this.player && this.isReady) {
      const vid = track.videoId || 'ijfLsKg8jFY'
      try {
        // Standard YouTube JS API: loadVideoById(videoId, startSeconds)
        if (typeof this.player.loadVideoById === 'function') {
          this.player.loadVideoById(vid, 0)
        } else if (typeof this.player.cueVideoById === 'function') {
          this.player.cueVideoById(vid, 0)
          if (typeof this.player.playVideo === 'function') {
            this.player.playVideo()
          }
        }
      } catch (err) {
        console.warn('[YouTubeAudioEngine] loadTrack failed, retrying with cueVideoById:', err)
        try {
          if (typeof this.player.cueVideoById === 'function') {
            this.player.cueVideoById(vid, 0)
            this.player.playVideo()
          }
        } catch {}
      }

      // Check after 500ms to nudge play if in CUED state
      setTimeout(() => {
        if (!this._isDestroyed && this.player && this.isPlaying && typeof this.player.getPlayerState === 'function') {
          try {
            const s = this.player.getPlayerState()
            if (s === 5 || s === -1 || s === 2) {
              this.player.playVideo()
            }
          } catch {}
        }
      }, 500)
    } else {
      this.pendingTrack = track
    }
  }

  next() {
    const list = this.tracks
    this.currentTrackIndex = (this.currentTrackIndex + 1) % list.length
    const nextTrack = list[this.currentTrackIndex]
    this.loadTrack(nextTrack)
  }

  prev() {
    const list = this.tracks
    this.currentTrackIndex = (this.currentTrackIndex - 1 + list.length) % list.length
    const prevTrack = list[this.currentTrackIndex]
    this.loadTrack(prevTrack)
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(Math.round(this.volume * 100))
        if (this.volume === 0) {
          this.player.mute()
        } else {
          this.player.unMute()
        }
      } catch (err) {
        console.warn('[YouTubeAudioEngine] setVolume failed:', err)
      }
    }
  }

  loadCustomInput(rawInput) {
    const parsed = parseYoutubeInput(rawInput)
    if (!parsed) return false

    const custom = {
      id: `custom_${Date.now()}`,
      name: parsed.type === 'playlist' ? '📿 Custom YouTube Playlist' : '▶ Custom YouTube Bhajan',
      title: parsed.type === 'playlist' ? 'User Custom Devotional Playlist' : 'User Custom Devotional Track',
      artist: 'Custom Stream',
      deity: 'Bhakti Stream',
      icon: parsed.type === 'playlist' ? '📿' : '▶',
      badge: 'Custom URL',
      type: parsed.type,
      videoId: parsed.videoId,
      playlistId: parsed.playlistId,
      url: rawInput,
      description: 'Streamed directly from provided YouTube link.',
    }

    this.customTrack = custom
    this.currentTrackIndex = 0
    this.loadTrack(custom)
    return true
  }

  destroy() {
    this._isDestroyed = true
    this._clearBufferWatchdog()
    if (activeEngine === this) {
      activeEngine = null
    }
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy()
      } catch {}
      this.player = null
    }
    if (typeof window !== 'undefined' && window.__divine_yt_player__ === this.player) {
      window.__divine_yt_player__ = null
    }
    this.isReady = false
    this.isPlaying = false
    this.isBuffering = false
  }
}
