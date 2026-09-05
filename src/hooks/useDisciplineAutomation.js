/**
 * React Hook for Discipline Automation
 * Easy integration with React components
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import automationService, { 
  startAutomation, 
  stopAutomation,
  trackStudySession,
  trackQuiz,
  getAutomationStats
} from '../services/discipline/automationService';
import { startAutoHealthTracking, stopAutoHealthTracking } from '../services/autoHealthTracker';

export const useDisciplineAutomation = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      // Start discipline automation
      startAutomation(user.email);
      setIsActive(true);

      // Start auto health tracking
      startAutoHealthTracking(user.email);

      // Load stats
      loadStats();

      // Listen for notifications
      const handleNotification = (event) => {
        const notification = event.detail;
        setNotifications(prev => [...prev, notification]);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.timestamp !== notification.timestamp));
        }, 5000);
      };

      window.addEventListener('discipline-notification', handleNotification);

      return () => {
        window.removeEventListener('discipline-notification', handleNotification);
        stopAutoHealthTracking();
      };
    } else {
      // Stop automation when user logs out
      stopAutomation();
      stopAutoHealthTracking();
      setIsActive(false);
    }
  }, [user]);

  const loadStats = async () => {
    const automationStats = await getAutomationStats();
    setStats(automationStats);
  };

  const dismissNotification = (timestamp) => {
    setNotifications(prev => prev.filter(n => n.timestamp !== timestamp));
  };

  return {
    isActive,
    notifications,
    stats,
    dismissNotification,
    trackStudySession,
    trackQuiz,
    refreshStats: loadStats
  };
};
