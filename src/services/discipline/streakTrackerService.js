/**
 * Discipline Streak Tracker Service — DynamoDB backed
 */
import { getData, saveData } from '../studentDataService.js'

const DATA_TYPE = 'streaks'
const SHIELDS_PER_MONTH = 3

const defaultStreak = () => ({
  currentStreak: 0, longestStreak: 0, lastActivityDate: null,
  shieldsRemaining: SHIELDS_PER_MONTH, shieldsResetDate: getNextMonthFirstDay(),
  totalShieldsUsed: 0, streakHistory: []
})

function getNextMonthFirstDay() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0]
}

export const getStreakData = async (userId) => {
  try {
    let data = await getData(userId, DATA_TYPE, null)
    if (!data) data = defaultStreak()

    // Reset shields monthly
    const today = new Date()
    if (data.shieldsResetDate && today >= new Date(data.shieldsResetDate)) {
      data.shieldsRemaining = SHIELDS_PER_MONTH
      data.shieldsResetDate = getNextMonthFirstDay()
      saveData(userId, DATA_TYPE, data)
    }
    return data
  } catch { return null }
}

export const updateStreak = async (userId) => {
  try {
    const data = await getStreakData(userId)
    const today = new Date().toISOString().split('T')[0]
    if (data.lastActivityDate === today) return { success: true, message: 'Already updated today', data }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (data.lastActivityDate === yesterdayStr) data.currentStreak += 1
    else data.currentStreak = 1

    if (data.currentStreak > data.longestStreak) data.longestStreak = data.currentStreak
    data.lastActivityDate = today
    if (!data.streakHistory) data.streakHistory = []
    data.streakHistory.push({ date: today, streak: data.currentStreak, shieldUsed: false })

    saveData(userId, DATA_TYPE, data)
    return { success: true, message: 'Streak updated', data }
  } catch { return { success: false, message: 'Failed to update streak' } }
}

export const useShield = async (userId) => {
  try {
    const data = await getStreakData(userId)
    if (data.shieldsRemaining <= 0) return { success: false, message: 'No shields remaining' }

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (data.lastActivityDate !== yesterdayStr && data.lastActivityDate !== today)
      return { success: false, message: 'Streak not at risk' }

    data.shieldsRemaining -= 1
    data.totalShieldsUsed += 1
    data.lastActivityDate = today
    if (!data.streakHistory) data.streakHistory = []
    data.streakHistory.push({ date: today, streak: data.currentStreak, shieldUsed: true })

    saveData(userId, DATA_TYPE, data)
    return { success: true, message: 'Shield used successfully', data }
  } catch { return { success: false, message: 'Failed to use shield' } }
}

export const checkStreakStatus = async (userId) => {
  try {
    const data = await getStreakData(userId)
    if (!data) return { status: 'ok', message: '' }

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (data.lastActivityDate === yesterdayStr) {
      return { 
        status: 'at_risk', 
        message: 'Log in and study today to keep your daily learning streak alive!' 
      }
    }
    return { status: 'ok', message: '' }
  } catch {
    return { status: 'ok', message: '' }
  }
}

export const getStreakCalendar = async (userId, days = 7) => {
  try {
    const data = await getStreakData(userId)
    const history = data?.streakHistory || []
    
    const result = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = dayNames[d.getDay()]
      
      const matched = history.find(h => h.date === dateStr)
      result.push({
        dayName,
        date: dateStr,
        hasActivity: !!matched,
        shieldUsed: matched ? !!matched.shieldUsed : false
      })
    }
    
    return result
  } catch {
    return []
  }
}
