import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSubjectsForClass, getHigherSecondaryStreams, requiresStreamSelection } from '../data/curriculumStructure'
import { ArrowLeft, User, MapPin, BookOpen, GraduationCap, Save, Edit, Cloud, Lock, Sparkles, Compass, MessageSquare } from 'lucide-react'
import Feedback from './Feedback'

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

const Settings = () => {
  const { user, updateProfile, changePassword } = useAuth()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    ageRange: '',
    generalLocation: '',
    residencyConfirmation: '',
    learningInterests: '',
    selectedState: '',
    selectedMedium: '',
    mediumName: '',
    stateLanguage: '',
    class: '',
    board: '',
    stream: '',
    subjects: []
  })
  
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' })

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSavePassword = async () => {
    setPasswordStatus({ type: '', message: '' })
    if (!passwordForm.newPassword) {
      setPasswordStatus({ type: 'error', message: 'New password cannot be empty' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match' })
      return
    }
    
    setLoading(true)
    try {
      const success = await changePassword(passwordForm.newPassword)
      if (success) {
        setPasswordStatus({ type: 'success', message: 'Password updated successfully!' })
        setPasswordForm({ newPassword: '', confirmPassword: '' })
      } else {
        setPasswordStatus({ type: 'error', message: 'Failed to update password' })
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.message })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.userType === 'teacher') {
      navigate('/admin-settings')
      return
    }
    
    // Derive stateLanguage from state, not from mediumName
    let stateLanguage = user.stateLanguage || ''
    
    if (!stateLanguage && user.selectedState) {
      const stateLanguageMap = {
        'Tamil Nadu': 'Tamil',
        'Kerala': 'Malayalam',
        'Karnataka': 'Kannada',
        'Andhra Pradesh': 'Telugu',
        'Telangana': 'Telugu',
        'Maharashtra': 'Marathi',
        'West Bengal': 'Bengali',
        'Gujarat': 'Gujarati',
        'Punjab': 'Punjabi',
        'Odisha': 'Odia',
        'Assam': 'Assamese',
        'Bihar': 'Hindi',
        'Uttar Pradesh': 'Hindi',
        'Madhya Pradesh': 'Hindi',
        'Rajasthan': 'Hindi',
        'Haryana': 'Hindi',
        'Himachal Pradesh': 'Hindi',
        'Chhattisgarh': 'Hindi',
        'Jharkhand': 'Hindi',
        'Uttarakhand': 'Hindi',
        'Goa': 'Konkani',
        'Manipur': 'Manipuri',
        'Meghalaya': 'English',
        'Mizoram': 'Mizo',
        'Nagaland': 'English',
        'Tripura': 'Bengali',
        'Sikkim': 'Nepali'
      }
      stateLanguage = stateLanguageMap[user.selectedState] || 'Tamil'
    }
    
    // Load current user data
    setFormData({
      name: user.name || '',
      email: user.email || '',
      ageRange: user.ageRange || '',
      generalLocation: user.generalLocation || '',
      residencyConfirmation: user.residencyConfirmation || '',
      learningInterests: typeof user.learningInterests === 'string'
        ? user.learningInterests
        : (Array.isArray(user.learningInterests) ? user.learningInterests.join(', ') : ''),
      selectedState: user.selectedState || '',
      selectedMedium: user.selectedMedium || '',
      mediumName: user.mediumName || '',
      stateLanguage: stateLanguage,
      class: user.class || '',
      board: user.board || 'State Board',
      stream: user.stream || '',
      subjects: user.subjects || []
    })
  }, [user, navigate])

  // Update subjects when class or stream changes
  useEffect(() => {
    if (formData.class && formData.selectedState) {
      const classNum = parseInt(formData.class)
      
      // ALWAYS derive stateLanguage from selectedState
      const stateLanguageMap = {
        'Tamil Nadu': 'Tamil',
        'Kerala': 'Malayalam',
        'Karnataka': 'Kannada',
        'Andhra Pradesh': 'Telugu',
        'Telangana': 'Telugu',
        'Maharashtra': 'Marathi',
        'West Bengal': 'Bengali',
        'Gujarat': 'Gujarati',
        'Punjab': 'Punjabi',
        'Odisha': 'Odia',
        'Assam': 'Assamese',
        'Bihar': 'Hindi',
        'Uttar Pradesh': 'Hindi',
        'Madhya Pradesh': 'Hindi',
        'Rajasthan': 'Hindi',
        'Haryana': 'Hindi',
        'Himachal Pradesh': 'Hindi',
        'Chhattisgarh': 'Hindi',
        'Jharkhand': 'Hindi',
        'Uttarakhand': 'Hindi',
        'Goa': 'Konkani',
        'Manipur': 'Manipuri',
        'Meghalaya': 'English',
        'Mizoram': 'Mizo',
        'Nagaland': 'English',
        'Tripura': 'Bengali',
        'Sikkim': 'Nepali'
      }
      const stateLanguage = stateLanguageMap[formData.selectedState] || 'Tamil'
      
      console.log('Settings: Getting subjects for class', classNum, 'stream', formData.stream, 'language', stateLanguage)
      const subjects = [...new Set(getSubjectsForClass(classNum, formData.stream, stateLanguage)
        .map(s => s.name))]
      console.log('Settings: Subjects:', subjects)
      
      setFormData(prev => ({
        ...prev,
        stateLanguage: stateLanguage, // Always update stateLanguage
        subjects
      }))
    }
  }, [formData.class, formData.stream, formData.selectedState])

  // State-Medium mapping
  const stateMediumMapping = {
    'Tamil Nadu': ['Tamil Medium', 'English Medium'],
    'Kerala': ['Malayalam Medium', 'English Medium'],
    'Karnataka': ['Kannada Medium', 'English Medium'],
    'Andhra Pradesh': ['Telugu Medium', 'English Medium'],
    'Telangana': ['Telugu Medium', 'English Medium'],
    'Maharashtra': ['Marathi Medium', 'English Medium'],
    'West Bengal': ['Bengali Medium', 'English Medium'],
    'Gujarat': ['Gujarati Medium', 'English Medium'],
    'Punjab': ['Punjabi Medium', 'English Medium'],
    'Odisha': ['Odia Medium', 'English Medium'],
    'Assam': ['Assamese Medium', 'English Medium'],
    'Bihar': ['Hindi Medium', 'English Medium'],
    'Uttar Pradesh': ['Hindi Medium', 'English Medium'],
    'Madhya Pradesh': ['Hindi Medium', 'English Medium'],
    'Rajasthan': ['Hindi Medium', 'English Medium'],
    'Haryana': ['Hindi Medium', 'English Medium'],
    'Himachal Pradesh': ['Hindi Medium', 'English Medium'],
    'Chhattisgarh': ['Hindi Medium', 'English Medium'],
    'Jharkhand': ['Hindi Medium', 'English Medium'],
    'Uttarakhand': ['Hindi Medium', 'English Medium'],
    'Goa': ['Konkani Medium', 'English Medium'],
    'Manipur': ['Manipuri Medium', 'English Medium'],
    'Meghalaya': ['English Medium'],
    'Mizoram': ['Mizo Medium', 'English Medium'],
    'Nagaland': ['English Medium'],
    'Tripura': ['Bengali Medium', 'English Medium'],
    'Sikkim': ['Nepali Medium', 'English Medium']
  }

  const indianStates = Object.keys(stateMediumMapping).sort()
  const availableMediums = formData.selectedState ? stateMediumMapping[formData.selectedState] || [] : []

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Reset medium if state changes
    if (name === 'selectedState') {
      setFormData(prev => ({
        ...prev,
        selectedMedium: '',
        mediumName: ''
      }))
    }
    
    // Reset stream if class changes and new class doesn't require stream
    if (name === 'class' && !requiresStreamSelection(parseInt(value))) {
      setFormData(prev => ({
        ...prev,
        stream: ''
      }))
    }
  }

  const handleMediumChange = (medium) => {
    const mediumType = medium === 'English Medium' ? 'english' : 'state'
    
    // Determine state language based on selected state, not medium
    // The regional language is always the state's language, regardless of medium
    let stateLanguage = 'Tamil' // Default
    
    if (formData.selectedState) {
      const stateLanguageMap = {
        'Tamil Nadu': 'Tamil',
        'Kerala': 'Malayalam',
        'Karnataka': 'Kannada',
        'Andhra Pradesh': 'Telugu',
        'Telangana': 'Telugu',
        'Maharashtra': 'Marathi',
        'West Bengal': 'Bengali',
        'Gujarat': 'Gujarati',
        'Punjab': 'Punjabi',
        'Odisha': 'Odia',
        'Assam': 'Assamese',
        'Bihar': 'Hindi',
        'Uttar Pradesh': 'Hindi',
        'Madhya Pradesh': 'Hindi',
        'Rajasthan': 'Hindi',
        'Haryana': 'Hindi',
        'Himachal Pradesh': 'Hindi',
        'Chhattisgarh': 'Hindi',
        'Jharkhand': 'Hindi',
        'Uttarakhand': 'Hindi',
        'Goa': 'Konkani',
        'Manipur': 'Manipuri',
        'Meghalaya': 'English',
        'Mizoram': 'Mizo',
        'Nagaland': 'English',
        'Tripura': 'Bengali',
        'Sikkim': 'Nepali'
      }
      stateLanguage = stateLanguageMap[formData.selectedState] || 'Tamil'
    }
    
    setFormData(prev => ({
      ...prev,
      selectedMedium: mediumType,
      mediumName: medium,
      stateLanguage: stateLanguage
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    
    try {
      // Ensure stateLanguage is set correctly before saving
      let finalStateLanguage = formData.stateLanguage
      if (!finalStateLanguage && formData.selectedState) {
        const stateLanguageMap = {
          'Tamil Nadu': 'Tamil',
          'Kerala': 'Malayalam',
          'Karnataka': 'Kannada',
          'Andhra Pradesh': 'Telugu',
          'Telangana': 'Telugu',
          'Maharashtra': 'Marathi',
          'West Bengal': 'Bengali',
          'Gujarat': 'Gujarati',
          'Punjab': 'Punjabi',
          'Odisha': 'Odia',
          'Assam': 'Assamese',
          'Bihar': 'Hindi',
          'Uttar Pradesh': 'Hindi',
          'Madhya Pradesh': 'Hindi',
          'Rajasthan': 'Hindi',
          'Haryana': 'Hindi',
          'Himachal Pradesh': 'Hindi',
          'Chhattisgarh': 'Hindi',
          'Jharkhand': 'Hindi',
          'Uttarakhand': 'Hindi',
          'Goa': 'Konkani',
          'Manipur': 'Manipuri',
          'Meghalaya': 'English',
          'Mizoram': 'Mizo',
          'Nagaland': 'English',
          'Tripura': 'Bengali',
          'Sikkim': 'Nepali'
        }
        finalStateLanguage = stateLanguageMap[formData.selectedState] || 'Tamil'
      }
      
      // Update profile
      updateProfile({
        name: formData.name,
        ageRange: formData.ageRange || '',
        generalLocation: (formData.generalLocation || '').trim(),
        residencyConfirmation: formData.residencyConfirmation || '',
        learningInterests: (formData.learningInterests || '').trim(),
        selectedState: formData.selectedState,
        selectedMedium: formData.selectedMedium,
        mediumName: formData.mediumName,
        stateLanguage: finalStateLanguage,
        class: formData.class,
        board: formData.board,
        stream: formData.stream,
        subjects: formData.subjects,
        profileComplete: true
      })
      
      alert('Settings saved successfully!')
      setIsEditing(false)
      setLoading(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings. Please try again.')
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
            <div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Settings</h1>
                <p className="text-xs md:text-sm text-gray-600">Manage your profile and preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFeedback(true)}
                className="px-3 md:px-4 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs md:text-sm font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                title="Share Your Feedback & Experience"
              >
                <MessageSquare className="h-4 w-4 text-amber-700" />
                <span>Feedback</span>
              </button>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full md:w-auto flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm md:text-base font-semibold cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-4xl">
        {/* Personal Information */}
        <div className="card mb-4 md:mb-6">
          <div className="flex items-center space-x-3 mb-4 md:mb-6">
            <User className="h-5 w-5 md:h-6 md:w-6 text-emerald-700" />
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="text-gray-900 py-2">{formData.name || 'Not set'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <p className="text-gray-900 py-2">{formData.email}</p>
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Type
              </label>
              <p className="text-gray-900 py-2">
                {user.userType === 'student' ? 'Learner' : user.userType === 'teacher' ? 'Admin' : user.userType}
              </p>
            </div>
          </div>
        </div>

        {/* Learner Profile & Community Registration Details */}
        <div className="card mb-4 md:mb-6">
          <div className="flex items-center space-x-3 mb-4 md:mb-6">
            <Compass className="h-5 w-5 md:h-6 md:w-6 text-emerald-700" />
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Community Registration Details</h2>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* 1. Age Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Range (Optional)
                </label>
                {isEditing ? (
                  <select
                    name="ageRange"
                    value={formData.ageRange}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select your age range</option>
                    {AGE_RANGE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">{formData.ageRange || 'Not specified'}</p>
                )}
              </div>

              {/* 2. General Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="generalLocation"
                    value={formData.generalLocation}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter your town, city or area"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{formData.generalLocation || 'Not set'}</p>
                )}
              </div>

              {/* 3. Residency Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residency Confirmation
                </label>
                <p className="text-xs text-gray-500 mb-2">Live in or around Ely?</p>
                {isEditing ? (
                  <select
                    name="residencyConfirmation"
                    value={formData.residencyConfirmation}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select an option</option>
                    {RESIDENCY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">{formData.residencyConfirmation || 'Not confirmed'}</p>
                )}
              </div>
            </div>

            {/* 4. Learning Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What would you most like help with?
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Enter what you would like help with or skills you want to learn.
              </p>

              {isEditing ? (
                <input
                  type="text"
                  name="learningInterests"
                  value={formData.learningInterests}
                  onChange={handleChange}
                  placeholder="Enter what you would like help with"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              ) : (
                <p className="text-gray-900 py-2">{formData.learningInterests || 'Not specified'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        {user.provider !== 'google' && (
          <div className="card mb-4 md:mb-6">
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <Lock className="h-5 w-5 md:h-6 md:w-6 text-emerald-700" />
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">Change Password</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter new password"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            {passwordStatus.message && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                passwordStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {passwordStatus.type === 'success' ? '✅' : '⚠️'} {passwordStatus.message}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={loading}
                className="w-full md:w-auto px-6 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 cursor-pointer font-semibold"
              >
                Update Password
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 text-sm md:text-base font-semibold"
            >
              <Save className="h-4 w-4 md:h-5 md:w-5" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                // Reset form data
                setFormData({
                  name: user.name || '',
                  email: user.email || '',
                  ageRange: user.ageRange || '',
                  generalLocation: user.generalLocation || '',
                  residencyConfirmation: user.residencyConfirmation || '',
                  learningInterests: typeof user.learningInterests === 'string'
                    ? user.learningInterests
                    : (Array.isArray(user.learningInterests) ? user.learningInterests.join(', ') : ''),
                  selectedState: user.selectedState || '',
                  selectedMedium: user.selectedMedium || '',
                  mediumName: user.mediumName || '',
                  stateLanguage: user.stateLanguage || '',
                  class: user.class || '',
                  board: user.board || 'State Board',
                  stream: user.stream || '',
                  subjects: user.subjects || []
                })
              }}
              className="px-4 md:px-6 py-2 md:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm md:text-base"
            >
              Cancel
            </button>
          </div>
        )}
      </main>

      {/* Learner Feedback Modal */}
      {showFeedback && (
        <Feedback onClose={() => setShowFeedback(false)} />
      )}
    </div>
  )
}

export default Settings
