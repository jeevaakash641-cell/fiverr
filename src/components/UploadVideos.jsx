import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Upload, Video, X, CheckCircle, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '../config'

const UploadVideos = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  if (!user || user.userType !== 'teacher') {
    navigate('/dashboard')
    return null
  }

  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    subject: '',
    class: '',
    topic: '',
    chapter: '',
    term: '',
    duration: '',
    state: user.selectedState || 'Uttarakhand',
    medium: user.selectedMedium || 'state',
    language: user.stateLanguage || 'Hindi'
  })

  const getSubjectsForState = (state) => {
    const commonSubjects = [
      'English', 'Maths', 'Science', 'Social', 'EVS',
      'Physics', 'Chemistry', 'Biology', 'Computer Science',
      'Commerce', 'Accountancy', 'Business Maths', 'History',
      'Geography', 'Economics', 'Political Science'
    ]

    const stateLanguages = {
      'Tamil Nadu': 'Tamil',
      'Andhra Pradesh': 'Telugu',
      'Telangana': 'Telugu',
      'Karnataka': 'Kannada',
      'Kerala': 'Malayalam',
      'Maharashtra': 'Marathi',
      'Gujarat': 'Gujarati',
      'Rajasthan': 'Hindi',
      'Madhya Pradesh': 'Hindi',
      'Uttar Pradesh': 'Hindi',
      'Bihar': 'Hindi',
      'Jharkhand': 'Hindi',
      'Chhattisgarh': 'Hindi',
      'Uttarakhand': 'Hindi',
      'Himachal Pradesh': 'Hindi',
      'Haryana': 'Hindi',
      'Punjab': 'Punjabi',
      'West Bengal': 'Bengali',
      'Odisha': 'Odia',
      'Assam': 'Assamese'
    }

    const stateLanguage = stateLanguages[state]
    if (stateLanguage && !commonSubjects.includes(stateLanguage)) {
      return [stateLanguage, ...commonSubjects]
    }
    return commonSubjects
  }

  const subjects = getSubjectsForState(videoData.state)
  const classes = Array.from({ length: 12 }, (_, i) => i + 1)
  const terms = [
    { id: '', name: 'No Term (Full Year)' },
    { id: '1', name: 'Term 1' },
    { id: '2', name: 'Term 2' },
    { id: '3', name: 'Term 3' }
  ]

  const handleInputChange = (e) => {
    setVideoData({
      ...videoData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    
    files.forEach(file => {
      const isVideo = file.type.startsWith('video/')
      const isUnder500MB = file.size <= 500 * 1024 * 1024
      
      if (isVideo && isUnder500MB) {
        const newFile = {
          id: Date.now() + Math.random(),
          file: file,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          status: 'ready',
          progress: 0
        }
        setUploadedFiles(prev => [...prev, newFile])
      } else if (!isVideo) {
        alert(`File ${file.name} is not a video file`)
      } else {
        alert(`File ${file.name} exceeds 500MB limit`)
      }
    })
  }

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one video file')
      return
    }

    if (!videoData.title || !videoData.subject || !videoData.class) {
      alert('Please fill in all required fields')
      return
    }

    setIsUploading(true)

    try {
      for (let fileData of uploadedFiles) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { ...f, status: 'uploading', progress: 50 } : f)
        )

        const formData = new FormData()
        formData.append('videoFile', fileData.file)
        
        Object.keys(videoData).forEach(key => {
          formData.append(key, videoData[key])
        })
        formData.append('uploadedBy', user.email)

        const response = await fetch(`${API_BASE_URL}/api/videos/upload`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const result = await response.json()
        console.log('Upload successful:', result)

        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { ...f, status: 'completed', progress: 100 } : f)
        )
      }

      setIsUploading(false)
      alert(`Successfully uploaded ${uploadedFiles.length} video(s)!`)
      
      setVideoData({
        title: '',
        description: '',
        subject: '',
        class: '',
        topic: '',
        chapter: '',
        term: '',
        duration: '',
        state: user.selectedState || 'Uttarakhand',
        medium: user.selectedMedium || 'state',
        language: user.stateLanguage || 'Hindi'
      })
      setUploadedFiles([])
      navigate('/videos')
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error uploading videos: ' + error.message)
      setIsUploading(false)
      
      setUploadedFiles(prev => 
        prev.map(f => ({ ...f, status: 'ready', progress: 0 }))
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/videos" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="flex items-center space-x-3">
              <Upload className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Upload Videos</h1>
                <p className="text-sm text-gray-600">Add recorded lectures and tutorials</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-800">Upload Instructions</h3>
                <ul className="text-sm text-purple-700 mt-1 space-y-1">
                  <li>• Upload video files up to 500MB each</li>
                  <li>• Supported formats: MP4, WebM, MOV, AVI, MKV</li>
                  <li>• Videos will be organized by state, class, and subject</li>
                  <li>• Students can stream and download videos</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="card">
              <h2 className="text-xl font-semibold mb-6">Video Information</h2>
              
              <div className="grid-2 gap-6">
                <div className="form-group col-span-2">
                  <label>Video Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={videoData.title}
                    onChange={handleInputChange}
                    placeholder="Enter video title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Subject *</label>
                  <select
                    name="subject"
                    value={videoData.subject}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Class *</label>
                  <select
                    name="class"
                    value={videoData.class}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Topic</label>
                  <input
                    type="text"
                    name="topic"
                    value={videoData.topic}
                    onChange={handleInputChange}
                    placeholder="e.g., Algebra, Photosynthesis"
                  />
                </div>

                <div className="form-group">
                  <label>Chapter</label>
                  <input
                    type="text"
                    name="chapter"
                    value={videoData.chapter}
                    onChange={handleInputChange}
                    placeholder="e.g., Chapter 1, Unit 2"
                  />
                </div>

                <div className="form-group">
                  <label>Term (Optional)</label>
                  <select
                    name="term"
                    value={videoData.term}
                    onChange={handleInputChange}
                  >
                    {terms.map(term => (
                      <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Duration (Optional)</label>
                  <input
                    type="text"
                    name="duration"
                    value={videoData.duration}
                    onChange={handleInputChange}
                    placeholder="e.g., 15:30, 1h 20m"
                  />
                </div>

                <div className="form-group col-span-2">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={videoData.description}
                    onChange={handleInputChange}
                    placeholder="Enter video description"
                    rows="4"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-6">Upload Video Files</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Drop video files here or click to browse
                </h3>
                <p className="text-gray-500 mb-4">
                  Maximum file size: 500MB per file. Supported: MP4, WebM, MOV, AVI, MKV
                </p>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="btn btn-primary cursor-pointer inline-block"
                >
                  Choose Videos
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="font-semibold text-gray-700">Files to Upload:</h3>
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Video className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-800">{file.name}</p>
                          <p className="text-sm text-gray-500">{file.size}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {file.status === 'ready' && (
                          <span className="text-sm text-gray-600">Ready</span>
                        )}
                        
                        {file.status === 'uploading' && (
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-purple-600">{file.progress}%</span>
                          </div>
                        )}
                        
                        {file.status === 'completed' && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}

                        {file.status === 'ready' && (
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Link to="/videos" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isUploading || uploadedFiles.length === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : `Upload ${uploadedFiles.length} Video${uploadedFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default UploadVideos
