import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Video, Download, Play, Search, Filter, Upload, Clock } from 'lucide-react'
import { API_BASE_URL } from '../config'

const Videos = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [videos, setVideos] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    loadVideos()
  }, [user, navigate])

  const loadVideos = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/videos`)
      
      if (!response.ok) {
        throw new Error('Failed to load videos')
      }
      
      const allVideos = await response.json()
      console.log('📹 Loaded videos:', allVideos.length)
      
      // Filter videos based on user profile
      const filteredVideos = allVideos.filter(video => {
        const matchesState = !user.selectedState || video.state === user.selectedState || video.state === 'All States'
        const matchesClass = !user.class || video.class === user.class.toString()
        const matchesMedium = !user.selectedMedium || video.medium === 'both' || video.medium === user.selectedMedium
        
        return matchesState && matchesClass && matchesMedium
      })
      
      console.log('📹 Filtered videos:', filteredVideos.length)
      setVideos(filteredVideos)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading videos:', error)
      setIsLoading(false)
    }
  }

  const uniqueSubjects = [...new Set(videos.map(video => video.subject))].sort()
  const subjects = [
    { id: 'all', name: 'All Subjects' },
    ...uniqueSubjects.map(s => ({ id: s, name: s }))
  ]

  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchTerm || 
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (video.topic && video.topic.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesSubject = selectedSubject === 'all' || video.subject === selectedSubject
    
    return matchesSearch && matchesSubject
  })

  const handlePlay = async (video) => {
    try {
      console.log('▶️ Playing video:', video.title)
      
      // Navigate to video player with video key as ID
      navigate(`/watch-recording/${encodeURIComponent(video.key)}`)
    } catch (error) {
      console.error('Play error:', error)
      alert('Failed to play video: ' + error.message)
    }
  }

  const handleDownload = async (video) => {
    try {
      console.log('📥 Downloading video:', video.title)
      
      const response = await fetch(`${API_BASE_URL}/api/videos/${encodeURIComponent(video.key)}/download`)
      if (!response.ok) throw new Error('Failed to get download URL')
      
      const data = await response.json()
      
      // Open download URL in new tab
      const link = document.createElement('a')
      link.href = data.url
      link.download = video.fileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('✅ Download started')
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download video: ' + error.message)
    }
  }

  const VideoCard = ({ video }) => (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-200 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden cursor-pointer"
           onClick={() => handlePlay(video)}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-10"></div>
        <div className="text-center z-10">
          <div className="bg-white bg-opacity-90 rounded-full p-4 mb-2 inline-block">
            <Play className="h-12 w-12 text-purple-600" />
          </div>
          <div className="text-xs font-semibold text-purple-700 bg-white bg-opacity-80 px-2 py-1 rounded">
            {video.subject}
          </div>
        </div>
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {video.duration}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">{video.title}</h3>
          {video.topic && (
            <p className="text-sm text-purple-600 font-medium">{video.topic}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            {video.subject}
          </span>
          <span className="text-gray-500">Class {video.class}</span>
          {video.chapter && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {video.chapter}
            </span>
          )}
        </div>

        {video.term && (
          <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded inline-block">
            Term {video.term}
          </div>
        )}

        <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <span>{video.size}</span>
          <span>{video.format}</span>
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => handlePlay(video)}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>Play</span>
          </button>
          
          <button
            onClick={() => handleDownload(video)}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div className="flex items-center space-x-3">
                <Video className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Video Lectures</h1>
                  <p className="text-sm text-gray-600">Watch recorded lessons and tutorials</p>
                </div>
              </div>
            </div>
            
            {user.userType === 'teacher' && (
              <Link to="/upload-videos" className="btn btn-primary">
                <Upload className="h-4 w-4 mr-2" />
                Upload Videos
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search videos, topics, or subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            >
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Videos Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} 
            {user.class && ` for Class ${user.class}`}
            {user.selectedState && ` - ${user.selectedState}`}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading videos...</p>
          </div>
        )}

        {/* Videos Grid */}
        {!isLoading && filteredVideos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredVideos.length === 0 && (
          <div className="text-center py-16">
            <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No videos found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No videos available for your class'}
            </p>
          </div>
        )}

        {/* Upload Section for Teachers */}
        {user.userType === 'teacher' && !isLoading && (
          <div className="mt-12 card bg-purple-50 border-2 border-dashed border-purple-300">
            <div className="text-center py-8">
              <Video className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Share Your Knowledge</h3>
              <p className="text-purple-600 mb-4">Upload recorded lectures for your students</p>
              <Link to="/upload-videos" className="btn btn-primary">
                Upload Videos
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Videos
