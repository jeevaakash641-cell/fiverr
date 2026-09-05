import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Settings,
  Download,
  Share2,
  ThumbsUp,
  Eye,
  Calendar,
  User,
  Tag
} from 'lucide-react'

const VideoPlayer = () => {
  const params = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  
  // Extract recordingId from wildcard route
  const recordingId = params['*'] || location.pathname.split('/watch-recording/')[1]
  
  console.log('🎬 VideoPlayer - Recording ID:', recordingId)
  console.log('📍 VideoPlayer - Location:', location.pathname)
  console.log('🔍 VideoPlayer - Params:', params)
  
  const [recording, setRecording] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    console.log('🎯 VideoPlayer mounted')
    console.log('📍 Location:', location.pathname)
    console.log('🆔 Recording ID from params:', params['*'])
    console.log('🆔 Recording ID extracted:', recordingId)
    
    if (!user) {
      console.log('❌ No user, redirecting to login')
      navigate('/login')
      return
    }
    
    if (!recordingId) {
      console.error('❌ No recording ID found!')
      setError('No video ID provided')
      setLoading(false)
      return
    }
    
    loadRecording()
  }, [recordingId, user, navigate])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handleEnded = () => setPlaying(false)

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('ended', handleEnded)
    }
  }, [recording])

  const loadRecording = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🎬 Loading video with ID:', recordingId)
      console.log('🔗 Decoded ID:', decodeURIComponent(recordingId))
      console.log('📍 Full location:', location.pathname)
      
      // Decode the recording ID (it might be URL encoded)
      const decodedId = decodeURIComponent(recordingId)
      
      console.log('🔍 Looking for video with key:', decodedId)
      
      // Fetch all videos to find metadata
      console.log('📡 Fetching video list from API...')
      const response = await fetch(`${API_BASE_URL}/api/videos`)
      
      if (!response.ok) {
        throw new Error(`Failed to load videos: ${response.status} ${response.statusText}`)
      }
      
      const allVideos = await response.json()
      console.log('✅ Received videos:', allVideos.length)
      console.log('📋 Available video keys:', allVideos.map(v => v.key).slice(0, 5))
      
      // Find the video by key (exact match or decoded match)
      const foundVideo = allVideos.find(video => 
        video.key === decodedId || 
        video.key === recordingId ||
        video.id === decodedId ||
        video.id === recordingId
      )
      
      console.log('🔍 Search results:')
      console.log('   Looking for:', decodedId)
      console.log('   Also trying:', recordingId)
      console.log('   Found video:', foundVideo ? foundVideo.title : 'NOT FOUND')
      
      if (!foundVideo) {
        console.error('❌ Video not found in list')
        console.error('Looking for:', decodedId)
        console.error('Available keys:', allVideos.map(v => v.key))
        throw new Error(`Video not found. Looking for: ${decodedId}`)
      }

      console.log('✅ Found video:', foundVideo.name)
      console.log('📹 Video key:', foundVideo.key)
      
      // Now fetch the presigned URL for streaming
      setLoadingUrl(true)
      console.log('🔗 Fetching presigned URL for:', foundVideo.key)
      
      // Use the full key path for the API call
      const encodedKey = encodeURIComponent(foundVideo.key)
      const urlResponse = await fetch(`${API_BASE_URL}/api/videos/${encodedKey}`)
      
      if (!urlResponse.ok) {
        const errorText = await urlResponse.text()
        console.error('❌ URL fetch failed:', errorText)
        throw new Error(`Failed to get video URL: ${urlResponse.status}`)
      }
      
      const urlData = await urlResponse.json()
      console.log('✅ Got presigned URL')
      
      // Validate the URL
      if (!urlData.url) {
        throw new Error('No video URL received from server')
      }
      
      console.log('🔗 Presigned URL received (valid for 1 hour)')
      
      // Transform video data to recording format
      const recordingData = {
        id: foundVideo.key,
        key: foundVideo.key,
        title: foundVideo.title || foundVideo.name || 'Untitled Video',
        description: foundVideo.description || '',
        subject: foundVideo.subject || 'General',
        class: foundVideo.class || 'N/A',
        state: foundVideo.state || 'All States',
        medium: foundVideo.medium || 'both',
        language: foundVideo.language || 'English',
        topic: foundVideo.topic || '',
        chapter: foundVideo.chapter || '',
        term: foundVideo.term || '',
        teacherName: foundVideo.uploadedBy || 'Unknown Teacher',
        teacherId: foundVideo.uploadedBy || 'unknown',
        uploadedAt: foundVideo.lastModified || foundVideo.uploadedAt || new Date().toISOString(),
        duration: parseInt(foundVideo.duration) || 0,
        views: 0,
        size: foundVideo.size,
        fileName: foundVideo.fileName || foundVideo.name,
        format: foundVideo.format || 'MP4',
        videoUrl: urlData.url,
        tags: foundVideo.topic ? [foundVideo.topic] : []
      }
      
      setRecording(recordingData)
      console.log('✅ Video loaded successfully')
      console.log('🎬 Video ready to stream')
      
      // Set up URL refresh before it expires (refresh after 3.5 hours = 210 minutes)
      setTimeout(() => {
        console.log('🔄 Refreshing presigned URL...')
        refreshVideoUrl(foundVideo.key)
      }, 210 * 60 * 1000) // 210 minutes (3.5 hours)
      
    } catch (error) {
      console.error('❌ Error loading video:', error)
      setError(error.message || 'Failed to load video')
    } finally {
      setLoading(false)
      setLoadingUrl(false)
    }
  }

  const refreshVideoUrl = async (videoKey) => {
    try {
      console.log('🔄 Refreshing video URL for:', videoKey)
      const encodedKey = encodeURIComponent(videoKey)
      const urlResponse = await fetch(`${API_BASE_URL}/api/videos/${encodedKey}`)
      
      if (!urlResponse.ok) {
        throw new Error('Failed to refresh video URL')
      }
      
      const urlData = await urlResponse.json()
      
      if (urlData.url && recording) {
        setRecording(prev => ({
          ...prev,
          videoUrl: urlData.url
        }))
        console.log('✅ Video URL refreshed')
        
        // Schedule next refresh (3.5 hours)
        setTimeout(() => refreshVideoUrl(videoKey), 210 * 60 * 1000)
      }
    } catch (error) {
      console.error('❌ Error refreshing video URL:', error)
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (playing) {
      video.pause()
    } else {
      video.play()
    }
    setPlaying(!playing)
  }

  const handleSeek = (e) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * duration
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
    setMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (muted) {
      video.volume = volume
      setMuted(false)
    } else {
      video.volume = 0
      setMuted(true)
    }
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (!fullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setFullscreen(!fullscreen)
  }

  const skip = (seconds) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }

  const changePlaybackRate = (rate) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = rate
    setPlaybackRate(rate)
  }

  const formatTime = (time) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const downloadVideo = async () => {
    try {
      console.log('📥 Downloading video:', recording.title)
      
      const response = await fetch(`${API_BASE_URL}/api/videos/${encodeURIComponent(recording.key)}/download`)
      if (!response.ok) throw new Error('Failed to get download URL')
      
      const data = await response.json()
      
      const link = document.createElement('a')
      link.href = data.url
      link.download = recording.fileName || `${recording.title}.mp4`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('✅ Download started')
    } catch (error) {
      console.error('❌ Download error:', error)
      alert('Failed to download video: ' + error.message)
    }
  }

  const shareVideo = () => {
    if (navigator.share) {
      navigator.share({
        title: recording.title,
        text: recording.description,
        url: window.location.href
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (!user) return null

  if (loading || loadingUrl) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'white', fontSize: 16, marginBottom: 6 }}>{loading ? 'Loading video…' : 'Fetching stream URL…'}</p>
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Please wait</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 24px' }}>
          <div style={{ background: 'white', border: '1px solid #fca5a5', borderRadius: 16, padding: 32, marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>Error Loading Video</h2>
            <p style={{ color: '#b91c1c', fontSize: 14 }}>{error}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={loadRecording} style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
            <Link to="/live-classes" style={{ padding: '10px 24px', borderRadius: 10, background: 'white', border: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, textDecoration: 'none' }}>Back to Videos</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!recording) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Video Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>The video you're looking for doesn't exist.</p>
          <Link to="/live-classes" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', fontWeight: 700, textDecoration: 'none' }}>Back to Videos</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-screen object-contain bg-black"
          controls
          crossOrigin="anonymous"
          preload="metadata"
          onMouseMove={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onError={(e) => {
            console.error('❌ Video playback error:', e)
            console.error('Error code:', e.target.error?.code)
            console.error('Error message:', e.target.error?.message)
            console.error('Current video URL:', recording?.videoUrl?.substring(0, 100) + '...')
            
            let errorMessage = 'Failed to play video. '
            
            switch (e.target.error?.code) {
              case 1: // MEDIA_ERR_ABORTED
                errorMessage += 'Video loading was aborted. Please try again.'
                break
              case 2: // MEDIA_ERR_NETWORK
                errorMessage += 'Network error occurred. Check your internet connection and try again.'
                break
              case 3: // MEDIA_ERR_DECODE
                errorMessage += 'Video file is corrupted or in an unsupported format.'
                break
              case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                errorMessage += 'Video format is not supported or URL has expired. Refreshing...'
                // Try to refresh the URL automatically
                if (recording?.key) {
                  console.log('🔄 Attempting automatic URL refresh...')
                  refreshVideoUrl(recording.key)
                  return // Don't set error yet, let refresh attempt work
                }
                break
              default:
                errorMessage += 'An unknown error occurred. Please refresh the page.'
            }
            
            setError(errorMessage)
          }}
          onLoadStart={() => console.log('📹 Video loading started...')}
          onLoadedMetadata={() => console.log('✅ Video metadata loaded')}
          onCanPlay={() => console.log('✅ Video can start playing')}
          onWaiting={() => console.log('⏳ Video buffering...')}
          onPlaying={() => console.log('▶️ Video playing')}
        >
          <source src={recording.videoUrl} type="video/mp4" />
          <source src={recording.videoUrl} type="video/webm" />
          <source src={recording.videoUrl} type="video/ogg" />
          Your browser does not support the video tag.
        </video>

        {/* Video Controls Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
            <Link to="/live-classes" className="text-white hover:text-gray-300">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="flex items-center space-x-4">
              <button onClick={shareVideo} className="text-white hover:text-gray-300">
                <Share2 className="h-5 w-5" />
              </button>
              <button onClick={downloadVideo} className="text-white hover:text-gray-300">
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Center Play Button */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="bg-white/20 hover:bg-white/30 rounded-full p-6 transition-colors"
              >
                <Play className="h-12 w-12 text-white ml-1" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div
                className="w-full h-2 bg-white/30 rounded-full cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button onClick={togglePlay} className="text-white hover:text-gray-300">
                  {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </button>
                
                <button onClick={() => skip(-10)} className="text-white hover:text-gray-300">
                  <SkipBack className="h-5 w-5" />
                </button>
                
                <button onClick={() => skip(10)} className="text-white hover:text-gray-300">
                  <SkipForward className="h-5 w-5" />
                </button>

                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="text-white hover:text-gray-300">
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>

                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {/* Playback Speed */}
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="bg-white/20 text-white text-sm rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>

                <button onClick={toggleFullscreen} className="text-white hover:text-gray-300">
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Information Panel */}
      <div style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            {/* Main Info */}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 14 }}>{recording.title}</h1>
              <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}><Eye size={14} /> {recording.views || 0} views</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}><Calendar size={14} /> {new Date(recording.uploadedAt).toLocaleDateString()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}><User size={14} /> {recording.teacherName}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: '#eef2ff', color: '#4f46e5', fontSize: 13, fontWeight: 600 }}>{recording.subject}</span>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: '#f4f5f7', color: '#6b7280', fontSize: 13 }}>Class {recording.class}</span>
              </div>
              {recording.description && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Description</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>{recording.description}</p>
                </div>
              )}
              {recording.tags?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Tag size={15} /> Tags</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {recording.tags.map((tag, i) => <span key={i} style={{ padding: '3px 10px', borderRadius: 20, background: '#f4f5f7', color: '#6b7280', fontSize: 13 }}>#{tag}</span>)}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f4f5f7', borderRadius: 14, padding: '18px 20px' }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 12 }}>Instructor</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{recording.teacherName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{recording.subject} Teacher</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f4f5f7', borderRadius: 14, padding: '18px 20px' }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 12 }}>Video Details</h3>
                {[['Duration', formatTime(duration) || recording.duration], ['Format', recording.format || 'video/mp4'], ['Uploaded', new Date(recording.uploadedAt).toLocaleDateString()]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={downloadVideo} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                <Download size={15} /> Download Video
              </button>
              <button onClick={shareVideo} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, background: 'white', border: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                <Share2 size={15} /> Share Video
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default VideoPlayer