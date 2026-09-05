import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, ArrowRight, CheckCircle } from 'lucide-react'

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
  'Sikkim': ['Nepali Medium', 'English Medium'],
}
const indianStates = Object.keys(stateMediumMapping).sort()

const StateSelection = () => {
  const [selectedState, setSelectedState] = useState('')
  const [selectedMedium, setSelectedMedium] = useState('')
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/login')
    else if (user.userType !== 'student' && user.userType !== 'teacher') navigate('/dashboard')
    else if (user.selectedState && user.selectedMedium) navigate('/profile-setup')
  }, [user, navigate])

  if (!user) return null

  const availableMediums = selectedState ? stateMediumMapping[selectedState] || [] : []
  const getStateLanguage = (medium) => medium.replace(' Medium', '')
  const getMediumType = (medium) => medium === 'English Medium' ? 'english' : 'state'
  const handleStateChange = (state) => { setSelectedState(state); setSelectedMedium('') }

  const handleNext = () => {
    if (!selectedState || !selectedMedium) return
    updateProfile({
      selectedState,
      selectedMedium: getMediumType(selectedMedium),
      mediumName: selectedMedium,
      stateLanguage: getStateLanguage(selectedMedium),
    })
    navigate('/profile-setup')
  }

  return (
    <div className="edu-auth-page">
      {/* Left panel */}
      <div className="edu-auth-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', backdropFilter: 'blur(10px)' }}>
            <MapPin size={32} color="white" />
          </div>
          <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 10 }}>State & Medium</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
            We personalise your curriculum,<br />subjects and quiz language based on<br />your state and medium.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Curriculum-aligned subjects', 'Mother tongue quiz support', 'State board content'].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px', backdropFilter: 'blur(8px)' }}>
                <CheckCircle size={16} color="white" />
                <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="edu-auth-right">
        <div className="edu-auth-form-wrap">
          <h1 className="edu-auth-title">Select State & Medium</h1>
          <p className="edu-auth-subtitle">Step 1 of 3 — Choose your state and language medium</p>

          <div className="edu-form-group">
            <label className="edu-label">State *</label>
            <select value={selectedState} onChange={e => handleStateChange(e.target.value)} className="edu-select" required>
              <option value="">Choose your state</option>
              {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="edu-form-group">
            <label className="edu-label">Medium of Instruction *</label>
            <select value={selectedMedium} onChange={e => setSelectedMedium(e.target.value)} className="edu-select" disabled={!selectedState} required>
              <option value="">{!selectedState ? 'Select state first' : 'Choose medium'}</option>
              {availableMediums.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {selectedState && (
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
                Available: {availableMediums.join(' · ')}
              </div>
            )}
          </div>

          {selectedState && selectedMedium && (
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 6 }}>Your Selection</div>
              <div style={{ fontSize: 13, color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>State: <strong>{selectedState}</strong></div>
                <div>Medium: <strong>{selectedMedium}</strong></div>
                <div>Language: <strong>{getStateLanguage(selectedMedium)}</strong></div>
              </div>
            </div>
          )}

          <button onClick={handleNext} className="edu-btn-submit" disabled={!selectedState || !selectedMedium}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Continue to Profile Setup <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default StateSelection