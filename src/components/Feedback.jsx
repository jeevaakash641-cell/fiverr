import { useState, useEffect } from 'react'
import { Send, MessageSquare, X, ThumbsUp, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE_URL } from '../config'

const CATEGORIES = ['General', 'AI Assistant', 'Quiz', 'Live Classes', 'Books', 'Performance', 'UI/UX', 'Bug Report']

const StarRating = ({ value, onChange, readonly = false }) => {
  if (readonly) {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s} style={{ fontSize: 14, color: s <= value ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}>
            {s <= value ? '★' : '☆'}
          </span>
        ))}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 28, lineHeight: 1, color: s <= value ? '#f59e0b' : '#d1d5db' }}>
          {s <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

const Feedback = ({ onClose }) => {
  const { user } = useAuth()
  const [tab, setTab] = useState('submit') // 'submit' | 'reviews'
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('General')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const canDelete = (review) =>
    user?.userType === 'teacher' ||
    user?.email === 'aibharath07@gmail.com' ||
    user?.email === review.userEmail

  const handleDelete = async (id) => {
    if (!confirm('Delete this review?')) return
    try {
      await fetch(`${API_BASE_URL}/api/feedback/${id}`, { method: 'DELETE' })
      setReviews(prev => prev.filter(r => r.id !== id))
    } catch { alert('Failed to delete') }
  }

  useEffect(() => {
    if (tab === 'reviews') loadReviews()
  }, [tab])

  const loadReviews = async () => {
    setLoadingReviews(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`)
      const data = await res.json()
      setReviews(data.feedback || [])
    } catch { setReviews([]) }
    finally { setLoadingReviews(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) { alert('Please select a star rating'); return }
    if (!message.trim()) { alert('Please write a message'); return }
    setSubmitting(true)
    try {
      await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user?.name || 'Anonymous',
          userEmail: user?.email || 'anonymous',
          userType: user?.userType || 'student',
          rating, category, message,
        }),
      })
      setSubmitted(true)
    } catch { alert('Failed to submit. Please try again.') }
    finally { setSubmitting(false) }
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const ratingColor = (r) => r >= 4 ? '#059669' : r >= 3 ? '#d97706' : '#ef4444'

  return (
    <div className="edu-modal-overlay">
      <div className="edu-modal" style={{ maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>Feedback & Reviews</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#f4f5f7', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {[['submit', 'Submit Feedback'], ['reviews', `Reviews${reviews.length ? ` (${reviews.length})` : ''}`]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: tab === t ? 'white' : 'transparent', color: tab === t ? '#4f46e5' : '#6b7280', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Submit tab */}
          {tab === 'submit' && (
            submitted ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <ThumbsUp size={28} color="#059669" />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Thank you!</h4>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Your feedback helps us improve One Community Ely.</p>
                <button onClick={() => { setSubmitted(false); setRating(0); setMessage(''); setCategory('General') }}
                  style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--edu-gradient)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  Submit Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="edu-form-group">
                  <label className="edu-label">Your Rating *</label>
                  <StarRating value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <div style={{ fontSize: 12, color: ratingColor(rating), fontWeight: 600, marginTop: 4 }}>
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                    </div>
                  )}
                </div>

                <div className="edu-form-group">
                  <label className="edu-label">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="edu-select">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="edu-form-group">
                  <label className="edu-label">Your Feedback *</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Share your experience, suggestions, or report an issue..."
                    rows={4} className="edu-input" style={{ resize: 'vertical' }} required />
                </div>

                <button type="submit" className="edu-btn-submit" disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submitting ? <span className="edu-spinner" /> : <><Send size={16} /> Submit Feedback</>}
                </button>
              </form>
            )
          )}

          {/* Reviews tab */}
          {tab === 'reviews' && (
            <div>
              {/* Summary */}
              {avgRating && (
                <div style={{ background: 'var(--edu-gradient)', borderRadius: 14, padding: '20px 24px', color: 'white', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{avgRating}</div>
                    <StarRating value={Math.round(avgRating)} readonly />
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map(s => {
                      const count = reviews.filter(r => r.rating === s).length
                      const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', width: 8 }}>{s}</span>
                          <span style={{ fontSize: 10, color: 'white' }}>★</span>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'white', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', width: 24 }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>Loading reviews…</div>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <MessageSquare size={40} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>No reviews yet. Be the first!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reviews.map((r, i) => (
                    <div key={r.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{r.userName}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.userType} · {r.category}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <StarRating value={r.rating} readonly />
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                          {canDelete(r) && (
                            <button onClick={() => handleDelete(r.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', flexShrink: 0 }}
                              title="Delete review">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0,
                        ...(expanded !== i && r.message.length > 120 ? { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } : {}) }}>
                        {r.message}
                      </p>
                      {r.message.length > 120 && (
                        <button onClick={() => setExpanded(expanded === i ? null : i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 12, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {expanded === i ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Feedback
