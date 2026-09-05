/**
 * Delayed Gratification Service — DynamoDB backed
 */
import { getData, saveData } from '../studentDataService.js'
import { REWARDS, POINT_ACTIVITIES } from '../../data/disciplineData'
import { getStreakData } from './streakTrackerService.js'

const POINTS_TYPE = 'points'
const REWARDS_TYPE = 'rewards'

const defaultPoints = () => ({
  totalPoints: 0, pointsEarnedToday: 0,
  lastPointDate: null, consecutiveDays: 0, pointsHistory: []
})

export const getPointsData = async (userId) => {
  try {
    return await getData(userId, POINTS_TYPE, null) || defaultPoints()
  } catch { return null }
}

export const awardPoints = async (userId, activity, customPoints = null) => {
  try {
    const data = await getPointsData(userId)
    const today = new Date().toISOString().split('T')[0]
    const points = customPoints || POINT_ACTIVITIES[activity]?.points || 0

    if (data.lastPointDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      data.consecutiveDays = data.lastPointDate === yesterday.toISOString().split('T')[0]
        ? data.consecutiveDays + 1 : 1
      data.pointsEarnedToday = 0
      data.lastPointDate = today
    }

    data.totalPoints += points
    data.pointsEarnedToday += points
    if (!data.pointsHistory) data.pointsHistory = []
    data.pointsHistory.push({ date: today, activity, points, timestamp: Date.now() })
    if (data.pointsHistory.length > 100) data.pointsHistory = data.pointsHistory.slice(-100)

    saveData(userId, POINTS_TYPE, data)
    await checkRewardUnlocks(userId)
    return { success: true, points, totalPoints: data.totalPoints }
  } catch { return { success: false } }
}

export const getUserRewards = async (userId) => {
  try {
    let rewards = await getData(userId, REWARDS_TYPE, null)
    if (!rewards) {
      rewards = REWARDS.map(r => ({ ...r, isUnlocked: false, unlockedAt: null, progress: 0 }))
      saveData(userId, REWARDS_TYPE, rewards)
    }
    return rewards
  } catch { return [] }
}

export const checkRewardUnlocks = async (userId) => {
  try {
    const [pointsData, rewards, streakData] = await Promise.all([
      getPointsData(userId), getUserRewards(userId), getStreakData(userId)
    ])
    let unlocked = []
    for (const reward of rewards) {
      if (reward.isUnlocked) continue
      if (pointsData.totalPoints >= reward.pointsRequired && streakData.currentStreak >= reward.daysRequired) {
        reward.isUnlocked = true
        reward.unlockedAt = new Date().toISOString()
        unlocked.push(reward)
      } else {
        reward.progress = Math.min(
          (pointsData.totalPoints / reward.pointsRequired) * 100,
          (streakData.currentStreak / reward.daysRequired) * 100
        )
      }
    }
    saveData(userId, REWARDS_TYPE, rewards)
    return unlocked
  } catch { return [] }
}

export const unlockReward = async (userId, rewardId) => {
  try {
    const rewards = await getUserRewards(userId)
    const reward = rewards.find(r => r.id === rewardId)
    if (!reward) return { success: false, message: 'Reward not found' }
    if (reward.isUnlocked) return { success: false, message: 'Already unlocked' }
    reward.isUnlocked = true
    reward.unlockedAt = new Date().toISOString()
    saveData(userId, REWARDS_TYPE, rewards)
    return { success: true, reward }
  } catch { return { success: false } }
}

export const getPointsStats = async (userId) => {
  try {
    const data = await getPointsData(userId)
    if (!data) return { totalPoints: 0, pointsEarnedToday: 0, weeklyPoints: 0 }
    
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 7)
    
    const history = data.pointsHistory || []
    const weeklyPoints = history
      .filter(h => new Date(h.date) >= sevenDaysAgo)
      .reduce((sum, h) => sum + (h.points || 0), 0)
      
    return {
      totalPoints: data.totalPoints || 0,
      pointsEarnedToday: data.pointsEarnedToday || 0,
      weeklyPoints
    }
  } catch {
    return { totalPoints: 0, pointsEarnedToday: 0, weeklyPoints: 0 }
  }
}
