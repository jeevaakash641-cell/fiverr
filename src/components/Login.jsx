import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authenticateUser, findUserByEmail } from '../utils/authStorage'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { fetchHelpTopics } from '../services/helpTopicService'
import { GraduationCap } from 'lucide-react'

const AGE_RANGE_OPTIONS = [
  'Under 18',
  '18–24',
  '25–34',
  '35–44',
  '45–54',
  '55+',
  'Prefer not to say'
]

const RESIDENCY_OPTIONS = [
  'Yes',
  'No',
  'Prefer not to say'
]

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '', userType: 'student' })
  const [loading, setLoading] = useState(false)
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null)
  const [helpTopics, setHelpTopics] = useState([])
  const [googleSelectedTopic, setGoogleSelectedTopic] = useState('')
  const [googleCustomInterest, setGoogleCustomInterest] = useState('')
  const [googleProfileData, setGoogleProfileData] = useState({
    ageRange: '',
    generalLocation: '',
    residencyConfirmation: '',
    learningInterests: ''
  })
  const [googleErrors, setGoogleErrors] = useState({})

  const { login } = useAuth()
  const navigate = useNavigate()
  const { handleGoogleSignIn, completeGoogleLearnerProfile } = useGoogleAuth()

  useEffect(() => {
    fetchHelpTopics().then(topics => {
      if (Array.isArray(topics) && topics.length > 0) {
        setHelpTopics(topics)
      }
    }).catch(err => console.warn('Could not load topics:', err))
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleGoogleLearnerSignIn = async () => {
    await handleGoogleSignIn(setLoading, (googleUser) => {
      setPendingGoogleUser(googleUser)
    })
  }

  const handleGoogleProfileSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!googleProfileData.generalLocation || !googleProfileData.generalLocation.trim()) {
      newErrors.generalLocation = 'Please enter your town, city or area'
    }
    if (!googleProfileData.residencyConfirmation || !googleProfileData.residencyConfirmation.trim()) {
      newErrors.residencyConfirmation = 'Please confirm whether you live in or around Ely'
    }
    if (!googleProfileData.learningInterests || !googleProfileData.learningInterests.trim()) {
      newErrors.learningInterests = 'Please enter what you would like help with'
    }

    if (Object.keys(newErrors).length > 0) {
      setGoogleErrors(newErrors)
      return
    }

    await completeGoogleLearnerProfile(pendingGoogleUser, googleProfileData, setLoading)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const userRecord = findUserByEmail(formData.email.trim())
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
      if (userRecord.userType === 'teacher') {
        alert('Access denied. Please sign in via the secure Admin Login portal.')
        setLoading(false)
        return
      }

      const result = authenticateUser(formData.email.trim(), formData.password, 'student')
      if (!result.success) {
        alert('Invalid email or password!')
        setLoading(false)
        return
      }

      login(result.user)
      await new Promise(r => setTimeout(r, 100))
      navigate('/dashboard')
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
          <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Welcome to One Community Ely</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6 }}>
            Learn new skills, build confidence and develop practical knowledge at your own pace.
          </p>
        </div>
      </div>

      <div className="edu-auth-right">
        <div className="edu-auth-form-wrap">
          <h1 className="edu-auth-title">Welcome Back</h1>
          <p className="edu-auth-subtitle">Sign in to continue your learning journey.</p>

          <button type="button" onClick={handleGoogleLearnerSignIn} className="edu-btn-google" disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="edu-divider">or sign in with email</div>

          <form onSubmit={handleSubmit}>
            <div className="edu-form-group">
              <label className="edu-label">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="edu-input" required />
            </div>
            <div className="edu-form-group">
              <label className="edu-label">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" className="edu-input" required />
            </div>
            <button type="submit" className="edu-btn-submit" disabled={loading}>
              {loading ? <span className="edu-spinner" /> : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#4b5563' }}>
            New to One Community Ely?{' '}
            <Link to="/register" className="edu-link">Create an Account</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#4b5563' }}>
            Are you an Admin? <Link to="/admin-login" className="edu-link">Sign in here</Link>
          </p>
        </div>
      </div>

      {/* Google Learner Onboarding Modal */}
      {pendingGoogleUser && (
        <div className="edu-modal-overlay">
          <div className="edu-modal" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: 'var(--edu-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'white' }}>
                <GraduationCap size={26} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>
                Welcome, {pendingGoogleUser.name?.split(' ')[0] || 'Learner'}!
              </h3>
              <p style={{ color: '#6b7280', fontSize: 13 }}>
                Please complete a few quick details to personalize your learning journey.
              </p>
            </div>

            <form onSubmit={handleGoogleProfileSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Age Range */}
              <div>
                <label htmlFor="login-goog-age-range" className="block text-xs font-semibold text-gray-700 mb-1">
                  Age Range (Optional)
                </label>
                <select
                  id="login-goog-age-range"
                  value={googleProfileData.ageRange}
                  onChange={(e) => setGoogleProfileData({ ...googleProfileData, ageRange: e.target.value })}
                  className="edu-select text-xs py-2"
                >
                  <option value="">Select your age range</option>
                  {AGE_RANGE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* General Location */}
              <div>
                <label htmlFor="login-goog-location" className="block text-xs font-semibold text-gray-700 mb-1">
                  General Location *
                </label>
                <input
                  id="login-goog-location"
                  type="text"
                  value={googleProfileData.generalLocation}
                  onChange={(e) => {
                    setGoogleProfileData({ ...googleProfileData, generalLocation: e.target.value })
                    if (googleErrors.generalLocation) setGoogleErrors({ ...googleErrors, generalLocation: '' })
                  }}
                  placeholder="Enter your town, city or area"
                  className="edu-input text-xs py-2"
                  required
                />
                {googleErrors.generalLocation && (
                  <p className="text-xs text-red-600 font-medium mt-1">{googleErrors.generalLocation}</p>
                )}
              </div>

              {/* Residency Confirmation */}
              <div>
                <label htmlFor="login-goog-residency" className="block text-xs font-semibold text-gray-700 mb-1">
                  Residency Confirmation *
                </label>
                <p className="text-[11px] text-gray-500 mb-1 font-normal">
                  Please confirm whether you live in or around Ely.
                </p>
                <select
                  id="login-goog-residency"
                  value={googleProfileData.residencyConfirmation}
                  onChange={(e) => {
                    setGoogleProfileData({ ...googleProfileData, residencyConfirmation: e.target.value })
                    if (googleErrors.residencyConfirmation) setGoogleErrors({ ...googleErrors, residencyConfirmation: '' })
                  }}
                  className="edu-select text-xs py-2"
                  required
                >
                  <option value="">Select an option</option>
                  {RESIDENCY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {googleErrors.residencyConfirmation && (
                  <p className="text-xs text-red-600 font-medium mt-1">{googleErrors.residencyConfirmation}</p>
                )}
              </div>

              {/* Learning Interests — Dropdown Select */}
              <div>
                <label htmlFor="login-goog-interests" className="block text-xs font-semibold text-gray-700 mb-1">
                  What would you most like help with? *
                </label>
                <select
                  id="login-goog-interests"
                  value={googleSelectedTopic}
                  onChange={(e) => {
                    const val = e.target.value
                    setGoogleSelectedTopic(val)
                    if (val === 'Something else') {
                      setGoogleProfileData({ ...googleProfileData, learningInterests: googleCustomInterest || '' })
                    } else {
                      setGoogleProfileData({ ...googleProfileData, learningInterests: val })
                    }
                    if (googleErrors.learningInterests) setGoogleErrors({ ...googleErrors, learningInterests: '' })
                  }}
                  className="edu-select text-xs py-2"
                  required
                >
                  <option value="">Select what you would like help with</option>
                  {helpTopics.map(t => (
                    <option key={t.topicId} value={t.label}>{t.label}</option>
                  ))}
                </select>

                {/* Custom input for 'Something else' */}
                {googleSelectedTopic === 'Something else' && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      type="text"
                      value={googleCustomInterest}
                      onChange={(e) => {
                        setGoogleCustomInterest(e.target.value)
                        setGoogleProfileData({ ...googleProfileData, learningInterests: e.target.value })
                        if (googleErrors.learningInterests) setGoogleErrors({ ...googleErrors, learningInterests: '' })
                      }}
                      placeholder="Please specify what you would like help with..."
                      className="edu-input text-xs py-2"
                      required
                    />
                  </div>
                )}

                {googleErrors.learningInterests && (
                  <p className="text-xs text-red-600 font-medium mt-1">{googleErrors.learningInterests}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="edu-btn-submit" style={{ flex: 1 }} disabled={loading}>
                  {loading ? <span className="edu-spinner" /> : 'Complete Registration'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingGoogleUser(null)}
                  style={{ flex: 0, padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#6b7280' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
