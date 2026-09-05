/**
 * Automatic Health Tracking Service
 * Tracks user activity automatically without manual input
 */

const AUTO_HEALTH_KEY = 'auto_health_tracking';
const DAILY_DATA_KEY = 'daily_health_data';

class AutoHealthTracker {
  constructor() {
    this.userId = null;
    this.sessionStart = null;
    this.studySessionStart = null;
    this.lastActivityTime = Date.now();
    this.activityCheckInterval = null;
    this.isTracking = false;
  }

  /**
   * Start automatic tracking
   */
  start(userId) {
    if (this.isTracking) return;

    this.userId = userId;
    this.isTracking = true;
    this.sessionStart = Date.now();

    console.log('🏥 Auto Health Tracking Started');

    // Initialize today's data
    this.initializeTodayData();

    // Track page visibility
    this.setupVisibilityTracking();

    // Track activity
    this.setupActivityTracking();

    // Track study sessions
    this.setupStudyTracking();

    // Auto-save periodically
    this.setupAutoSave();
  }

  /**
   * Stop tracking
   */
  stop() {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }
    this.isTracking = false;
    this.saveCurrentSession();
    console.log('🛑 Auto Health Tracking Stopped');
  }

  /**
   * Initialize today's data structure
   */
  initializeTodayData() {
    const today = new Date().toISOString().split('T')[0];
    const data = this.getTodayData();

    if (!data || data.date !== today) {
      // New day, initialize fresh data
      this.setTodayData({
        date: today,
        sleepHours: 0,
        screenTime: 0,
        studyHours: 0,
        breakTime: 0,
        activeTime: 0,
        idleTime: 0,
        sessionCount: 0,
        lastUpdated: Date.now()
      });
    }
  }

  /**
   * Setup visibility tracking for screen time
   */
  setupVisibilityTracking() {
    let visibilityStart = Date.now();
    let isVisible = !document.hidden;

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // Tab became hidden, record active time
        if (isVisible) {
          const duration = (now - visibilityStart) / 1000 / 60 / 60; // hours
          this.addScreenTime(duration);
        }
        isVisible = false;
      } else {
        // Tab became visible
        visibilityStart = now;
        isVisible = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track on page unload
    window.addEventListener('beforeunload', () => {
      if (isVisible) {
        const duration = (Date.now() - visibilityStart) / 1000 / 60 / 60;
        this.addScreenTime(duration);
      }
    });
  }

  /**
   * Setup activity tracking (mouse, keyboard)
   */
  setupActivityTracking() {
    let lastActivity = Date.now();
    let isActive = true;
    const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const updateActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity > IDLE_THRESHOLD && isActive) {
        // User went idle
        isActive = false;
        const idleDuration = timeSinceLastActivity / 1000 / 60 / 60; // hours
        this.addIdleTime(idleDuration);
      }

      lastActivity = now;
      isActive = true;
    };

    // Track user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for idle every minute
    this.activityCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity > IDLE_THRESHOLD && isActive) {
        isActive = false;
        this.addBreakTime(timeSinceLastActivity / 1000 / 60 / 60);
      }
    }, 60000);
  }

  /**
   * Setup study session tracking
   */
  setupStudyTracking() {
    // Listen for study session events
    window.addEventListener('study-session-start', () => {
      this.startStudySession();
    });

    window.addEventListener('study-session-end', (event) => {
      this.endStudySession(event.detail?.duration);
    });
  }

  /**
   * Setup auto-save
   */
  setupAutoSave() {
    // Save every 5 minutes
    setInterval(() => {
      this.saveCurrentSession();
    }, 5 * 60 * 1000);
  }

  /**
   * Start study session
   */
  startStudySession() {
    this.studySessionStart = Date.now();
    console.log('📚 Study session started');
  }

  /**
   * End study session
   */
  endStudySession(duration) {
    if (this.studySessionStart) {
      const sessionDuration = duration || (Date.now() - this.studySessionStart) / 1000 / 60 / 60;
      this.addStudyTime(sessionDuration);
      this.studySessionStart = null;
      console.log(`📚 Study session ended: ${sessionDuration.toFixed(2)} hours`);
    }
  }

  /**
   * Add screen time
   */
  addScreenTime(hours) {
    const data = this.getTodayData();
    if (data) {
      data.screenTime += hours;
      data.lastUpdated = Date.now();
      this.setTodayData(data);
    }
  }

  /**
   * Add study time
   */
  addStudyTime(hours) {
    const data = this.getTodayData();
    if (data) {
      data.studyHours += hours;
      data.sessionCount += 1;
      data.lastUpdated = Date.now();
      this.setTodayData(data);
      console.log(`✅ Study time added: ${hours.toFixed(2)} hours`);
    }
  }

  /**
   * Add break time
   */
  addBreakTime(hours) {
    const data = this.getTodayData();
    if (data) {
      data.breakTime += hours;
      data.lastUpdated = Date.now();
      this.setTodayData(data);
    }
  }

  /**
   * Add idle time
   */
  addIdleTime(hours) {
    const data = this.getTodayData();
    if (data) {
      data.idleTime += hours;
      data.lastUpdated = Date.now();
      this.setTodayData(data);
    }
  }

  /**
   * Estimate sleep hours based on last activity
   */
  estimateSleepHours() {
    const lastSession = this.getLastSession();
    if (!lastSession) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (lastSession.date === yesterday) {
      // Calculate time between last activity yesterday and first activity today
      const lastActivityYesterday = lastSession.lastUpdated;
      const firstActivityToday = this.sessionStart;
      
      if (firstActivityToday && lastActivityYesterday) {
        const sleepDuration = (firstActivityToday - lastActivityYesterday) / 1000 / 60 / 60;
        // Assume sleep if gap is between 4-12 hours
        if (sleepDuration >= 4 && sleepDuration <= 12) {
          return sleepDuration;
        }
      }
    }

    return 0;
  }

  /**
   * Get today's data
   */
  getTodayData() {
    try {
      const allData = JSON.parse(localStorage.getItem(DAILY_DATA_KEY) || '{}');
      return allData[this.userId] || null;
    } catch {
      return null;
    }
  }

  /**
   * Set today's data
   */
  setTodayData(data) {
    try {
      const allData = JSON.parse(localStorage.getItem(DAILY_DATA_KEY) || '{}');
      allData[this.userId] = data;
      localStorage.setItem(DAILY_DATA_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error('Error saving health data:', error);
    }
  }

  /**
   * Get last session
   */
  getLastSession() {
    try {
      const allData = JSON.parse(localStorage.getItem(AUTO_HEALTH_KEY) || '{}');
      const userData = allData[this.userId] || [];
      return userData[userData.length - 1] || null;
    } catch {
      return null;
    }
  }

  /**
   * Save current session
   */
  saveCurrentSession() {
    const data = this.getTodayData();
    if (!data) return;

    try {
      const allData = JSON.parse(localStorage.getItem(AUTO_HEALTH_KEY) || '{}');
      if (!allData[this.userId]) {
        allData[this.userId] = [];
      }

      // Update or add today's entry
      const existingIndex = allData[this.userId].findIndex(entry => entry.date === data.date);
      if (existingIndex >= 0) {
        allData[this.userId][existingIndex] = data;
      } else {
        allData[this.userId].push(data);
      }

      // Keep last 30 days
      if (allData[this.userId].length > 30) {
        allData[this.userId] = allData[this.userId].slice(-30);
      }

      localStorage.setItem(AUTO_HEALTH_KEY, JSON.stringify(allData));
      console.log('💾 Health data auto-saved');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Get auto-tracked data summary
   */
  getAutoTrackedSummary() {
    const data = this.getTodayData();
    if (!data) return null;

    // Estimate sleep if not set
    if (data.sleepHours === 0) {
      data.sleepHours = this.estimateSleepHours();
    }

    return {
      date: data.date,
      sleepHours: Math.round(data.sleepHours * 10) / 10,
      screenTime: Math.round(data.screenTime * 10) / 10,
      studyHours: Math.round(data.studyHours * 10) / 10,
      breakTime: Math.round(data.breakTime * 10) / 10,
      sessionCount: data.sessionCount,
      lastUpdated: new Date(data.lastUpdated).toLocaleString()
    };
  }

  /**
   * Get history
   */
  getHistory() {
    try {
      const allData = JSON.parse(localStorage.getItem(AUTO_HEALTH_KEY) || '{}');
      return allData[this.userId] || [];
    } catch {
      return [];
    }
  }

  /**
   * Manual override for sleep hours
   */
  setSleepHours(hours) {
    const data = this.getTodayData();
    if (data) {
      data.sleepHours = hours;
      data.lastUpdated = Date.now();
      this.setTodayData(data);
      console.log(`😴 Sleep hours set: ${hours}`);
    }
  }
}

// Create singleton instance
const autoHealthTracker = new AutoHealthTracker();

export default autoHealthTracker;

// Export functions
export const startAutoHealthTracking = (userId) => autoHealthTracker.start(userId);
export const stopAutoHealthTracking = () => autoHealthTracker.stop();
export const getAutoHealthSummary = () => autoHealthTracker.getAutoTrackedSummary();
export const getAutoHealthHistory = () => autoHealthTracker.getHistory();
export const setSleepHours = (hours) => autoHealthTracker.setSleepHours(hours);
export const startStudySession = () => autoHealthTracker.startStudySession();
export const endStudySession = (duration) => autoHealthTracker.endStudySession(duration);
