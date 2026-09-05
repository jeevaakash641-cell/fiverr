/**
 * Focus Tracker Utility
 * Monitors user focus, tab switching, and activity during study sessions
 */

class FocusTracker {
  constructor() {
    this.isTracking = false
    this.tabSwitchCount = 0
    this.inactiveTime = 0
    this.activeTime = 0
    this.startTime = null
    this.lastActivityTime = null
    this.isTabVisible = true
    this.isWindowFocused = true
    this.inactivityThreshold = 30000 // 30 seconds of no activity
    
    // Timer intervals
    this.activeTimer = null
    this.inactivityTimer = null
    
    // Bind event handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.handleWindowBlur = this.handleWindowBlur.bind(this)
    this.handleWindowFocus = this.handleWindowFocus.bind(this)
    this.handleUserActivity = this.handleUserActivity.bind(this)
  }

  /**
   * Start tracking focus metrics
   */
  startFocusTracking() {
    if (this.isTracking) {
      console.warn('Focus tracking is already active')
      return
    }

    // Reset metrics
    this.tabSwitchCount = 0
    this.inactiveTime = 0
    this.activeTime = 0
    this.startTime = Date.now()
    this.lastActivityTime = Date.now()
    this.isTabVisible = !document.hidden
    this.isWindowFocused = document.hasFocus()
    this.isTracking = true

    // Add event listeners
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('blur', this.handleWindowBlur)
    window.addEventListener('focus', this.handleWindowFocus)
    window.addEventListener('mousemove', this.handleUserActivity)
    window.addEventListener('keydown', this.handleUserActivity)
    window.addEventListener('click', this.handleUserActivity)
    window.addEventListener('scroll', this.handleUserActivity)

    // Start active time timer (updates every second)
    this.activeTimer = setInterval(() => {
      if (this.isTabVisible && this.isWindowFocused) {
        this.activeTime += 1
      }
    }, 1000)

    // Start inactivity checker (checks every 5 seconds)
    this.inactivityTimer = setInterval(() => {
      this.checkInactivity()
    }, 5000)

    console.log('Focus tracking started')
  }

  /**
   * Stop tracking focus metrics
   */
  stopFocusTracking() {
    if (!this.isTracking) {
      console.warn('Focus tracking is not active')
      return
    }

    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('blur', this.handleWindowBlur)
    window.removeEventListener('focus', this.handleWindowFocus)
    window.removeEventListener('mousemove', this.handleUserActivity)
    window.removeEventListener('keydown', this.handleUserActivity)
    window.removeEventListener('click', this.handleUserActivity)
    window.removeEventListener('scroll', this.handleUserActivity)

    // Clear timers
    if (this.activeTimer) {
      clearInterval(this.activeTimer)
      this.activeTimer = null
    }

    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer)
      this.inactivityTimer = null
    }

    this.isTracking = false
    console.log('Focus tracking stopped')
  }

  /**
   * Handle visibility change (tab switching)
   */
  handleVisibilityChange() {
    const isVisible = !document.hidden

    if (!isVisible && this.isTabVisible) {
      // Tab became hidden - user switched away
      this.tabSwitchCount++
      console.log('Tab switch detected. Count:', this.tabSwitchCount)
    }

    this.isTabVisible = isVisible
  }

  /**
   * Handle window blur (window lost focus)
   */
  handleWindowBlur() {
    this.isWindowFocused = false
  }

  /**
   * Handle window focus (window gained focus)
   */
  handleWindowFocus() {
    this.isWindowFocused = true
    this.lastActivityTime = Date.now()
  }

  /**
   * Handle user activity (mouse, keyboard, etc.)
   */
  handleUserActivity() {
    this.lastActivityTime = Date.now()
  }

  /**
   * Check for user inactivity
   */
  checkInactivity() {
    if (!this.isTracking) return

    const now = Date.now()
    const timeSinceActivity = now - this.lastActivityTime

    if (timeSinceActivity > this.inactivityThreshold && this.isTabVisible) {
      // User is inactive but tab is visible
      const inactiveSeconds = Math.floor(timeSinceActivity / 1000)
      this.inactiveTime = inactiveSeconds
    } else {
      this.inactiveTime = 0
    }
  }

  /**
   * Calculate focus score
   * Formula: 100 - (tabSwitchCount × 5)
   * Range: 0 to 100
   */
  calculateFocusScore() {
    let score = 100 - (this.tabSwitchCount * 5)
    
    // Apply penalty for excessive inactivity (if inactive for more than 2 minutes)
    if (this.inactiveTime > 120) {
      score -= Math.floor((this.inactiveTime - 120) / 60) * 2
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score))
  }

  /**
   * Get current focus statistics
   */
  getFocusStats() {
    const focusScore = this.calculateFocusScore()
    const totalTime = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0

    return {
      isTracking: this.isTracking,
      focusScore,
      tabSwitchCount: this.tabSwitchCount,
      activeTime: this.activeTime,
      inactiveTime: this.inactiveTime,
      totalTime,
      isTabVisible: this.isTabVisible,
      isWindowFocused: this.isWindowFocused,
      lastActivityTime: this.lastActivityTime
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.tabSwitchCount = 0
    this.inactiveTime = 0
    this.activeTime = 0
    this.startTime = Date.now()
    this.lastActivityTime = Date.now()
  }

  /**
   * Get formatted active time (HH:MM:SS)
   */
  getFormattedActiveTime() {
    const hours = Math.floor(this.activeTime / 3600)
    const minutes = Math.floor((this.activeTime % 3600) / 60)
    const seconds = this.activeTime % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
}

// Create singleton instance
const focusTrackerInstance = new FocusTracker()

// Export functions
export const startFocusTracking = () => focusTrackerInstance.startFocusTracking()
export const stopFocusTracking = () => focusTrackerInstance.stopFocusTracking()
export const getFocusStats = () => focusTrackerInstance.getFocusStats()
export const resetFocusStats = () => focusTrackerInstance.reset()
export const getFormattedActiveTime = () => focusTrackerInstance.getFormattedActiveTime()

export default focusTrackerInstance
