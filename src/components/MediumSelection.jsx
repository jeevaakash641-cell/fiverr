import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Globe, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'

const MediumSelection = () => {
  const [selectedMedium, setSelectedMedium] = useState('')
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else if (user.userType !== 'student') {
      navigate('/dashboard')
    } else if (!user.selectedState) {
      navigate('/state-selection')
    } else if (user.selectedMedium) {
      navigate('/profile-setup')
    }
  }, [user, navigate])

  if (!user) {
    return null
  }

  // State to language mapping
  const stateLanguageMap = {
    'Tamil Nadu': 'Tamil',
    'Kerala': 'Malayalam',
    'Karnataka': 'Kannada',
    'Andhra Pradesh': 'Telugu',
    'Telangana': 'Telugu',
    'Maharashtra': 'Marathi',
    'Gujarat': 'Gujarati',
    'West Bengal': 'Bengali',
    'Punjab': 'Punjabi',
    'Haryana': 'Hindi',
    'Rajasthan': 'Hindi',
    'Madhya Pradesh': 'Hindi',
    'Uttar Pradesh': 'Hindi',
    'Bihar': 'Hindi',
    'Jharkhand': 'Hindi',
    'Chhattisgarh': 'Hindi',
    'Uttarakhand': 'Hindi',
    'Himachal Pradesh': 'Hindi',
    'Delhi': 'Hindi',
    'Assam': 'Assamese',
    'Odisha': 'Odia',
    'Goa': 'Konkani',
    'Manipur': 'Manipuri',
    'Tripura': 'Bengali',
    'Meghalaya': 'English',
    'Nagaland': 'English',
    'Mizoram': 'Mizo',
    'Arunachal Pradesh': 'English',
    'Sikkim': 'Nepali',
    'Jammu and Kashmir': 'Urdu',
    'Ladakh': 'Ladakhi',
    'Chandigarh': 'Hindi',
    'Puducherry': 'Tamil',
    'Andaman and Nicobar Islands': 'Hindi',
    'Dadra and Nagar Haveli and Daman and Diu': 'Gujarati',
    'Lakshadweep': 'Malayalam'
  }

  const stateLanguage = stateLanguageMap[user.selectedState] || 'Hindi'
  
  const availableMediums = [
    {
      id: 'english',
      name: 'English Medium',
      description: 'All subjects taught in English',
      icon: '🇬🇧'
    },
    {
      id: 'state',
      name: `${stateLanguage} Medium`,
      description: `All subjects taught in ${stateLanguage}`,
      icon: '🇮🇳'
    }
  ]

  const handleMediumSelect = (medium) => setSelectedMedium(medium)
  const handleNext = () => {
    if (selectedMedium) {
      updateProfile({ selectedMedium: selectedMedium.id, mediumName: selectedMedium.name, stateLanguage })
      navigate('/profile-setup')
    }
  }

  return (
    <div className="edu-auth-page">
      <div className="edu-auth-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', backdropFilter: 'blur(10px)' }}>
            <Globe size={32} color="white" />
          </div>
          <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Medium of Instruction</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
            Your medium determines the language<br />used for quizzes and AI responses.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Selected State</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{user.selectedState}</div>
          </div>
        </div>
      </div>

      <div className="edu-auth-right">
        <div className="edu-auth-form-wrap">
          <button onClick={() => navigate('/state-selection')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="edu-auth-title">Select Medium</h1>
          <p className="edu-auth-subtitle">Step 1b — Choose your language of instruction</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {availableMediums.map((medium) => {
              const isSelected = selectedMedium?.id === medium.id
              return (
                <button key={medium.id} onClick={() => handleMediumSelect(medium)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 14, border: `2px solid ${isSelected ? '#4f46e5' : '#e5e7eb'}`, background: isSelected ? '#eef2ff' : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}>
                  <span style={{ fontSize: 28 }}>{medium.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: isSelected ? '#4f46e5' : '#1a1a2e' }}>{medium.name}</div>
                    <div style={{ fontSize: 13, color: isSelected ? '#6366f1' : '#6b7280', marginTop: 2 }}>{medium.description}</div>
                  </div>
                  {isSelected && <CheckCircle size={20} color="#4f46e5" />}
                </button>
              )
            })}
          </div>

          <button onClick={handleNext} className="edu-btn-submit" disabled={!selectedMedium}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Continue to Profile Setup <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MediumSelection