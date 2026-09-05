import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  trackActivity,
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
} from '../services/userHistoryTracker';

/**
 * Custom hook for tracking user activities
 * Automatically includes user info from auth context
 */
export function useActivityTracker() {
  const { user } = useAuth();

  const track = useCallback(async (activityType, activityDetails = {}) => {
    if (!user?.email) {
      console.warn('Cannot track activity: user not logged in');
      return { success: false, error: 'User not logged in' };
    }

    return await trackActivity(
      user.email,
      activityType,
      activityDetails,
      user.email
    );
  }, [user]);

  // Specific tracking functions
  const trackLoginActivity = useCallback(() => {
    if (!user?.email) return;
    return trackLogin(user.email, user.email);
  }, [user]);

  const trackLogoutActivity = useCallback(() => {
    if (!user?.email) return;
    return trackLogout(user.email, user.email);
  }, [user]);

  const trackAIChatActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackAIChat(user.email, user.email, details);
  }, [user]);

  const trackQuizActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackQuizAttempt(user.email, user.email, details);
  }, [user]);

  const trackVideoActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackVideoWatch(user.email, user.email, details);
  }, [user]);

  const trackBookReadActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackBookActivity(user.email, user.email, details, false);
  }, [user]);

  const trackBookDownloadActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackBookActivity(user.email, user.email, details, true);
  }, [user]);

  const trackVisualizationActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackVisualization(user.email, user.email, details);
  }, [user]);

  const trackPerformanceActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackPerformanceCheck(user.email, user.email, details);
  }, [user]);

  const trackHealthActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackHealthLog(user.email, user.email, details);
  }, [user]);

  const trackDisciplineActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackDisciplineUpdate(user.email, user.email, details);
  }, [user]);

  const trackCareerActivity = useCallback((details) => {
    if (!user?.email) return;
    return trackCareerSimulation(user.email, user.email, details);
  }, [user]);

  return {
    // Generic tracking
    track,
    
    // Specific tracking functions
    trackLogin: trackLoginActivity,
    trackLogout: trackLogoutActivity,
    trackAIChat: trackAIChatActivity,
    trackQuiz: trackQuizActivity,
    trackVideo: trackVideoActivity,
    trackBookRead: trackBookReadActivity,
    trackBookDownload: trackBookDownloadActivity,
    trackVisualization: trackVisualizationActivity,
    trackPerformance: trackPerformanceActivity,
    trackHealth: trackHealthActivity,
    trackDiscipline: trackDisciplineActivity,
    trackCareer: trackCareerActivity,
    
    // Activity types
    ActivityTypes,
    
    // User info
    userId: user?.email,
    isTracking: !!user?.email
  };
}

export default useActivityTracker;
