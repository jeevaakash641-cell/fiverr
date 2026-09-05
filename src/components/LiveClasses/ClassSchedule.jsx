import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'
import { Video, Play, Search, ArrowLeft, Upload, Download, RefreshCw, Calendar, Users } from 'lucide-react'

const RecordedClasses = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recordings, setRecordings] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const refreshIntervalRef = useRef(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadRecordings()

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(refreshIntervalRef.current)
      } else {
        loadRecordings(true)
        refreshIntervalRef.current = setInterval(() => loadRecordings(true), 15000)
      }
    }

    refreshIntervalRef.current = setInterval(() => loadRecordings(true), 15000)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(refreshIntervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, navigate])

  useEffect(() => { if (user) loadRecordings() }, [filter])

  const loadRecordings = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const videos = await response.json()
      const transformed = videos.map(v => ({
        id: v.key, key: v.key,
        title: v.title || v.name || 'Untitled Video',
        description: v.description || '',
        subject: v.subject || 'General',
        class: v.class || 'N/A',
        teacherName: v.uploadedBy || 'Unknown Teacher',
        teacherId: v.uploadedBy || 'unknown',
        uploadedAt: v.lastModified || v.uploadedAt || new Date().toISOString(),
        duration: parseInt(v.duration) || 0,
        size: v.size,
        // Use streamUrl from S3 service (relative path to backend)
        url: v.streamUrl || v.url || null,
        streamUrl: v.streamUrl || null,
      }))
      let filtered = transformed
      if (filter === 'my-uploads' && user.userType === 'teacher')
        filtered = transformed.filter(r => r.teacherId === user.email || r.teacherId === user.id)
      setRecordings(filtered)
      setLastFetchTime(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatDuration = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m` }
  const formatSize = (b) => { if (!b) return ''; const k = 1024, s = ['B','KB','MB','GB'], i = Math.floor(Math.log(b)/Math.log(k)); return (b/Math.pow(k,i)).toFixed(1)+' '+s[i] }

  const filtered = recordings.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      {/* Header */}
      <header className="edu-dashboard-header">
        <div className="edu-dashboard-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/dashboard" style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={16} color="#374151" />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', lineHeight: 1 }}>Recorded Classes</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  {recordings.length} video{recordings.length !== 1 ? 's' : ''} available
                  {lastFetchTime && ` · Updated ${new Date(lastFetchTime).toLocaleTimeString()}`}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => loadRecordings()} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              Refresh
            </button>
            {user.userType === 'teacher' && (
              <Link to="/upload-recording"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                <Upload size={14} /> Upload
              </Link>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* Error */}
        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Error Loading Videos</div>
              <div style={{ fontSize: 13, color: '#b91c1c' }}>{error}</div>
              <button onClick={() => loadRecordings()} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 8, background: '#ef4444', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: 10, padding: 4, border: '1px solid #e5e7eb' }}>
            {['all', ...(user.userType === 'teacher' ? ['my-uploads'] : [])].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === f ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent', color: filter === f ? 'white' : '#6b7280' }}>
                {f === 'all' ? 'All Recordings' : 'My Uploads'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Search recordings…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', background: 'white', color: '#1a1a2e', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7280', fontSize: 14 }}>Loading recordings…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Video size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              {searchTerm ? 'No matching recordings' : 'No recordings yet'}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
              {searchTerm ? 'Try different search terms' : 'No recorded classes available yet'}
            </p>
            {user.userType === 'teacher' && !searchTerm && (
              <Link to="/upload-recording"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                <Upload size={16} /> Upload First Recording
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(rec => (
              <div key={rec.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 20px rgba(79,70,229,0.07)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(79,70,229,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,70,229,0.07)' }}>
                {/* Thumbnail */}
                <div style={{ height: 180, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Video size={48} color="rgba(255,255,255,0.7)" />
                  {rec.duration > 0 && (
                    <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: 12, padding: '2px 8px', borderRadius: 6 }}>
                      {formatDuration(rec.duration)}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{rec.title}</h3>
                  {rec.description && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{rec.description}</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                      <Users size={13} /> {rec.teacherName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                      <Calendar size={13} /> {formatDate(rec.uploadedAt)}
                    </div>
                    {rec.size && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}><Download size={13} /> {formatSize(rec.size)}</div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: '#eef2ff', color: '#4f46e5', fontSize: 12, fontWeight: 600 }}>{rec.subject}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f4f5f7', color: '#6b7280', fontSize: 12 }}>Class {rec.class}</span>
                  </div>
                  <button onClick={() => navigate(`/watch-recording/${encodeURIComponent(rec.id)}`)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    <Play size={15} /> Watch Recording
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default RecordedClasses
