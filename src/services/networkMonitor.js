/**
 * Network Monitor Service
 * Detects internet connectivity and network quality
 */

import { API_BASE_URL } from '../config.js';

export const NETWORK_STATUS = {
  ONLINE: 'online',
  LOW_NETWORK: 'low_network',
  OFFLINE: 'offline'
};

export class NetworkMonitor {
  constructor() {
    this.status = NETWORK_STATUS.ONLINE;
    this.listeners = [];
    this.checkInterval = null;
    this.lastCheckTime = Date.now();
    this.consecutiveFailures = 0;
  }

  /**
   * Start monitoring network status
   */
  startMonitoring(callback) {
    console.log('📡 Network monitoring started');

    // Add callback to listeners
    if (callback) {
      this.listeners.push(callback);
    }

    // Set initial status based on browser
    if (navigator.onLine) {
      this.updateStatus(NETWORK_STATUS.ONLINE);
    } else {
      this.updateStatus(NETWORK_STATUS.OFFLINE);
    }

    // Listen to browser online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initial check after a short delay
    setTimeout(() => {
      this.checkNetworkQuality();
    }, 1000);

    // Periodic quality checks (every 30 seconds)
    this.checkInterval = setInterval(() => {
      this.checkNetworkQuality();
    }, 30000);

    return this.status;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners = [];
    console.log('📡 Network monitoring stopped');
  }

  /**
   * Check network quality
   */
  async checkNetworkQuality() {
    if (!navigator.onLine) {
      this.updateStatus(NETWORK_STATUS.OFFLINE);
      return;
    }

    try {
      const startTime = Date.now();
      
      // Try to fetch from the backend API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Use the backend health endpoint
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok) {
        this.consecutiveFailures = 0;
        
        // Determine quality based on latency
        if (latency < 1000) {
          this.updateStatus(NETWORK_STATUS.ONLINE);
        } else if (latency < 3000) {
          this.updateStatus(NETWORK_STATUS.LOW_NETWORK);
        } else {
          this.updateStatus(NETWORK_STATUS.LOW_NETWORK);
        }
      } else {
        this.handleFailure();
      }
    } catch (error) {
      // If backend is not reachable but browser is online, still consider it online
      // This handles cases where backend might be down but internet is working
      if (navigator.onLine) {
        console.log('📡 Backend not reachable, but browser reports online');
        this.consecutiveFailures = 0;
        this.updateStatus(NETWORK_STATUS.ONLINE);
      } else {
        this.handleFailure();
      }
    }
  }

  /**
   * Handle network check failure
   */
  handleFailure() {
    this.consecutiveFailures++;
    
    // Only mark as offline after multiple failures AND browser reports offline
    if (this.consecutiveFailures >= 3 && !navigator.onLine) {
      this.updateStatus(NETWORK_STATUS.OFFLINE);
    } else if (this.consecutiveFailures >= 2) {
      this.updateStatus(NETWORK_STATUS.LOW_NETWORK);
    } else if (navigator.onLine) {
      // Browser says we're online, trust it
      this.updateStatus(NETWORK_STATUS.ONLINE);
    }
  }

  /**
   * Handle browser online event
   */
  handleOnline() {
    console.log('📡 Browser detected online');
    this.consecutiveFailures = 0;
    this.updateStatus(NETWORK_STATUS.ONLINE);
    // Verify with quality check
    setTimeout(() => {
      this.checkNetworkQuality();
    }, 500);
  }

  /**
   * Handle browser offline event
   */
  handleOffline() {
    console.log('📡 Browser detected offline');
    this.updateStatus(NETWORK_STATUS.OFFLINE);
  }

  /**
   * Update network status and notify listeners
   */
  updateStatus(newStatus) {
    if (this.status !== newStatus) {
      const oldStatus = this.status;
      this.status = newStatus;
      
      console.log(`📡 Network status changed: ${oldStatus} → ${newStatus}`);
      
      // Notify all listeners
      this.listeners.forEach(callback => {
        try {
          callback(newStatus, oldStatus);
        } catch (error) {
          console.error('Error in network status listener:', error);
        }
      });
    }
  }

  /**
   * Get current network status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Check if online
   */
  isOnline() {
    return this.status === NETWORK_STATUS.ONLINE;
  }

  /**
   * Check if offline
   */
  isOffline() {
    return this.status === NETWORK_STATUS.OFFLINE;
  }

  /**
   * Check if low network
   */
  isLowNetwork() {
    return this.status === NETWORK_STATUS.LOW_NETWORK;
  }

  /**
   * Add status change listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove status change listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Force refresh network status
   */
  forceRefresh() {
    console.log('📡 Force refreshing network status...');
    this.consecutiveFailures = 0;
    this.checkNetworkQuality();
  }
}

// Singleton instance
let networkMonitorInstance = null;

/**
 * Get network monitor singleton
 */
export function getNetworkMonitor() {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
}
