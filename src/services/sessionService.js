/**
 * Session Service — prevents one account being used on two devices simultaneously.
 * Each device gets a unique ID. On login, the device ID is registered in DynamoDB.
 * If another device logs in with the same account, the old device gets kicked out.
 */
import { API_BASE_URL } from '../config.js'

const DEVICE_KEY = 'edulearn_device_id'

/** Get or create a persistent device ID for this browser */
export const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

/** Register this device as the active session for the user */
export const registerSession = async (email) => {
  const deviceId = getDeviceId()
  try {
    await fetch(`${API_BASE_URL}/api/users/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, deviceId }),
    })
  } catch { /* non-fatal */ }
  return deviceId
}

/** Check if this device is still the active session */
export const isSessionValid = async (email) => {
  const deviceId = getDeviceId()
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/users/session/${encodeURIComponent(email)}/${deviceId}`
    )
    const data = await res.json()
    return data.valid !== false
  } catch {
    return true // if check fails, don't kick out (network issue)
  }
}
