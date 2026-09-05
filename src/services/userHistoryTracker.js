import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Activity Types - matches backend
 */
export const ActivityTypes = {
  // Learning Activities
  AI_CHAT: 'ai_chat',
  QUIZ_ATTEMPT: 'quiz_attempt',
  VIDEO_WATCH: 'video_watch',
  BOOK_READ: 'book_read',
  BOOK_DOWNLOAD: 'book_download',
  VISUALIZATION_VIEW: 'visualization_view',
  
  // Study Activities
  STUDY_SESSION: 'study_session',
  PREDICTION_VIEW: 'prediction_view',
  PERFORMANCE_CHECK: 'performance_check',
  
  // Teacher Activities
  CONTENT_GENERATE: 'content_generate',
  QUESTION_GENERATE: 'question_generate',
  HOMEWORK_CREATE: 'homework_create',
  
  // Health & Discipline
  HEALTH_LOG: 'health_log',
  DISCIPLINE_UPDATE: 'discipline_update',
  STREAK_UPDATE: 'streak_update',
  REWARD_UNLOCK: 'reward_unlock',
  
  // Career & Simulation
  CAREER_SIMULATE: 'career_simulate',
  DECISION_SIMULATE: 'decision_simulate',
  
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  PROFILE_UPDATE: 'profile_update'
};

/**
 * Track a single user activity
 */
export async function trackActivity(userId, activityType, activityDetails = {}, userEmail = null) {
  try {
    const response = await axios.post(`${API_URL}/api/history/track`, {
      userId,
      userEmail,
      activityType,
      activityDetails,
      metadata: {
        platform: 'web',
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error tracking activity:', error);
    // Don't throw - tracking failures shouldn't break the app
    return { success: false, error: error.message };
  }
}

/**
 * Track multiple activities at once
 */
export async function trackBatchActivities(activities) {
  try {
    const response = await axios.post(`${API_URL}/api/history/track-batch`, {
      activities
    });

    return response.data;
  } catch (error) {
    console.error('Error tracking batch activities:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user activity history
 */
export async function getUserHistory(userId, options = {}) {
  try {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.activityType) params.append('activityType', options.activityType);
    if (options.lastEvaluatedKey) {
      params.append('lastEvaluatedKey', JSON.stringify(options.lastEvaluatedKey));
    }

    const response = await axios.get(
      `${API_URL}/api/history/${userId}?${params.toString()}`
    );

    return response.data;
  } catch (error) {
    console.error('Error getting user history:', error);
    throw error;
  }
}

/**
 * Get user activity statistics
 */
export async function getUserActivityStats(userId, days = 30) {
  try {
    const response = await axios.get(
      `${API_URL}/api/history/${userId}/stats?days=${days}`
    );

    return response.data;
  } catch (error) {
    console.error('Error getting activity stats:', error);
    throw error;
  }
}

/**
 * Get activity summary for specific type
 */
export async function getActivitySummary(userId, activityType, days = 7) {
  try {
    const response = await axios.get(
      `${API_URL}/api/history/${userId}/summary/${activityType}?days=${days}`
    );

    return response.data;
  } catch (error) {
    console.error('Error getting activity summary:', error);
    throw error;
  }
}

/**
 * Helper function to track login
 */
export function trackLogin(userId, userEmail) {
  return trackActivity(userId, ActivityTypes.LOGIN, {
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track logout
 */
export function trackLogout(userId, userEmail) {
  return trackActivity(userId, ActivityTypes.LOGOUT, {
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track AI chat
 */
export function trackAIChat(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.AI_CHAT, {
    question: details.question,
    subject: details.subject,
    language: details.language,
    responseLength: details.responseLength,
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track quiz attempt
 */
export function trackQuizAttempt(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.QUIZ_ATTEMPT, {
    subject: details.subject,
    score: details.score,
    totalQuestions: details.totalQuestions,
    correctAnswers: details.correctAnswers,
    timeSpent: details.timeSpent,
    difficulty: details.difficulty,
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track video watch
 */
export function trackVideoWatch(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.VIDEO_WATCH, {
    videoTitle: details.videoTitle,
    videoId: details.videoId,
    duration: details.duration,
    watchTime: details.watchTime,
    completed: details.completed,
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track book read/download
 */
export function trackBookActivity(userId, userEmail, details, isDownload = false) {
  return trackActivity(
    userId, 
    isDownload ? ActivityTypes.BOOK_DOWNLOAD : ActivityTypes.BOOK_READ,
    {
      bookTitle: details.bookTitle,
      bookId: details.bookId,
      subject: details.subject,
      class: details.class,
      timestamp: new Date().toISOString()
    },
    userEmail
  );
}

/**
 * Helper function to track visualization view
 */
export function trackVisualization(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.VISUALIZATION_VIEW, {
    subject: details.subject,
    visualizationType: details.visualizationType,
    duration: details.duration,
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track performance check
 */
export function trackPerformanceCheck(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.PERFORMANCE_CHECK, {
    predictedScore: details.predictedScore,
    confidence: details.confidence,
    subjects: details.subjects,
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track health log
 */
export function trackHealthLog(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.HEALTH_LOG, {
    screenTime: details.screenTime,
    studyTime: details.studyTime,
    breakTime: details.breakTime,
    sleepHours: details.sleepHours,
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track discipline updates
 */
export function trackDisciplineUpdate(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.DISCIPLINE_UPDATE, {
    streak: details.streak,
    points: details.points,
    level: details.level,
    timestamp: new Date().toISOString()
  }, userEmail);
}

/**
 * Helper function to track career simulation
 */
export function trackCareerSimulation(userId, userEmail, details) {
  return trackActivity(userId, ActivityTypes.CAREER_SIMULATE, {
    career: details.career,
    education: details.education,
    salary: details.salary,
    lifestyle: details.lifestyle,
    timestamp: new Date().toISOString()
  }, userEmail);
}

export default {
  trackActivity,
  trackBatchActivities,
  getUserHistory,
  getUserActivityStats,
  getActivitySummary,
  trackLogin,
  trackLogout,
  trackAIChat,
  trackQuizAttempt,
  trackVideoWatch,
  trackBookActivity,
  trackVisualization,
  trackPerformanceCheck,
  trackHealthLog,
  trackDisciplineUpdate,
  trackCareerSimulation,
  ActivityTypes
};
