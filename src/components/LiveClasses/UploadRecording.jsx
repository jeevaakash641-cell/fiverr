import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Upload, Video, ArrowLeft, FileVideo, CheckCircle, AlertCircle, X } from 'lucide-react'
import { API_BASE_URL } from '../../config'

const UploadRecording = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ title: '', description: '', subject: '', class: '', tags: '' })
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)

  const handleInputChange = e => setFormData({ ...formData, [e.target.name]: e.target.value })

  const validateVideoFile = (file) => {
    const valid = ['video/mp4','video/webm','video/ogg','video/avi','video/mov','video/quicktime']
    const errors = []
    if (!file) { errors.push('No file selected'); return { isValid: false, errors } }
    if (!valid.includes(file.type)) errors.push('Invalid file type. Use MP4, WebM, OGG, AVI, or MOV')
    if (file.size > 500 * 1024 * 1024) errors.push('File must be less than 500MB')
    if (file.size < 1024) errors.push('File is too small')
    return { isValid: errors.length === 0, errors }
  }

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const v = validateVideoFile(file)
    if (!v.isValid) { alert(v.errors.join('\n')); return }
    setVideoFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) { alert('Please select JPEG, PNG, or WebP'); return }
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!videoFile) { alert('Please select a video file'); return }
    if (!formData.title || !formData.subject || !formData.class) { alert('Please fill in all required fields'); return }
    setUploading(true); setUploadProgress(0)
    try {
      const data = new FormData()
      // Backend multer expects field name 'videoFile'
      data.append('videoFile', videoFile)
      data.append('title', formData.title)
      data.append('description', formData.description)
      data.append('subject', formData.subject)
      data.append('class', formData.class)
      data.append('tags', formData.tags)
      data.append('uploadedBy', user.email || user.name || 'Unknown')
      // Required by backend validation
      data.append('state', user.selectedState || 'All States')
      data.append('medium', user.mediumName || 'English Medium')
      data.append('language', user.stateLanguage || 'English')

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 95))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
          else {
            let msg = `Upload failed (${xhr.status})`
            try { msg = JSON.parse(xhr.response)?.message || msg } catch {}
            reject(new Error(msg))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.open('POST', `${API_BASE_URL}/api/videos/upload`)
        xhr.send(data)
      })

      setUploadProgress(100)
      setTimeout(() => { alert('Recording uploaded successfully!'); navigate('/live-classes') }, 800)
    } catch (err) {
      alert('Upload failed: ' + err.message)
      setUploading(false); setUploadProgress(0)
    }
  }

  if (!user || user.userType !== 'teacher') return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', background: 'white', borderRadius: 16, padding: 40, border: '1px solid #e5e7eb', maxWidth: 400 }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>Only teachers can upload recordings</p>
        <Link to="/dashboard" className="edu-btn-primary">Go to Dashboard</Link>
      </div>
    </div>
  )

  const inputStyle = { width: '100%', padding: '11px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', color: '#1a1a2e', background: '#fafafa', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }
  const cardStyle = { background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: '24px 28px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)', marginBottom: 20 }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      <header className="edu-dashboard-header">
        <div className="edu-dashboard-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/live-classes" style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={16} color="#374151" />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', lineHeight: 1 }}>Upload Recording</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Share your educational content</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          {/* Video Upload */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <FileVideo size={20} color="#4f46e5" />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>Video File</h2>
            </div>
            {!videoFile ? (
              <label htmlFor="video-upload" style={{ display: 'block', border: '2px dashed #c7d2fe', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#c7d2fe'}>
                <Upload size={36} color="#a5b4fc" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 4 }}>Upload Video File</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Drag and drop or click to select</div>
                <span style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', fontSize: 13, fontWeight: 700 }}>Choose File</span>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>MP4, WebM, OGG, AVI, MOV · Max 500MB</div>
                <input type="file" accept="video/*" onChange={handleVideoChange} id="video-upload" style={{ display: 'none' }} />
              </label>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={20} color="#059669" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#065f46' }}>{videoFile.name}</div>
                      <div style={{ fontSize: 12, color: '#059669' }}>{(videoFile.size / (1024*1024)).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setVideoFile(null); setPreviewUrl(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={18} /></button>
                </div>
                {previewUrl && <video src={previewUrl} controls style={{ width: '100%', maxHeight: 280, borderRadius: 10 }} />}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 16 }}>Thumbnail <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 13 }}>(Optional)</span></h2>
            {!thumbnailFile ? (
              <label htmlFor="thumb-upload" style={{ display: 'block', border: '2px dashed #e5e7eb', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer' }}>
                <Video size={28} color="#d1d5db" style={{ margin: '0 auto 8px' }} />
                <span style={{ padding: '6px 16px', borderRadius: 8, background: '#f4f5f7', color: '#374151', fontSize: 13, fontWeight: 600 }}>Choose Thumbnail</span>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>JPEG, PNG, WebP · Recommended 1280×720</div>
                <input type="file" accept="image/*" onChange={handleThumbnailChange} id="thumb-upload" style={{ display: 'none' }} />
              </label>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={thumbnailPreview} alt="Thumbnail" style={{ width: 120, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{thumbnailFile.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{(thumbnailFile.size/1024).toFixed(1)} KB</div>
                </div>
                <button type="button" onClick={() => { setThumbnailFile(null); setThumbnailPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={18} /></button>
              </div>
            )}
          </div>

          {/* Details */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 20 }}>Recording Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Enter recording title" style={inputStyle} required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe what this recording covers" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Subject *</label>
                <select name="subject" value={formData.subject} onChange={handleInputChange} style={inputStyle} required>
                  <option value="">Select Subject</option>
                  {['Mathematics','Science','English','Hindi','Social Studies','Physics','Chemistry','Biology','Computer Science'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Class *</label>
                <select name="class" value={formData.class} onChange={handleInputChange} style={inputStyle} required>
                  <option value="">Select Class</option>
                  {[...Array(12)].map((_,i) => <option key={i+1} value={i+1}>Class {i+1}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tags <span style={{ fontWeight: 400, color: '#9ca3af' }}>(Optional)</span></label>
                <input type="text" name="tags" value={formData.tags} onChange={handleInputChange} placeholder="algebra, equations, basics" style={inputStyle} />
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Separate tags with commas</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {uploading && (
            <div style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 12 }}>Uploading…</div>
              <div style={{ height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', borderRadius: 99, width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{Math.round(uploadProgress)}% complete</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Link to="/live-classes" style={{ padding: '11px 24px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Cancel</Link>
            <button type="submit" disabled={uploading || !videoFile}
              style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: uploading || !videoFile ? 'not-allowed' : 'pointer', opacity: uploading || !videoFile ? 0.6 : 1 }}>
              {uploading ? 'Uploading…' : 'Upload Recording'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default UploadRecording
