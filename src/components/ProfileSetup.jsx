import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSubjectsForClass, getHigherSecondaryStreams, requiresStreamSelection, getClassLevel } from '../data/curriculumStructure'
import { ArrowLeft, GraduationCap, CheckCircle, ChevronRight } from 'lucide-react'

const ProfileSetup = () => {
  const [step, setStep] = useState(1)
  const [profileData, setProfileData] = useState({
    board: '',
    class: '',
    stream: '', // For Classes 11-12
    subjects: []
  })
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else if (user.userType !== 'student') {
      navigate('/dashboard')
    } else if (!user.selectedState) {
      navigate('/state-selection')
    } else if (!user.selectedMedium) {
      navigate('/medium-selection')
    } else if (user.profileComplete) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  if (!user) return null

  const boards = ['State Board', 'CBSE', 'ICSE']
  const classes = Array.from({ length: 12 }, (_, i) => i + 1)
  const streams = getHigherSecondaryStreams()

  const handleNext = () => {
    const classNum = parseInt(profileData.class)
    
    if (step === 1 && profileData.board) {
      setStep(2)
    } else if (step === 2 && profileData.class) {
      if (requiresStreamSelection(classNum)) {
        setStep(3) // Go to stream selection
      } else {
        completeSetup()
      }
    } else if (step === 3 && profileData.stream) {
      completeSetup()
    }
  }

  const completeSetup = () => {
    const classNum = parseInt(profileData.class)
    const subjects = [...new Set(getSubjectsForClass(classNum, profileData.stream, user.stateLanguage || 'Tamil')
      .map(s => s.name))]
    
    const completeProfile = {
      board: profileData.board,
      class: classNum,
      stream: profileData.stream || null,
      subjects,
      profileComplete: true
    }
    
    updateProfile(completeProfile)
    navigate('/dashboard')
  }

  const handleChange = (field, value) => {
    setProfileData({
      ...profileData,
      [field]: value
    })
  }

  return (
    <div className="edu-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div className="edu-card">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/medium-selection')}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={16} color="#374151" />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: 'var(--edu-gradient)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <GraduationCap size={24} color="white" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>Academic Profile</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Tell us about your education</p>
            </div>
            <div style={{ width: 36 }} />
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {[1, 2, ...(requiresStreamSelection(parseInt(profileData.class)) ? [3] : [])].map((s, i, arr) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: step >= s ? 'var(--edu-gradient)' : '#f4f5f7', border: `2px solid ${step >= s ? '#4f46e5' : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: step >= s ? 'white' : '#9ca3af' }}>
                  {step > s ? <CheckCircle size={16} color="white" /> : s}
                </div>
                {i < arr.length - 1 && <div style={{ width: 32, height: 2, background: step > s ? '#4f46e5' : '#e5e7eb', borderRadius: 99 }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Board */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', textAlign: 'center', marginBottom: 6 }}>Select Your Board</h3>
              <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>Choose your educational board</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {boards.map(board => (
                  <button key={board} onClick={() => handleChange('board', board)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: `2px solid ${profileData.board === board ? '#4f46e5' : '#e5e7eb'}`, background: profileData.board === board ? '#eef2ff' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: profileData.board === board ? '#4f46e5' : '#1a1a2e' }}>{board}</span>
                    {profileData.board === board && <CheckCircle size={18} color="#4f46e5" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Class */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', textAlign: 'center', marginBottom: 6 }}>Select Your Class</h3>
              <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>Choose your current class</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {classes.map(cls => (
                  <button key={cls} onClick={() => handleChange('class', cls.toString())}
                    style={{ padding: '14px 8px', textAlign: 'center', borderRadius: 12, border: `2px solid ${profileData.class === cls.toString() ? '#4f46e5' : '#e5e7eb'}`, background: profileData.class === cls.toString() ? '#eef2ff' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: profileData.class === cls.toString() ? '#4f46e5' : '#1a1a2e' }}>{cls}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{getClassLevel(cls).split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Stream */}
          {step === 3 && requiresStreamSelection(parseInt(profileData.class)) && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', textAlign: 'center', marginBottom: 6 }}>Select Your Stream</h3>
              <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>Choose your specialization</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {streams.map(stream => (
                  <button key={stream.id} onClick={() => handleChange('stream', stream.id)}
                    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: `2px solid ${profileData.stream === stream.id ? '#4f46e5' : '#e5e7eb'}`, background: profileData.stream === stream.id ? '#eef2ff' : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: profileData.stream === stream.id ? '#4f46e5' : '#1a1a2e', marginBottom: 4 }}>{stream.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{stream.subjects.map(s => s.name).join(', ')}</div>
                    </div>
                    {profileData.stream === stream.id && <CheckCircle size={18} color="#4f46e5" style={{ flexShrink: 0, marginLeft: 8 }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject preview */}
          {profileData.class && (step === 2 || step === 3) && (
            <div style={{ marginTop: 20, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 8 }}>Your Subjects</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {getSubjectsForClass(parseInt(profileData.class), profileData.stream, user.stateLanguage || 'Tamil').map((subject, i) => (
                  <span key={i} style={{ padding: '4px 12px', borderRadius: 20, background: 'white', border: '1px solid #c7d2fe', fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>{subject.name}</span>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleNext} className="edu-btn-submit" style={{ marginTop: 24 }}
            disabled={(step === 1 && !profileData.board) || (step === 2 && !profileData.class) || (step === 3 && !profileData.stream)}>
            {step === 3 || (step === 2 && !requiresStreamSelection(parseInt(profileData.class))) ? 'Complete Setup' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetup
