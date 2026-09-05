import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authenticateUser, findUserByEmail } from '../utils/authStorage'
import { generateSessionToken, signOutFromGoogle } from '../services/firebaseAuth'
import { logAdminClientEvent } from '../services/adminAuditService'
import { Shield, Key, Mail, Lock } from 'lucide-react'

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '', userType: 'teacher' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cleanEmail = (formData.email || '').trim().toLowerCase()
      const cleanPassword = (formData.password || '').trim()

      // 1. Purge any stale Firebase session or learner token
      try {
        await signOutFromGoogle()
        localStorage.removeItem('edulearn_id_token')
      } catch {}

      const userRecord = findUserByEmail(cleanEmail)
      if (!userRecord) {
        alert('Invalid email or password!')
        setLoading(false)
        return
      }

      if (userRecord.isBanned) {
        alert('Your account has been banned. Please contact the administrator.')
        setLoading(false)
        return
      }

      // Enforce: Stored database role must authorize admin access
      const isElyAdmin = cleanEmail === 'admin@onecommunityely.com'
      const role = String(userRecord.userType || userRecord.role || '').toLowerCase()
      if (role !== 'teacher' && role !== 'admin' && !isElyAdmin) {
        alert('Access denied. You do not have Admin permissions.')
        setLoading(false)
        return
      }

      const result = authenticateUser(cleanEmail, cleanPassword, userRecord.userType || 'teacher')
      if (!result.success) {
        alert('Invalid email or password!')
        setLoading(false)
        return
      }

      // Explicitly create authoritative admin token
      const adminToken = generateSessionToken({ ...result.user, userType: 'teacher', role: 'admin' })
      result.user.idToken = adminToken
      result.user.token = adminToken
      result.user.role = 'admin'
      result.user.userType = 'teacher'
      try {
        localStorage.setItem('edulearn_id_token', adminToken)
      } catch {}

      login(result.user)

      // Record Admin Login Audit Log
      logAdminClientEvent({
        action: 'Admin Login',
        category: 'Security',
        targetType: 'AuthSession',
        targetId: cleanEmail,
        targetName: result.user.name || cleanEmail,
        result: 'Success',
        description: `Administrator ${result.user.name || cleanEmail} logged in to Admin Portal`
      });

      await new Promise(r => setTimeout(r, 100))
      navigate('/admin-panel')
      setLoading(false)
    } catch {
      alert('Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="edu-auth-page">
      <div className="edu-auth-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '380px', margin: '0 auto' }}>
          <div style={{ width: 88, height: 88, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <img src="/logo.png" alt="One Community Ely Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 16 }}>One Community Ely</h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 1.6 }}>
            Admin Portal — Manage users, monitor database, and upload learning resources.
          </p>
        </div>
      </div>

      <div className="edu-auth-right">
        <div className="edu-auth-form-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Shield className="h-7 w-7 text-emerald-700" />
            <h1 className="edu-auth-title" style={{ margin: 0 }}>Admin Sign In</h1>
          </div>
          <p className="edu-auth-subtitle">Welcome to the secure administrative portal.</p>

          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <div className="edu-form-group">
              <label className="edu-label">Admin Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="admin@example.com" 
                className="edu-input" 
                required 
              />
            </div>

            <div className="edu-form-group">
              <label className="edu-label">Password</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="Enter password" 
                className="edu-input" 
                required 
              />
            </div>

            <button type="submit" className="edu-btn-submit" disabled={loading}>
              {loading ? <span className="edu-spinner" /> : 'Sign In to Admin Portal'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#4b5563' }}>
            Not an Admin?{' '}
            <Link to="/login" className="edu-link">Learner Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
