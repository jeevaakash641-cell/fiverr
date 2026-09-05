/**
 * React Hook for Automatic Health Tracking
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import autoHealthTracker, {
  startAutoHealthTracking,
  stopAutoHealthTracking,
  getAutoHealthSummary,
  getAutoHealthHistory,
  setSleepHours
} from '../services/autoHealthTracker';

export const useAutoHealthTracking = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (user) {
      // Start tracking
      startAutoHealthTracking(user.email);
      setIsTracking(true);

      // Load initial data
      loadData();

      // Refresh data every minute
      const interval = setInterval(loadData, 60000);

      return () => {
        clearInterval(interval);
        stopAutoHealthTracking();
        setIsTracking(false);
      };
    }
  }, [user]);

  const loadData = () => {
    const currentSummary = getAutoHealthSummary();
    const currentHistory = getAutoHealthHistory();
    setSummary(currentSummary);
    setHistory(currentHistory);
  };

  const updateSleepHours = (hours) => {
    setSleepHours(hours);
    loadData();
  };

  return {
    isTracking,
    summary,
    history,
    updateSleepHours,
    refreshData: loadData
  };
};
