/**
 * Centralized authentication storage utilities
 * Passwords are hashed using a simple hash before storage.
 * NOTE: For production, use a proper backend with bcrypt.
 */
import { syncUserToDb, updateUserInDb, deleteUserFromDb, deleteAllLearnersFromDb, fetchAllUsersFromDb } from '../services/userDbService.js'
import { generateSessionToken } from '../services/firebaseAuth.js'

export { syncUserToDb }

const STORAGE_KEYS = {
  REGISTERED_USERS: 'registeredUsers',
  CURRENT_USER: 'edulearn_user',
}


/** Simple deterministic hash (not cryptographic — use backend bcrypt in production) */
export const hashPassword = (password) => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `hashed_${Math.abs(hash).toString(36)}_${password.length}`
}

export const getRegisteredUsers = () => {
  try {
    const usersJson = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS)
    let users = usersJson ? JSON.parse(usersJson) : []
    
    // Ensure Demo Admin exists and has valid credentials
    const adminIdx = users.findIndex(u => String(u.email || '').toLowerCase().trim() === 'admin@onecommunityely.com')
    if (adminIdx === -1) {
      const demoAdmin = {
        id: 'admin_demo_01',
        name: 'Ely Admin',
        email: 'admin@onecommunityely.com',
        password: hashPassword('Admin123!'),
        userType: 'teacher',
        role: 'admin',
        registeredAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        isBanned: false,
        status: 'active'
      }
      users.push(demoAdmin)
      localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users))
      const { password, ...safeAdmin } = demoAdmin
      syncUserToDb(safeAdmin)
    } else {
      let changed = false
      if (users[adminIdx].userType !== 'teacher') {
        users[adminIdx].userType = 'teacher'
        changed = true
      }
      if (users[adminIdx].role !== 'admin') {
        users[adminIdx].role = 'admin'
        changed = true
      }
      if (users[adminIdx].isBanned) {
        users[adminIdx].isBanned = false
        changed = true
      }
      if (users[adminIdx].status !== 'active') {
        users[adminIdx].status = 'active'
        changed = true
      }
      if (users[adminIdx].password !== hashPassword('Admin123!')) {
        users[adminIdx].password = hashPassword('Admin123!')
        changed = true
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users))
      }
    }
    return users
  } catch { return [] }
}

export const saveRegisteredUsers = (users) => {
  try {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users))
    return true
  } catch { return false }
}

export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    return user ? JSON.parse(user) : null
  } catch { return null }
}

export const saveCurrentUser = (user) => {
  try {
    // Never persist the raw password in current user session
    const { password, ...safeUser } = user
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser))
    return true
  } catch { return false }
}

export const findUserByEmail = (email) => {
  if (!email) return null
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  return users.find(u => String(u.email || '').trim().toLowerCase() === cleanEmail) || null
}

