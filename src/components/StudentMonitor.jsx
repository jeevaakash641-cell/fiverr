import { useState } from 'react'
import { Search, BookOpen, Award, Clock, AlertTriangle, X, Activity, Heart, Target, TrendingUp, Zap } from 'lucide-react'
import { API_BASE_URL } from '../config'

const StudentMonitor = ({ onClose }) => {
  const [query, setQuery] = useState('')
  const [student, setStudent] = useState(null)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('profile')

  const handleSearch = async () => {
    setError(''); setStudent(null); setActivity(null)
    if (!query.trim()) { setError('Enter a student ID or email'); return }
    setLoading(true)
    try {
      const q = query.trim()
      let found = null

      if (q.includes('@')) {
        const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(q)}`)
        if (res.ok) { const d = await res.json(); if (d.user?.userType === 'student') found = d.user }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/users/search/${encodeURIComponent(q)}`)
        if (res.ok) { const d = await res.json(); found = d.user || null }
      }

      // Fallback: localStorage
      if (!found) {
        const { getRegisteredUsers } = await import('../utils/authStorage')
        const users = getRegisteredUsers()
        found = users.find(u => u.userType === 'student' && (
          u.email?.toLowerCase() === q.toLowerCase() || String(u.id) === q
        )) || null
        if (found) {
          const { syncUserToDb } = await import('../services/userDbService')
          syncUserToDb(found)
        }
      }

      if (!found) { setError('No student found with that ID or email'); return }
      setStudent(found)

      // Fetch activity data from DynamoDB
      if (found.email) {
        const [healthRes, streakRes, pointsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student-data/${encodeURIComponent(found.email)}/health`),
          fetch(`${API_BASE_URL}/api/student-data/${encodeURIComponent(found.email)}/streaks`),
          fetch(`${API_BASE_URL}/api/student-data/${encodeURIComponent(found.email)}/points`),
        ])
        const health = healthRes.ok ? (await healthRes.json()).data : null
        const streaks = streakRes.ok ? (await streakRes.json()).data : null
        const points = pointsRes.ok ? (await pointsRes.json()).data : null
        setActivity({ health, streaks, points })
      }
    } catch { setError('Search failed. Please try again.') }
    finally { setLoading(false) }
  }

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f4f5f7' }}>
      <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 700 }}>{value}</span>
    </div>
  ) : null

  // Health summary from last 7 days
  const healthSummary = () => {
    if (!activity?.health?.length) return null
    const last7 = activity.health.slice(0, 7)
    const avg = (key) => (last7.reduce((s, e) => s + (parseFloat(e.data?.[key]) || 0), 0) / last7.length).toFixed(1)
    return { sleep: avg('sleepHours'), screen: avg('screenTime'), study: avg('studyHours'), days: last7.length }
  }

  const hs = healthSummary()

  return (
    <div className="edu-modal-overlay">
      <div className="edu-modal" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>Monitor Student</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Enter the student's unique ID or email address.</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Student ID or email..." className="edu-input" style={{ flex: 1 }} />
          <button onClick={handleSearch} className="edu-btn-submit" style={{ width: 'auto', padding: '0 20px' }} disabled={loading}>
            {loading ? <span className="edu-spinner" /> : <Search size={16} />}
          </button>
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#991b1b' }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {student && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Student header */}
            <div style={{ background: 'var(--edu-gradient)', borderRadius: 14, padding: '16px 20px', color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
                {student.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{student.name || 'Unknown'}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{student.email}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>ID: {student.id}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, background: '#f4f5f7', borderRadius: 10, padding: 4, marginBottom: 16 }}>
              {[['profile', 'Profile'], ['activity', 'Activity'], ['health', 'Health']].map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: tab === t ? 'white' : 'transparent', color: tab === t ? '#4f46e5' : '#6b7280', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Profile tab */}
            {tab === 'profile' && (
              <div>
                <div className="edu-card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <BookOpen size={16} color="#4f46e5" />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Academic Profile</span>
                  </div>
                  <InfoRow label="State" value={student.selectedState} />
                  <InfoRow label="Board" value={student.board} />
                  <InfoRow label="Class" value={student.class ? `Class ${student.class}` : null} />
                  <InfoRow label="Medium" value={student.mediumName} />
                  <InfoRow label="Stream" value={student.stream || student.department} />
                  <InfoRow label="Profile Complete" value={student.profileComplete ? '✅ Yes' : '⏳ Incomplete'} />
                </div>
                {student.subjects?.length > 0 && (
                  <div className="edu-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Award size={16} color="#059669" />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Subjects ({student.subjects.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {student.subjects.map(s => (
                        <span key={s} style={{ padding: '4px 12px', borderRadius: 20, background: '#eef2ff', color: '#4f46e5', fontSize: 12, fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="edu-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Clock size={16} color="#6b7280" />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Account Info</span>
                  </div>
                  <InfoRow label="Registered" value={student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : null} />
                  <InfoRow label="Provider" value={student.provider === 'google' ? '🔵 Google' : '📧 Email'} />
                </div>
              </div>
            )}

            {/* Activity tab */}
            {tab === 'activity' && (
              <div>
                {activity?.streaks ? (
                  <div className="edu-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Zap size={16} color="#d97706" />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Discipline Streaks</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        ['Current Streak', `${activity.streaks.currentStreak} days`],
                        ['Longest Streak', `${activity.streaks.longestStreak} days`],
                        ['Shields Left', `${activity.streaks.shieldsRemaining}/3`],
                        ['Last Active', activity.streaks.lastActivityDate || 'Never'],
                      ].map(([k, v]) => (
                        <div key={k} style={{ background: '#f4f5f7', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{k}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginTop: 2 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No streak data yet</div>}

                {activity?.points ? (
                  <div className="edu-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Target size={16} color="#7c3aed" />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Points & Rewards</span>
                    </div>
                    <InfoRow label="Total Points" value={activity.points.totalPoints} />
                    <InfoRow label="Points Today" value={activity.points.pointsEarnedToday} />
                    <InfoRow label="Consecutive Days" value={activity.points.consecutiveDays} />
                  </div>
                ) : null}
              </div>
            )}

            {/* Health tab */}
            {tab === 'health' && (
              <div>
                {hs ? (
                  <>
                    <div style={{ background: 'var(--edu-gradient)', borderRadius: 14, padding: '16px 20px', color: 'white', marginBottom: 12 }}>
                      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>Last {hs.days} days average</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {[['😴 Sleep', `${hs.sleep}h`], ['📱 Screen', `${hs.screen}h`], ['📚 Study', `${hs.study}h`]].map(([k, v]) => (
                          <div key={k} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>{v}</div>
                            <div style={{ fontSize: 11, opacity: 0.8 }}>{k}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="edu-card">
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 12 }}>Daily Log</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {activity.health.slice(0, 7).map((entry, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{entry.date}</span>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#374151' }}>
                              <span>😴 {entry.data?.sleepHours || 0}h</span>
                              <span>📚 {entry.data?.studyHours || 0}h</span>
                              <span>📱 {entry.data?.screenTime || 0}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                    <Heart size={40} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
                    <p>No health data recorded yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentMonitor
