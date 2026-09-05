/**
 * Focus Score Monitor Service
 * Tracks focus during study sessions
 */

const STORAGE_KEY = 'focus_sessions';

let currentSession = null;
let tabSwitchCount = 0;
let idleTimeSeconds = 0;
let lastActivityTime = Date.now();
let idleCheckInterval = null;

export const startFocusSession = (userId) => {
  if (currentSession) {
    console.warn('Session already in progress');
    return currentSession;
  }
  
  currentSession = {
    userId,
    sessionId: Date.now().toString(),
    startTime: Date.now(),
    endTime: null,
    durationMinutes: 0,
    tabSwitches: 0,
    idleTimeSeconds: 0,
    questionsSkipped: 0,
    focusScore: 100,
    focusStatus: 'Deep Focus'
  };
  
  tabSwitchCount = 0;
  idleTimeSeconds = 0;
  lastActivityTime = Date.now();
  
  // Start idle detection
  startIdleDetection();
  
  // Listen for visibility changes (tab switches)
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for user activity
  document.addEventListener('mousemove', handleUserActivity);
  document.addEventListener('keypress', handleUserActivity);
  document.addEventListener('click', handleUserActivity);
  
  return currentSession;
};

export const endFocusSession = async () => {
  if (!currentSession) {
    console.warn('No active session');
    return null;
  }
  
  // Stop idle detection
  stopIdleDetection();
  
  // Remove event listeners
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('mousemove', handleUserActivity);
  document.removeEventListener('keypress', handleUserActivity);
  document.removeEventListener('click', handleUserActivity);
  
  // Calculate final metrics
  currentSession.endTime = Date.now();
  currentSession.durationMinutes = Math.round((currentSession.endTime - currentSession.startTime) / 60000);
  currentSession.tabSwitches = tabSwitchCount;
  currentSession.idleTimeSeconds = idleTimeSeconds;
  
  // Calculate focus score
  const score = calculateFocusScore({
    tabSwitches: tabSwitchCount,
    idleTimeSeconds,
    questionsSkipped: currentSession.questionsSkipped,
    durationMinutes: currentSession.durationMinutes
  });
  
  currentSession.focusScore = score;
  currentSession.focusStatus = getFocusStatus(score);
  
  // Save session
  await saveFocusSession(currentSession);
  
  const session = { ...currentSession };
  currentSession = null;
  
  return session;
};

export const getCurrentSession = () => {
  if (!currentSession) return null;
  
  return {
    ...currentSession,
    tabSwitches: tabSwitchCount,
    idleTimeSeconds,
    durationMinutes: Math.round((Date.now() - currentSession.startTime) / 60000),
    focusScore: calculateFocusScore({
      tabSwitches: tabSwitchCount,
      idleTimeSeconds,
      questionsSkipped: currentSession.questionsSkipped,
      durationMinutes: Math.round((Date.now() - currentSession.startTime) / 60000)
    })
  };
};

export const trackQuestionSkip = () => {
  if (currentSession) {
    currentSession.questionsSkipped += 1;
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    tabSwitchCount += 1;
  }
  handleUserActivity();
};

const handleUserActivity = () => {
  lastActivityTime = Date.now();
};

const startIdleDetection = () => {
  idleCheckInterval = setInterval(() => {
    const idleTime = Date.now() - lastActivityTime;
    
    // If idle for more than 2 minutes, count it
    if (idleTime > 120000) {
      idleTimeSeconds += 1;
    }
  }, 1000);
};

const stopIdleDetection = () => {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
};

const calculateFocusScore = (metrics) => {
  let score = 100;
  
  // Tab switch penalty (max -30)
  const tabPenalty = Math.min(metrics.tabSwitches * 2, 30);
  score -= tabPenalty;
  
  // Idle time penalty (max -25)
  const idleMinutes = metrics.idleTimeSeconds / 60;
  const idlePenalty = Math.min(Math.floor(idleMinutes / 2) * 5, 25);
  score -= idlePenalty;
  
  // Question skipping penalty (max -20)
  const skipPenalty = Math.min(metrics.questionsSkipped * 3, 20);
  score -= skipPenalty;
  
  // Duration bonus (longer focused sessions are better)
  if (metrics.durationMinutes >= 45) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const getFocusStatus = (score) => {
  if (score >= 80) return 'Deep Focus';
  if (score >= 50) return 'Distracted';
  return 'Highly Distracted';
};

export const getFocusStatusIcon = (status) => {
  switch (status) {
    case 'Deep Focus':
      return '🟢';
    case 'Distracted':
      return '🟡';
    case 'Highly Distracted':
      return '🔴';
    default:
      return '⚪';
  }
};

const saveFocusSession = async (session) => {
  try {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    if (!allData[session.userId]) {
      allData[session.userId] = [];
    }
    
    allData[session.userId].push({
      ...session,
      date: new Date().toISOString().split('T')[0]
    });
    
    // Keep only last 50 sessions
    if (allData[session.userId].length > 50) {
      allData[session.userId] = allData[session.userId].slice(-50);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    return true;
  } catch (error) {
    console.error('Error saving focus session:', error);
    return false;
  }
};

export const getFocusHistory = async (userId) => {
  try {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return allData[userId] || [];
  } catch (error) {
    console.error('Error getting focus history:', error);
    return [];
  }
};

export const getFocusStats = async (userId) => {
  const history = await getFocusHistory(userId);
  
  if (history.length === 0) {
    return null;
  }
  
  const avgScore = history.reduce((sum, session) => sum + session.focusScore, 0) / history.length;
  const deepFocusSessions = history.filter(s => s.focusScore >= 80).length;
  const totalMinutes = history.reduce((sum, session) => sum + session.durationMinutes, 0);
  
  return {
    totalSessions: history.length,
    avgScore: Math.round(avgScore),
    deepFocusSessions,
    totalMinutes,
    lastSession: history[history.length - 1]
  };
};