export const updateUserInDatabase = (email, updates) => {
  if (!email) return null
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  const idx = users.findIndex(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (idx === -1) return null

  // Don't allow overwriting password hash via updates unless explicitly re-hashing
  const { password, ...safeUpdates } = updates
  // Filter out undefined values to prevent clobbering existing profile properties
  const cleanedUpdates = Object.fromEntries(
    Object.entries(safeUpdates).filter(([_, v]) => v !== undefined)
  )

  users[idx] = { ...users[idx], ...cleanedUpdates }
  saveRegisteredUsers(users)

  // Sync update to DynamoDB (non-blocking)
  updateUserInDb(cleanEmail, cleanedUpdates)

  const currentUser = getCurrentUser()
  if (currentUser && String(currentUser.email || '').trim().toLowerCase() === cleanEmail) {
    const updatedUser = { ...currentUser, ...cleanedUpdates }
    saveCurrentUser(updatedUser)
    return updatedUser
  }
  return users[idx]
}

export const verifyUserPassword = (email, currentPassword) => {
  if (!email) return false
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  const user = users.find(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (!user) return false

  const hashedInput = hashPassword(currentPassword)
  return user.password === hashedInput || user.password === currentPassword
}

export const changeUserPassword = (email, newPassword, currentPassword = null) => {
  if (!email) return { success: false, message: 'User not found in database.' }
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  const idx = users.findIndex(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (idx === -1) return { success: false, message: 'User not found in database.' }

  if (currentPassword) {
    const hashedCurrent = hashPassword(currentPassword)
    const storedPassword = users[idx].password
    if (storedPassword !== hashedCurrent && storedPassword !== currentPassword) {
      return { success: false, message: 'Current password is incorrect. Please verify and try again.' }
    }
  }

  const hashedPassword = hashPassword(newPassword)
  users[idx] = { ...users[idx], password: hashedPassword }
  saveRegisteredUsers(users)

  // Sync update to DynamoDB (non-blocking)
  updateUserInDb(cleanEmail, { password: hashedPassword })
  return { success: true }
}

export const banUser = (email) => {
  if (!email) return false
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  const idx = users.findIndex(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (idx === -1) return false

  const now = new Date().toISOString()
  users[idx] = { ...users[idx], isBanned: true, status: 'banned', bannedAt: now }
  saveRegisteredUsers(users)

  // Sync to DynamoDB
  updateUserInDb(cleanEmail, { isBanned: true, status: 'banned', bannedAt: now })

  // If currently active user is banned, logout
  const currentUser = getCurrentUser()
  if (currentUser && String(currentUser.email || '').trim().toLowerCase() === cleanEmail) {
    logoutUser()
  }
  return true
}

export const unbanUser = (email) => {
  if (!email) return false
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  const idx = users.findIndex(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (idx === -1) return false

  users[idx] = { ...users[idx], isBanned: false, status: 'active' }
  saveRegisteredUsers(users)

  // Sync to DynamoDB
  updateUserInDb(cleanEmail, { isBanned: false, status: 'active' })
  return true
}

export const deleteUserAccount = (email) => {
  if (!email) return false
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  const filtered = users.filter(u => String(u.email || '').trim().toLowerCase() !== cleanEmail)
  saveRegisteredUsers(filtered)

  // Delete from DynamoDB
  deleteUserFromDb(cleanEmail)

  const currentUser = getCurrentUser()
  if (currentUser && String(currentUser.email || '').trim().toLowerCase() === cleanEmail) {
    logoutUser()
  }
  return true
}

export const deleteAllLearners = async () => {
  const users = getRegisteredUsers()
  // Retain admin/teacher accounts only
  const preservedUsers = users.filter(u => {
    const isTeacher = u.userType === 'teacher'
    const isAdmin = u.role === 'admin' || u.isAdmin === true || String(u.email || '').trim().toLowerCase() === 'admin@onecommunityely.com'
    return isTeacher || isAdmin
  })
  saveRegisteredUsers(preservedUsers)

  // Trigger backend purge
  try {
    await deleteAllLearnersFromDb()
  } catch (err) {
    console.warn('Backend delete all learners warning:', err.message)
  }

  const currentUser = getCurrentUser()
  if (currentUser && currentUser.userType !== 'teacher' && currentUser.role !== 'admin' && String(currentUser.email || '').trim().toLowerCase() !== 'admin@onecommunityely.com') {
    logoutUser()
  }
  return true
}

export const setUserRole = (email, newRole) => {
  if (!email) return false
  const cleanEmail = String(email).trim().toLowerCase()
  const users = getRegisteredUsers()
  const idx = users.findIndex(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (idx === -1) return false

  users[idx] = { ...users[idx], userType: newRole }
  saveRegisteredUsers(users)

  // Sync to DynamoDB
  updateUserInDb(cleanEmail, { userType: newRole })

  const currentUser = getCurrentUser()
  if (currentUser && String(currentUser.email || '').trim().toLowerCase() === cleanEmail) {
    saveCurrentUser({ ...currentUser, userType: newRole })
  }
  return true
}

export const recordUserActivity = (email) => {
  if (!email) return
  const cleanEmail = String(email).trim().toLowerCase()
  const now = new Date().toISOString()
  const users = getRegisteredUsers()
  const idx = users.findIndex(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (idx !== -1) {
    users[idx].lastActiveAt = now
    saveRegisteredUsers(users)
  }
  const curr = getCurrentUser()
  if (curr && String(curr.email || '').trim().toLowerCase() === cleanEmail) {
    saveCurrentUser({ ...curr, lastActiveAt: now })
  }
  updateUserInDb(cleanEmail, { lastActiveAt: now })
}

export const registerUser = (userData) => {
  const users = getRegisteredUsers()
  const cleanEmail = String(userData.email || '').trim().toLowerCase()
  const existing = users.find(u => String(u.email || '').trim().toLowerCase() === cleanEmail)
  if (existing) return { success: false, message: 'User already exists' }

  const now = new Date().toISOString()
  const newUser = {
    id: Date.now(),
    registeredAt: now,
    lastActiveAt: now,
    isBanned: false,
    status: 'active',
    ...userData,
    email: cleanEmail,
    // Hash password before storing; Google users already use a uid-based token
    password: userData.provider === 'google'
      ? userData.password
      : hashPassword(userData.password),
  }

  users.push(newUser)
  saveRegisteredUsers(users)

  const { password, ...safeUser } = newUser
  // Sync to DynamoDB (non-blocking)
  syncUserToDb(safeUser)
  return { success: true, user: safeUser }
}

export const authenticateUser = (email, password, userType) => {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanUserType = String(userType || '').trim().toLowerCase()
  const users = getRegisteredUsers()
  const hashedInput = hashPassword(password)
  const isElyAdmin = cleanEmail === 'admin@onecommunityely.com'

  const user = users.find(u => {
    const uEmail = String(u.email || '').trim().toLowerCase()
    const uType = String(u.userType || u.role || '').trim().toLowerCase()
    if (uEmail !== cleanEmail) return false

    // Check password
    const pwdMatch = u.password === hashedInput || (isElyAdmin && password === 'Admin123!')
    if (!pwdMatch) return false

    // Check userType (for admin allow teacher or admin)
    if (cleanUserType === 'teacher' || cleanUserType === 'admin') {
      return uType === 'teacher' || uType === 'admin' || isElyAdmin
    }
    return uType === cleanUserType
  })

  if (user) {
    if (user.isBanned) {
      return { success: false, message: 'Your account has been banned. Please contact administrator.' }
    }
    const { password: _pw, ...safeUser } = user
    const now = new Date().toISOString()
    safeUser.lastActiveAt = now
    safeUser.lastLoginAt = now
    if (isElyAdmin) {
      safeUser.userType = 'teacher'
      safeUser.role = 'admin'
    }
    try {
      const token = generateSessionToken(safeUser)
      safeUser.idToken = token
      if (token) localStorage.setItem('edulearn_id_token', token)
    } catch {}
    updateUserInDatabase(cleanEmail, { lastActiveAt: now, lastLoginAt: now })
    saveCurrentUser(safeUser)
    return { success: true, user: safeUser }
  }
  return { success: false, message: 'Invalid credentials' }
}

export const fetchAllUsersList = async () => {
  const localUsers = getRegisteredUsers().map(({ password, ...u }) => u)
  try {
    const dbUsers = await fetchAllUsersFromDb()
    if (dbUsers && dbUsers.length > 0) {
      // Merge dbUsers with localUsers
      const map = new Map()
      dbUsers.forEach(u => map.set(u.email, u))
      localUsers.forEach(u => map.set(u.email, { ...map.get(u.email), ...u }))
      return Array.from(map.values())
    }
  } catch (e) {
    console.warn('Could not fetch users from DB:', e)
  }
  return localUsers
}

export const logoutUser = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
    localStorage.removeItem('edulearn_id_token')
    return true
  } catch { return false }
}

export const syncUserData = () => {
  const currentUser = getCurrentUser()
  if (!currentUser) return null

  const latestUserData = findUserByEmail(currentUser.email)
  if (latestUserData) {
    const stateLanguageMap = {
      'Tamil Nadu': 'Tamil', 'Kerala': 'Malayalam', 'Karnataka': 'Kannada',
      'Andhra Pradesh': 'Telugu', 'Telangana': 'Telugu', 'Maharashtra': 'Marathi',
      'West Bengal': 'Bengali', 'Gujarat': 'Gujarati', 'Punjab': 'Punjabi',
      'Odisha': 'Odia', 'Assam': 'Assamese', 'Bihar': 'Hindi',
      'Uttar Pradesh': 'Hindi', 'Madhya Pradesh': 'Hindi', 'Rajasthan': 'Hindi',
      'Haryana': 'Hindi', 'Himachal Pradesh': 'Hindi', 'Chhattisgarh': 'Hindi',
      'Jharkhand': 'Hindi', 'Uttarakhand': 'Hindi', 'Goa': 'Konkani',
      'Manipur': 'Manipuri', 'Meghalaya': 'English', 'Mizoram': 'Mizo',
      'Nagaland': 'English', 'Tripura': 'Bengali', 'Sikkim': 'Nepali',
    }
    if (!latestUserData.stateLanguage && latestUserData.selectedState) {
      latestUserData.stateLanguage = stateLanguageMap[latestUserData.selectedState] || 'Tamil'
      updateUserInDatabase(latestUserData.email, { stateLanguage: latestUserData.stateLanguage })
    }
    const { password, ...safeUser } = latestUserData
    saveCurrentUser(safeUser)
    return safeUser
  }
  return currentUser
}

export const clearAllAuthData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.REGISTERED_USERS)
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
    return true
  } catch { return false }
}

export const exportAuthData = () => ({
  users: getRegisteredUsers().map(({ password, ...u }) => u),
  currentUser: getCurrentUser(),
  exportedAt: new Date().toISOString(),
})

export const importAuthData = (data) => {
  try {
    if (data.users) saveRegisteredUsers(data.users)
    if (data.currentUser) saveCurrentUser(data.currentUser)
    return true
  } catch { return false }
}

export const registerNewAdmin = ({ name, email, password }) => {
  return registerUser({
    name: name || 'Administrator',
    email,
    password,
    userType: 'teacher'
  })
}
