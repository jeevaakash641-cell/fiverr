import { API_BASE_URL } from '../config.js'

const BASE_URL = `${API_BASE_URL}/api/student-data`

/**
 * Get student data from DynamoDB, falling back to localStorage if offline/error
 */
export const getData = async (userId, dataType, defaultValue = null) => {
  if (!userId) return defaultValue;
  
  // Try loading from localStorage first as cache
  const cacheKey = `student_data_${userId}_${dataType}`
  const cached = localStorage.getItem(cacheKey)
  
  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(userId)}/${dataType}`)
    if (res.ok) {
      const result = await res.json()
      if (result.success && result.data !== null) {
        // Cache in localStorage
        localStorage.setItem(cacheKey, JSON.stringify(result.data))
        return result.data
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch student data for ${dataType} from DB:`, err.message)
  }
  
  // Return cached or default value
  return cached ? JSON.parse(cached) : defaultValue
}

/**
 * Save student data to DynamoDB and update localStorage cache
 */
export const saveData = async (userId, dataType, data) => {
  if (!userId) return false;
  
  const cacheKey = `student_data_${userId}_${dataType}`
  localStorage.setItem(cacheKey, JSON.stringify(data))
  
  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(userId)}/${dataType}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    if (res.ok) {
      const result = await res.json()
      return result.success
    }
    return false;
  } catch (err) {
    console.warn(`Failed to save student data for ${dataType} to DB:`, err.message)
    return false
  }
}