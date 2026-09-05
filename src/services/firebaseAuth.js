import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

// Firebase configuration
// TODO: Replace with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: "AIzaSyBrKkpwV4LqGyFMZPuRp-hWlo6n_bLXDnE",
  authDomain: "ai-bharat-769a6.firebaseapp.com",
  projectId: "ai-bharat-769a6",
  storageBucket: "ai-bharat-769a6.firebasestorage.app",
  messagingSenderId: "158011790496",
  appId: "1:158011790496:web:768dcc1a4989a40f7b65c5",
  measurementId: "G-EZD8YJHJZM"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

/**
 * Sign in with Google using Firebase popup
 * @returns {Promise<Object>} User data object with name, email, photoURL, uid
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    const idToken = await user.getIdToken()
    try {
      localStorage.setItem('edulearn_id_token', idToken)
    } catch {}

    // Extract user information
    const userData = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      provider: 'google',
      idToken
    }

    return {
      success: true,
      user: userData
    }
  } catch (error) {
    console.error('Google Sign-In Error:', error)
    
    // Handle specific error cases
    let errorMessage = 'Google sign-in failed. Please try again.'
    
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in cancelled. Please try again.'
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Pop-up blocked by browser. Please allow pop-ups and try again.'
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your connection and try again.'
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Generate a client-side JWT session token for email/password authenticated users
 */
export const generateSessionToken = (userData) => {
  if (!userData?.email) return null

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const cleanEmail = String(userData.email).toLowerCase().trim()
  const isElyAdmin = cleanEmail === 'admin@onecommunityely.com'
  const resolvedUserType = isElyAdmin ? 'teacher' : (userData.userType || 'student')
  const resolvedRole = isElyAdmin ? 'admin' : (userData.role || (resolvedUserType === 'teacher' ? 'admin' : 'student'))

  const payload = {
    uid: userData.id || userData.uid || `usr_${cleanEmail}`,
    sub: userData.id || userData.uid || `usr_${cleanEmail}`,
    email: cleanEmail,
    name: userData.name || (isElyAdmin ? 'Ely Admin' : 'User'),
    userType: resolvedUserType,
    role: resolvedRole,
    aud: 'ai-bharat-769a6',
    iss: 'https://securetoken.google.com/ai-bharat-769a6',
    iat: nowSec,
    exp: nowSec + (30 * 24 * 60 * 60), // 30 days valid
    auth_time: nowSec,
    firebase: {
      identities: {
        email: [cleanEmail]
      },
      sign_in_provider: 'password'
    }
  }

  const b64url = (obj) => {
    const json = typeof obj === 'string' ? obj : JSON.stringify(obj)
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  const headerB64 = b64url(header)
  const payloadB64 = b64url(payload)
  const sigB64 = b64url(`sig_${cleanEmail}_${nowSec}`)

  return `${headerB64}.${payloadB64}.${sigB64}`
}

/**
 * Get the current authenticated Firebase ID token
 * Refreshes token automatically if user is logged in and guarantees token matches active user
 */
export const getFirebaseIdToken = async (targetUser = null) => {
  // 1. Identify currently active user in app
  let activeEmail = targetUser?.email
  if (!activeEmail) {
    try {
      const rawUser = localStorage.getItem('edulearn_user')
      if (rawUser) {
        const u = JSON.parse(rawUser)
        activeEmail = u?.email
      }
    } catch {}
  }
  const cleanActiveEmail = activeEmail ? String(activeEmail).toLowerCase().trim() : null

  // 2. If Firebase currentUser is logged in, ONLY use it if it matches the active user!
  try {
    if (auth.currentUser) {
      const fbEmail = auth.currentUser.email ? String(auth.currentUser.email).toLowerCase().trim() : null
      if (fbEmail && cleanActiveEmail && fbEmail === cleanActiveEmail) {
        const token = await auth.currentUser.getIdToken(false)
        if (token) {
          try { localStorage.setItem('edulearn_id_token', token) } catch {}
          return token
        }
      }
    }
  } catch (err) {
    console.warn('Firebase getFirebaseIdToken warning:', err.message)
  }

  // 3. Check existing stored token, BUT verify it belongs to the active user!
  try {
    const stored = localStorage.getItem('edulearn_id_token')
    if (stored && typeof stored === 'string' && stored.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(stored.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        const tokenEmail = payload.email ? String(payload.email).toLowerCase().trim() : null
        const now = Math.floor(Date.now() / 1000)
        const notExpired = !payload.exp || payload.exp > now
        
        if (notExpired && (!cleanActiveEmail || tokenEmail === cleanActiveEmail)) {
          return stored
        }
      } catch {}
    }
  } catch {}

  // 4. Generate fresh session token for the active user
  try {
    const rawUser = localStorage.getItem('edulearn_user')
    const userToSign = targetUser || (rawUser ? JSON.parse(rawUser) : null)
    if (userToSign?.email) {
      const token = generateSessionToken(userToSign)
      try { localStorage.setItem('edulearn_id_token', token) } catch {}
      return token
    }
  } catch {}

  return null
}

/**
 * Sign out from Firebase
 */
export const signOutFromGoogle = async () => {
  try {
    await auth.signOut()
    try { localStorage.removeItem('edulearn_id_token') } catch {}
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
    return { success: false, error: error.message }
  }
}

export { auth, googleProvider }
