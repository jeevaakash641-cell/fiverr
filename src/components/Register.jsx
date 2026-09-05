import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { registerUser } from '../utils/authStorage'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { fetchHelpTopics } from '../services/helpTopicService'
import { GraduationCap, Users, Star, AlertCircle } from 'lucide-react'

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

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    ageRange: '',
    generalLocation: '',
    residencyConfirmation: '',
    learningInterests: ''
  })

  const [helpTopics, setHelpTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [customInterest, setCustomInterest] = useState('')

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null)
  const [googleProfileData, setGoogleProfileData] = useState({
    ageRange: '',
    generalLocation: '',
    residencyConfirmation: '',
    learningInterests: ''
  })
  const [googleSelectedTopic, setGoogleSelectedTopic] = useState('')
  const [googleCustomInterest, setGoogleCustomInterest] = useState('')
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

  // Standard field change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, formData[field])
  }

  // Validate single field
  const validateField = (field, value) => {
    let err = ''
    if (field === 'name' && (!value || !value.trim())) {
      err = 'Please enter your full name'
    } else if (field === 'email') {
      if (!value || !value.trim()) {
        err = 'Please enter your email address'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        err = 'Please enter a valid email address'
      }
    } else if (field === 'password') {
      if (!value) {
        err = 'Password is required'
      } else if (value.length < 6) {
        err = 'Password must be at least 6 characters'
      }
    } else if (field === 'confirmPassword') {
      if (value !== formData.password) {
        err = 'Passwords do not match'
      }
    } else if (field === 'generalLocation') {
      if (!value || !value.trim()) {
        err = 'Please enter your town, city or area'
      }
    } else if (field === 'residencyConfirmation') {
      if (!value || !value.trim()) {
        err = 'Please confirm whether you live in or around Ely'
      }
    } else if (field === 'learningInterests') {
      if (!value || !value.trim()) {
        err = 'Please enter what you would like help with'
      }
    }

    setErrors(prev => ({ ...prev, [field]: err }))
    return !err
  }

  // Full validation before submission
  const validateAll = () => {
    const newErrors = {}
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Please enter your full name'
    }
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Please enter your email address'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.generalLocation || !formData.generalLocation.trim()) {
      newErrors.generalLocation = 'Please enter your town, city or area'
    }
    if (!formData.residencyConfirmation || !formData.residencyConfirmation.trim()) {
      newErrors.residencyConfirmation = 'Please confirm whether you live in or around Ely'
    }
    if (!formData.learningInterests || !formData.learningInterests.trim()) {
      newErrors.learningInterests = 'Please enter what you would like help with'
    }

    setErrors(newErrors)
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      generalLocation: true,
      residencyConfirmation: true,
      learningInterests: true
    })
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateAll()) {
      return
    }

    setLoading(true)
    try {
      const result = registerUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        userType: 'student', // Public registration is strictly Learner
        ageRange: formData.ageRange || '',
        generalLocation: formData.generalLocation.trim(),
        residencyConfirmation: formData.residencyConfirmation,
        learningInterests: formData.learningInterests.trim()
      })

      if (!result.success) {
        alert(result.message || 'Email already exists! Please login instead.')
        setLoading(false)
        return
      }

      login(result.user)
      navigate('/course-recommendations')
      setLoading(false)
    } catch {
      alert('Registration failed. Please try again.')
      setLoading(false)
    }
  }

  // Google Sign-In button click
  const handleGoogleSignInClick = async () => {
    await handleGoogleSignIn(setLoading, (googleUser) => {
      setPendingGoogleUser(googleUser)
    })
  }

  // Submit Google Profile Completion
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

  return (
    <div className="edu-auth-page" style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      {/* Left Branding Side */}
      <div className="edu-auth-left" style={{ height: '100vh', overflowY: 'auto' }}>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '380px', margin: '0 auto' }}>
          <div style={{ width: 88, height: 88, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <img src="/logo.png" alt="One Community Ely Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Join One Community Ely</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, marginBottom: 40, lineHeight: 1.6 }}>
            Start your learning journey today.<br />Develop practical skills at your own pace.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: GraduationCap, text: 'Practical community-aligned learning' },
              { icon: Users, text: 'Connect with expert mentors & tutors' },
              { icon: Star, text: 'Develop real-world digital & life skills' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px', backdropFilter: 'blur(8px)' }}>
                <Icon size={18} color="white" />
                <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="edu-auth-right" style={{ alignItems: 'flex-start', justifyContent: 'center', height: '100vh', overflowY: 'auto', padding: '48px 40px' }}>
        <div className="edu-auth-form-wrap" style={{ maxWidth: '520px', width: '100%', margin: '0 auto', paddingBottom: '48px' }}>
          <h1 className="edu-auth-title">Create Account</h1>
          <p className="edu-auth-subtitle">Join One Community Ely and start learning today</p>

          <button type="button" onClick={handleGoogleSignInClick} className="edu-btn-google" disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="edu-divider">or sign up with email</div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="edu-form-group">
              <label htmlFor="reg-name" className="edu-label">Full Name *</label>
              <input
                id="reg-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleBlur('name')}
                placeholder="Enter your full name"
                className={`edu-input ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {errors.name && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="edu-form-group">
              <label htmlFor="reg-email" className="edu-label">Email Address *</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                className={`edu-input ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {errors.email && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="edu-form-group">
              <label htmlFor="reg-password" className="edu-label">Password *</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={() => handleBlur('password')}
                placeholder="Min 6 characters"
                className={`edu-input ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {errors.password && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="edu-form-group">
              <label htmlFor="reg-confirm-password" className="edu-label">Confirm Password *</label>
              <input
                id="reg-confirm-password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Confirm your password"
                className={`edu-input ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* 1. Age Range — Optional */}
            <div className="edu-form-group">
              <label htmlFor="reg-age-range" className="edu-label">Age Range (Optional)</label>
              <select
                id="reg-age-range"
                name="ageRange"
                value={formData.ageRange}
                onChange={handleChange}
                className="edu-select"
              >
                <option value="">Select your age range</option>
                {AGE_RANGE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* 2. General Location — Required */}
            <div className="edu-form-group">
              <label htmlFor="reg-general-location" className="edu-label">General Location *</label>
              <input
                id="reg-general-location"
                type="text"
                name="generalLocation"
                value={formData.generalLocation}
                onChange={handleChange}
                onBlur={() => handleBlur('generalLocation')}
                placeholder="Enter your town, city or area"
                className={`edu-input ${errors.generalLocation ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {errors.generalLocation && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.generalLocation}
                </p>
              )}
            </div>

            {/* 3. Residency Confirmation — Required */}
            <div className="edu-form-group">
              <label htmlFor="reg-residency" className="edu-label">Residency Confirmation *</label>
              <p className="text-xs text-gray-500 mb-1.5 font-normal">
                Please confirm whether you live in or around Ely.
              </p>
              <select
                id="reg-residency"
                name="residencyConfirmation"
                value={formData.residencyConfirmation}
                onChange={handleChange}
                onBlur={() => handleBlur('residencyConfirmation')}
                className={`edu-select ${errors.residencyConfirmation ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              >
                <option value="">Select an option</option>
                {RESIDENCY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.residencyConfirmation && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.residencyConfirmation}
                </p>
              )}
            </div>

            {/* 4. Learning Interests — Dropdown Select */}
            <div className="edu-form-group" style={{ marginBottom: 24 }}>
              <label htmlFor="reg-learning-interests" className="edu-label">What would you most like help with? *</label>
              <p className="text-xs text-gray-500 mb-1.5 font-normal">
                Choose the primary area you would like training and support with.
              </p>
              <select
                id="reg-learning-interests"
                name="learningInterests"
                value={selectedTopic}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedTopic(val)
                  if (val === 'Something else') {
                    setFormData(prev => ({ ...prev, learningInterests: customInterest || '' }))
                  } else {
                    setFormData(prev => ({ ...prev, learningInterests: val }))
                  }
                  if (errors.learningInterests) {
                    setErrors(prev => ({ ...prev, learningInterests: '' }))
                  }
                }}
                onBlur={() => handleBlur('learningInterests')}
                className={`edu-select ${errors.learningInterests ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              >
                <option value="">Select what you would like help with</option>
                {helpTopics.map(t => (
                  <option key={t.topicId} value={t.label}>{t.label}</option>
                ))}
              </select>

              {/* Custom Input when 'Something else' is selected */}
              {selectedTopic === 'Something else' && (
                <div className="mt-2 animate-fade-in">
                  <input
                    type="text"
                    value={customInterest}
                    onChange={(e) => {
                      setCustomInterest(e.target.value)
                      setFormData(prev => ({ ...prev, learningInterests: e.target.value }))
                      if (errors.learningInterests) {
                        setErrors(prev => ({ ...prev, learningInterests: '' }))
                      }
                    }}
                    placeholder="Please specify what you would like help with..."
                    className={`edu-input ${errors.learningInterests ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                  />
                </div>
              )}

              {errors.learningInterests && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.learningInterests}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button type="submit" className="edu-btn-submit" disabled={loading}>
              {loading ? <span className="edu-spinner" /> : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" className="edu-link">Sign in here</Link>
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
                <label htmlFor="goog-age-range" className="block text-xs font-semibold text-gray-700 mb-1">
                  Age Range (Optional)
                </label>
                <select
                  id="goog-age-range"
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
                <label htmlFor="goog-location" className="block text-xs font-semibold text-gray-700 mb-1">
                  General Location *
                </label>
                <input
                  id="goog-location"
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
                <label htmlFor="goog-residency" className="block text-xs font-semibold text-gray-700 mb-1">
                  Residency Confirmation *
                </label>
                <p className="text-[11px] text-gray-500 mb-1 font-normal">
                  Please confirm whether you live in or around Ely.
                </p>
                <select
                  id="goog-residency"
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
                <label htmlFor="goog-interests" className="block text-xs font-semibold text-gray-700 mb-1">
                  What would you most like help with? *
                </label>
                <select
                  id="goog-interests"
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

export default Register
