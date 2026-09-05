import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  getCurrentUser, 
  saveCurrentUser, 
  logoutUser as logoutFromStorage,
  updateUserInDatabase,
  syncUserData,
  changeUserPassword,
  recordUserActivity
} from '../utils/authStorage'
import { buildStudentProfile, hasValidProfile } from '../utils/studentProfileBuilder'
import { predictStudyScore, getRiskSubjects, simulateImprovement } from '../services/studyTwinApi'
import { getStudentProfile } from '../utils/studentDataCollector'
import { trackLogin, trackLogout } from '../services/userHistoryTracker'
import { fetchUserFromDb, syncUserToDb } from '../services/userDbService'
import { registerSession, isSessionValid } from '../services/sessionService'
import { generateSessionToken } from '../services/firebaseAuth'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [predictions, setPredictions] = useState(null)
  const [predictionsLoading, setPredictionsLoading] = useState(false)

  // Live Activity Heartbeat — keeps active user marked as Online in real time
  useEffect(() => {
    if (!user?.email) return
    recordUserActivity(user.email)
    const interval = setInterval(() => {
      recordUserActivity(user.email)
    }, 45 * 1000)
    return () => clearInterval(interval)
  }, [user?.email])

  useEffect(() => {
    const init = async () => {
      // First try localStorage (fast path)
      let syncedUser = syncUserData()

      // If no local user, try to restore from DynamoDB using last known email
      if (!syncedUser) {
        const lastEmail = localStorage.getItem('edulearn_last_email')
        if (lastEmail) {
          console.log('AuthContext: Restoring from DynamoDB for', lastEmail)
          try {
            const dbUser = await fetchUserFromDb(lastEmail)
            if (dbUser) {
              saveCurrentUser(dbUser)
              updateUserInDatabase(dbUser.email, dbUser)
              syncedUser = dbUser
              console.log('AuthContext: Profile restored from DynamoDB ✅')
            }
          } catch (e) {
            console.warn('DynamoDB restore failed:', e.message)
          }
        }
      }

      if (syncedUser) {
        localStorage.setItem('edulearn_last_email', syncedUser.email)
        try {
          if (!localStorage.getItem('edulearn_id_token')) {
            const token = generateSessionToken(syncedUser)
            if (token) localStorage.setItem('edulearn_id_token', token)
          }
        } catch {}
        // Normalize subjects
        if (syncedUser.subjects?.length) {
          syncedUser.subjects = [...new Set(
            syncedUser.subjects
              .map(s => s === 'Language II (English)' ? 'English' : s)
              .filter(s => s !== 'Language I (Regional)')
          )]
          const stateLanguageMap = {
            'Tamil Nadu': 'Tamil', 'Kerala': 'Malayalam', 'Karnataka': 'Kannada',
            'Andhra Pradesh': 'Telugu', 'Telangana': 'Telugu', 'Maharashtra': 'Marathi',
            'Gujarat': 'Gujarati', 'West Bengal': 'Bengali', 'Punjab': 'Punjabi',
            'Haryana': 'Hindi', 'Rajasthan': 'Hindi', 'Madhya Pradesh': 'Hindi',
            'Uttar Pradesh': 'Hindi', 'Bihar': 'Hindi', 'Jharkhand': 'Hindi',
            'Chhattisgarh': 'Hindi', 'Uttarakhand': 'Hindi', 'Himachal Pradesh': 'Hindi',
            'Delhi': 'Hindi', 'Assam': 'Assamese', 'Odisha': 'Odia', 'Goa': 'Konkani',
            'Manipur': 'Manipuri', 'Tripura': 'Bengali', 'Meghalaya': 'English',
            'Nagaland': 'English', 'Mizoram': 'Mizo', 'Arunachal Pradesh': 'English',
            'Sikkim': 'Nepali', 'Jammu and Kashmir': 'Urdu', 'Puducherry': 'Tamil',
            'Chandigarh': 'Hindi', 'Ladakh': 'Ladakhi'
          }
          const lang = stateLanguageMap[syncedUser.selectedState] || syncedUser.stateLanguage
          if (lang && lang !== 'English' && !syncedUser.subjects.includes(lang)) {
            syncedUser.subjects = [lang, ...syncedUser.subjects]
          }
          saveCurrentUser(syncedUser)
          updateUserInDatabase(syncedUser.email, { subjects: syncedUser.subjects })
        }
        setUser(syncedUser)
        if (syncedUser.userType === 'student') {
          initializeStudentPredictions(syncedUser)
        }
      } else {
        console.log('AuthContext: No user found')
      }
      setLoading(false)
    }
    init()
  }, [])

  // Periodic session validity check — logs out if another device took over
  useEffect(() => {
    if (!user?.email) return
    const check = async () => {
      const valid = await isSessionValid(user.email)
      if (!valid) {
        console.warn('Session invalidated — another device logged in')
        setUser(null)
        setPredictions(null)
        logoutFromStorage()
        alert('You have been logged out because your account was signed in on another device.')
        window.location.href = '/login'
      }
    }
    // Check every 2 minutes
    const interval = setInterval(check, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.email])
  const initializeStudentPredictions = async (userData) => {
    try {
      console.log('🤖 Initializing student predictions...')
      setPredictionsLoading(true)

      // Build student profile from user data
      const profile = buildStudentProfile(userData)
      
      if (!profile || !hasValidProfile()) {
        console.log('⚠️ Invalid profile, skipping predictions')
        setPredictionsLoading(false)
        return
      }

      // Fetch predictions from AI
      console.log('📡 Fetching AI predictions...')
      const studentProfile = getStudentProfile()
      
      const [predictionResult, riskResult] = await Promise.all([
        predictStudyScore(studentProfile).catch(err => {
          console.error('Prediction error:', err)
          return null
        }),
        getRiskSubjects(studentProfile).catch(err => {
          console.error('Risk analysis error:', err)
          return null
        })
      ])

      // Create improvement scenario
      let simulationResult = null
      if (Object.keys(studentProfile.study_time_hours).length > 0) {
        const improvementPlan = {
          increased_study_time: {},
          focus_on_topics: []
        }

        Object.keys(studentProfile.study_time_hours).forEach(subject => {
          improvementPlan.increased_study_time[subject] = 
            studentProfile.study_time_hours[subject] * 1.5
        })

        Object.values(studentProfile.weak_topics).forEach(topics => {
          improvementPlan.focus_on_topics.push(...topics)
        })

        simulationResult = await simulateImprovement(studentProfile, improvementPlan).catch(err => {
          console.error('Simulation error:', err)
          return null
        })
      }

      // Store predictions
      const predictionsData = {
        prediction: predictionResult?.prediction || null,
        riskSubjects: riskResult?.risk_subjects || [],
        simulation: simulationResult?.simulation || null,
        timestamp: new Date().toISOString()
      }

      setPredictions(predictionsData)
      console.log('✅ Predictions loaded successfully')

    } catch (error) {
      console.error('❌ Error initializing predictions:', error)
    } finally {
      setPredictionsLoading(false)
    }
  }

  const login = async (userData) => {
    console.log('AuthContext: Login called for:', userData.email)
    // Deduplicate and normalize subjects on login
    if (userData.subjects?.length) {
      userData = { ...userData, subjects: [...new Set(
        userData.subjects
          .map(s => s === 'Language II (English)' ? 'English' : s)
          .filter(s => s !== 'Language I (Regional)')
      )] }
    }
    setUser(userData)
    saveCurrentUser(userData)
    localStorage.setItem('edulearn_last_email', userData.email)
    try {
      if (!userData.idToken && !userData.token) {
        const token = generateSessionToken(userData)
        userData.idToken = token
        if (token) localStorage.setItem('edulearn_id_token', token)
      } else if (userData.idToken || userData.token) {
        localStorage.setItem('edulearn_id_token', userData.idToken || userData.token)
      }
    } catch {}
    // Sync full profile to DynamoDB
    syncUserToDb(userData)
    // Register this device as the active session (kicks out other devices)
    registerSession(userData.email)
    console.log('AuthContext: User logged in successfully')

    // Track login activity
    trackLogin(userData.email, userData.email).catch(err => 
      console.error('Failed to track login:', err)
    )

    // Build profile and fetch predictions for students
    if (userData.userType === 'student') {
      await initializeStudentPredictions(userData)
    }
  }

  const logout = () => {
    console.log('AuthContext: Logout called')
    
    // Track logout activity before clearing user
    if (user?.email) {
      trackLogout(user.email, user.email).catch(err => 
        console.error('Failed to track logout:', err)
      )
    }
    
    setUser(null)
    setPredictions(null)
    logoutFromStorage()
    try {
      localStorage.removeItem('edulearn_id_token')
    } catch {}
    console.log('AuthContext: User logged out')
  }

  const updateProfile = (profileData) => {
    if (!user) return
    // Deduplicate subjects if present
    if (profileData.subjects?.length) {
      profileData = { ...profileData, subjects: [...new Set(profileData.subjects)] }
    }
    const updatedUser = updateUserInDatabase(user.email, profileData)
    if (updatedUser) {
      setUser(updatedUser)
    }
  }
  const changePassword = (newPassword) => {
    if (!user) return false
    return changeUserPassword(user.email, newPassword)
  }

  const value = {
    user,
    login,
    logout,
    updateProfile,
    changePassword,
    loading,
    predictions,
    predictionsLoading,
    refreshPredictions: () => user && initializeStudentPredictions(user)
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}