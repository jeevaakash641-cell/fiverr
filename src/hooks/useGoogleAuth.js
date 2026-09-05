import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { findUserByEmail, registerUser, updateUserInDatabase, getRegisteredUsers, saveRegisteredUsers } from '../utils/authStorage'
import { syncUserToDb } from '../services/userDbService'
import { signInWithGoogle } from '../services/firebaseAuth'
import { API_BASE_URL } from '../config'

/**
 * Check if learner profile contains the required registration fields.
 * Returning users with existing accounts log in immediately.
 */
export const isLearnerProfileComplete = (u) => {
  if (!u) return false
  if (u.userType === 'teacher' || u.role === 'admin') return true
  // Any existing user with an established account is considered complete
  if (u.profileCompleted) return true
  if (u.registeredAt || u.createdAt || u.id || u.email) return true

  const hasLocation = typeof u.generalLocation === 'string' && u.generalLocation.trim().length > 0
  const hasResidency = typeof u.residencyConfirmation === 'string' && ['Yes', 'No', 'Prefer not to say'].includes(u.residencyConfirmation)
  const hasInterests = (typeof u.learningInterests === 'string' && u.learningInterests.trim().length > 0) || (Array.isArray(u.learningInterests) && u.learningInterests.length > 0)

  return (hasLocation && hasResidency && hasInterests) || !!u.registeredAt
}

/**
 * Shared Google sign-in logic.
 * Returning learners log in directly.
 * Only brand new Google learners without any prior registration are prompted to complete details.
 */
export const useGoogleAuth = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const completeGoogleLearnerProfile = async (googleUser, profileData, setLoading) => {
    setLoading(true)
    try {
      const cleanEmail = String(googleUser.email || '').toLowerCase().trim()
      let finalUser
      const existingUser = findUserByEmail(cleanEmail)

      const cleanedProfile = {
        name: googleUser.name || existingUser?.name || 'Google Learner',
        email: cleanEmail,
        ageRange: profileData.ageRange || '',
        generalLocation: (profileData.generalLocation || '').trim(),
        residencyConfirmation: profileData.residencyConfirmation || '',
        learningInterests: typeof profileData.learningInterests === 'string'
          ? profileData.learningInterests.trim()
          : (Array.isArray(profileData.learningInterests) ? profileData.learningInterests.join(', ') : ''),
        otherLearningInterest: (profileData.otherLearningInterest || '').trim(),
        profileCompleted: true,
        registeredAt: existingUser?.registeredAt || new Date().toISOString()
      }

      if (existingUser) {
        finalUser = updateUserInDatabase(cleanEmail, { ...cleanedProfile, userType: 'student' }) || { ...existingUser, ...cleanedProfile, userType: 'student' }
      } else {
        const reg = registerUser({
          name: googleUser.name || 'Google Learner',
          email: cleanEmail,
          password: `google_${googleUser.uid}`,
          userType: 'student',
          photoURL: googleUser.photoURL || '',
          provider: 'google',
          uid: googleUser.uid,
          ...cleanedProfile
        })
        if (!reg.success && reg.message !== 'User already exists') {
          alert('Failed to create account: ' + (reg.message || 'Unknown error'))
          return
        }
        finalUser = reg.user || findUserByEmail(cleanEmail) || { ...googleUser, ...cleanedProfile, userType: 'student' }
      }

      // Sync user to DynamoDB backend
      if (finalUser) {
        syncUserToDb(finalUser)
      }

      login(finalUser)
      await new Promise(r => setTimeout(r, 100))
      navigate('/dashboard')
    } catch (e) {
      console.error('Error completing profile:', e)
      alert('Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async (setLoading, onNeedsProfile) => {
    setLoading(true)
    try {
      const result = await signInWithGoogle()
      if (!result.success) { alert(result.error); return }

      const googleUser = result.user
      const cleanEmail = String(googleUser.email || '').toLowerCase().trim()
      let existingUser = findUserByEmail(cleanEmail)

      // If not found in localStorage, check backend API
      if (!existingUser) {
        try {
          const authHeaders = googleUser.idToken ? { 'Authorization': `Bearer ${googleUser.idToken}` } : {}
          const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(cleanEmail)}`, {
            headers: authHeaders
          })
          if (res.ok) {
            const data = await res.json()
            if (data.user) {
              existingUser = data.user
              // Cache in local registered users so subsequent lookups are instant
              const users = getRegisteredUsers()
              const idx = users.findIndex(u => String(u.email || '').toLowerCase().trim() === cleanEmail)
              if (idx !== -1) {
                users[idx] = { ...users[idx], ...existingUser }
              } else {
                users.push(existingUser)
              }
              saveRegisteredUsers(users)
            }
          }
        } catch (e) {
          console.warn('Backend user lookup error:', e)
        }
      }

      if (existingUser && isLearnerProfileComplete(existingUser)) {
        // Returning user with complete profile — log straight in immediately
        login(existingUser)
        await new Promise(r => setTimeout(r, 100))
        navigate(existingUser.userType === 'teacher' ? '/admin-panel' : '/dashboard')
      } else {
        // Only prompt brand new users who do not exist yet
        setLoading(false)
        if (onNeedsProfile) {
          onNeedsProfile(googleUser)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return { handleGoogleSignIn, completeGoogleLearnerProfile }
}

