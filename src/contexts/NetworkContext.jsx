import React, { createContext, useContext, useState, useEffect } from 'react';
import { getNetworkMonitor, NETWORK_STATUS } from '../services/networkMonitor';
import { getDoubtStats } from '../services/offlineDoubtStorage';
import { getSyncManager } from '../services/syncManager';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [networkStatus, setNetworkStatus] = useState(NETWORK_STATUS.ONLINE);
  const [pendingDoubtsCount, setPendingDoubtsCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize network monitoring
    const networkMonitor = getNetworkMonitor();
    
    // Set initial status
    setNetworkStatus(networkMonitor.getStatus());
    
    // Start monitoring with callback
    networkMonitor.startMonitoring((newStatus, oldStatus) => {
      console.log(`📡 Network status changed: ${oldStatus} → ${newStatus}`);
      setNetworkStatus(newStatus);
      
      // Auto-sync when coming back online
      if (newStatus === NETWORK_STATUS.ONLINE && oldStatus !== NETWORK_STATUS.ONLINE) {
        handleAutoSync();
      }
    });

    // Load initial pending doubts count
    loadPendingDoubtsCount();
    
    setIsInitialized(true);

    // Cleanup on unmount
    return () => {
      networkMonitor.stopMonitoring();
    };
  }, []);

  const loadPendingDoubtsCount = async () => {
    try {
      const stats = await getDoubtStats();
      setPendingDoubtsCount(stats.pending);
    } catch (error) {
      console.error('Error loading pending doubts count:', error);
    }
  };

  const handleAutoSync = async () => {
    try {
      const stats = await getDoubtStats();
      if (stats.pending > 0) {
        console.log('🔄 Auto-syncing pending doubts...');
        const syncManager = getSyncManager();
        const result = await syncManager.syncPendingDoubts();
        
        if (result.success) {
          console.log(`✅ Auto-sync completed: ${result.synced} synced, ${result.failed} failed`);
          await loadPendingDoubtsCount();
          return result;
        }
      }
    } catch (error) {
      console.error('Error during auto-sync:', error);
    }
    return null;
  };

  const manualSync = async () => {
    return await handleAutoSync();
  };

  const refreshPendingCount = async () => {
    await loadPendingDoubtsCount();
  };

  const value = {
    networkStatus,
    pendingDoubtsCount,
    isOnline: networkStatus === NETWORK_STATUS.ONLINE,
    isOffline: networkStatus === NETWORK_STATUS.OFFLINE,
    isLowNetwork: networkStatus === NETWORK_STATUS.LOW_NETWORK,
    manualSync,
    refreshPendingCount,
    isInitialized
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};
