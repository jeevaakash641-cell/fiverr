/**
 * Discipline Automation Service
 * Automates all discipline tracking and rewards
 */

import { updateStreak, checkStreakStatus, getStreakData } from './streakTrackerService';
import { awardPoints, checkRewardUnlocks, getPointsData } from './gratificationService';
import { getFocusStats } from './focusMonitorService';

const AUTOMATION_KEY = 'discipline_automation';
const CHECK_INTERVAL = 60000; // Check every minute

class DisciplineAutomation {
  constructor() {
    this.userId = null;
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start automation for a user
   */
  async start(userId) {
    if (this.isRunning) {
      console.log('Automation already running');
      return;
    }

    this.userId = userId;
    this.isRunning = true;

    console.log('🤖 Discipline Automation Started');

    // Run initial checks
    await this.runAutomationCycle();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.runAutomationCycle();
    }, CHECK_INTERVAL);

    // Save automation state
    this.saveAutomationState();
  }

  /**
   * Stop automation
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Discipline Automation Stopped');
  }

  /**
   * Run a complete automation cycle
   */
  async runAutomationCycle() {
    if (!this.userId) return;

    try {
      // 1. Auto-update streak on login
      await this.autoUpdateStreak();

      // 2. Check and award daily login points
      await this.autoAwardDailyPoints();

      // 3. Check streak status and send reminders
      await this.checkStreakReminder();

      // 4. Auto-unlock rewards
      await this.autoUnlockRewards();

      // 5. Generate daily summary
      await this.generateDailySummary();

    } catch (error) {
      console.error('Automation cycle error:', error);
    }
  }

  /**
   * Auto-update streak when user is active
   */
  async autoUpdateStreak() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = this.getLastCheck('streak');

      // Only update once per day
      if (lastCheck === today) return;

      const result = await updateStreak(this.userId);
      
      if (result.success) {
        console.log('✅ Streak auto-updated:', result.data.currentStreak);
        this.setLastCheck('streak', today);
        
        // Show notification
        this.showNotification('🔥 Streak Updated!', `Current streak: ${result.data.currentStreak} days`);
      }
    } catch (error) {
      console.error('Auto-update streak error:', error);
    }
  }

  /**
   * Auto-award daily login points
   */
  async autoAwardDailyPoints() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = this.getLastCheck('daily_points');

      // Only award once per day
      if (lastCheck === today) return;

      const result = await awardPoints(this.userId, 'daily_login');
      
      if (result.success) {
        console.log('✅ Daily points awarded:', result.pointsAwarded);
        this.setLastCheck('daily_points', today);
      }
    } catch (error) {
      console.error('Auto-award points error:', error);
    }
  }

  /**
   * Check streak status and send reminders
   */
  async checkStreakReminder() {
    try {
      const status = await checkStreakStatus(this.userId);
      
      if (status.status === 'at_risk') {
        const lastReminder = this.getLastCheck('streak_reminder');
        const now = Date.now();
        
        // Send reminder every 4 hours
        if (!lastReminder || (now - lastReminder) > 4 * 60 * 60 * 1000) {
          this.showNotification('⚠️ Streak at Risk!', status.message);
          this.setLastCheck('streak_reminder', now);
        }
      }
    } catch (error) {
      console.error('Streak reminder error:', error);
    }
  }

  /**
   * Auto-unlock rewards when criteria met
   */
  async autoUnlockRewards() {
    try {
      const unlocks = await checkRewardUnlocks(this.userId);
      
      if (unlocks && unlocks.length > 0) {
        unlocks.forEach(reward => {
          console.log('🎉 Reward unlocked:', reward.name);
          this.showNotification('🎉 Reward Unlocked!', reward.name);
        });
      }
    } catch (error) {
      console.error('Auto-unlock rewards error:', error);
    }
  }

  /**
   * Generate daily summary
   */
  async generateDailySummary() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = this.getLastCheck('daily_summary');

      // Generate once per day at end of day
      const hour = new Date().getHours();
      if (lastCheck === today || hour < 20) return; // Generate after 8 PM

      const [streakData, pointsData, focusStats] = await Promise.all([
        getStreakData(this.userId),
        getPointsData(this.userId),
        getFocusStats(this.userId)
      ]);

      const summary = {
        date: today,
        streak: streakData.currentStreak,
        points: pointsData.totalPoints,
        focusScore: focusStats.avgScore,
        activities: this.getTodayActivities()
      };

      this.saveDailySummary(summary);
      this.setLastCheck('daily_summary', today);

      console.log('📊 Daily summary generated:', summary);
    } catch (error) {
      console.error('Daily summary error:', error);
    }
  }

  /**
   * Auto-track study session
   */
  async autoTrackStudySession(duration) {
    try {
      // Award points based on duration
      const points = Math.floor(duration / 30) * 10; // 10 points per 30 min
      
      await awardPoints(this.userId, 'study_session', points);
      
      console.log(`✅ Study session tracked: ${duration} min, +${points} points`);
      this.showNotification('📚 Study Session Complete!', `+${points} points earned`);
    } catch (error) {
      console.error('Auto-track study error:', error);
    }
  }

  /**
   * Auto-track quiz completion
   */
  async autoTrackQuiz(score) {
    try {
      const activity = score >= 80 ? 'perfect_quiz' : 'complete_quiz';
      const result = await awardPoints(this.userId, activity);
      
      if (result.success) {
        console.log(`✅ Quiz tracked: ${score}%, +${result.pointsAwarded} points`);
        this.showNotification('🎯 Quiz Complete!', `Score: ${score}% | +${result.pointsAwarded} points`);
      }
    } catch (error) {
      console.error('Auto-track quiz error:', error);
    }
  }

  /**
   * Show browser notification
   */
  showNotification(title, message) {
    // Check if notifications are supported
    // Browser desktop popups disabled per user preference
    return;
  }

  /**
   * Show in-app notification
   */
  showInAppNotification(title, message) {
    const event = new CustomEvent('discipline-notification', {
      detail: { title, message, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get last check timestamp
   */
  getLastCheck(key) {
    try {
      const data = JSON.parse(localStorage.getItem(AUTOMATION_KEY) || '{}');
      return data[this.userId]?.[key] || null;
    } catch {
      return null;
    }
  }

  /**
   * Set last check timestamp
   */
  setLastCheck(key, value) {
    try {
      const data = JSON.parse(localStorage.getItem(AUTOMATION_KEY) || '{}');
      if (!data[this.userId]) {
        data[this.userId] = {};
      }
      data[this.userId][key] = value;
      localStorage.setItem(AUTOMATION_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error setting last check:', error);
    }
  }

  /**
   * Get today's activities
   */
  getTodayActivities() {
    try {
      const key = `activities_${this.userId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      const today = new Date().toISOString().split('T')[0];
      return data.filter(a => a.date === today);
    } catch {
      return [];
    }
  }

  /**
   * Save daily summary
   */
  saveDailySummary(summary) {
    try {
      const key = `summaries_${this.userId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      data.push(summary);
      // Keep last 30 days
      if (data.length > 30) {
        data.shift();
      }
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  }

  /**
   * Save automation state
   */
  saveAutomationState() {
    try {
      const state = {
        userId: this.userId,
        isRunning: this.isRunning,
        startedAt: Date.now()
      };
      localStorage.setItem('automation_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving automation state:', error);
    }
  }

  /**
   * Get automation statistics
   */
  async getAutomationStats() {
    try {
      const key = `summaries_${this.userId}`;
      const summaries = JSON.parse(localStorage.getItem(key) || '[]');
      
      return {
        totalDays: summaries.length,
        avgStreak: summaries.reduce((sum, s) => sum + s.streak, 0) / summaries.length || 0,
        avgPoints: summaries.reduce((sum, s) => sum + s.points, 0) / summaries.length || 0,
        avgFocus: summaries.reduce((sum, s) => sum + s.focusScore, 0) / summaries.length || 0,
        recentSummaries: summaries.slice(-7)
      };
    } catch {
      return null;
    }
  }
}

// Create singleton instance
const automationService = new DisciplineAutomation();

export default automationService;

// Export individual functions
export const startAutomation = (userId) => automationService.start(userId);
export const stopAutomation = () => automationService.stop();
export const trackStudySession = (duration) => automationService.autoTrackStudySession(duration);
export const trackQuiz = (score) => automationService.autoTrackQuiz(score);
export const getAutomationStats = () => automationService.getAutomationStats();
