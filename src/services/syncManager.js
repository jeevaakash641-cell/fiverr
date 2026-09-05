/**
 * Sync Manager
 * Automatically syncs offline doubts when internet reconnects
 */

import { getPendingDoubts, updateDoubtStatus, DOUBT_STATUS } from './offlineDoubtStorage.js';
import { API_BASE_URL } from '../config.js';

export class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
  }

  /**
   * Sync all pending doubts
   */
  async syncPendingDoubts() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    try {
      this.isSyncing = true;
      this.notifyListeners({ type: 'sync_started' });

      const pendingDoubts = await getPendingDoubts();
      
      if (pendingDoubts.length === 0) {
        console.log('✅ No pending doubts to sync');
        this.isSyncing = false;
        this.notifyListeners({ type: 'sync_completed', synced: 0, failed: 0 });
        return { success: true, synced: 0, failed: 0 };
      }

      console.log(`🔄 Syncing ${pendingDoubts.length} pending doubts...`);

      let synced = 0;
      let failed = 0;

      // Sync each doubt
      for (const doubt of pendingDoubts) {
        try {
          // Update status to syncing
          await updateDoubtStatus(doubt.id, DOUBT_STATUS.SYNCING);
          this.notifyListeners({ type: 'doubt_syncing', doubt });

          // Send to backend
          const response = await this.sendDoubtToBackend(doubt);

          if (response.success) {
            // Update status to synced
            await updateDoubtStatus(doubt.id, DOUBT_STATUS.SYNCED, response.response);
            synced++;
            this.notifyListeners({ type: 'doubt_synced', doubt, response: response.response });
          } else {
            // Mark as failed
            await updateDoubtStatus(doubt.id, DOUBT_STATUS.FAILED);
            failed++;
            this.notifyListeners({ type: 'doubt_failed', doubt, error: response.error });
          }
        } catch (error) {
          console.error('❌ Failed to sync doubt:', doubt.id, error);
          await updateDoubtStatus(doubt.id, DOUBT_STATUS.FAILED);
          failed++;
          this.notifyListeners({ type: 'doubt_failed', doubt, error: error.message });
        }

        // Small delay between requests to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`✅ Sync completed: ${synced} synced, ${failed} failed`);
      this.isSyncing = false;
      this.notifyListeners({ type: 'sync_completed', synced, failed });

      return { success: true, synced, failed };
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.isSyncing = false;
      this.notifyListeners({ type: 'sync_error', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send doubt to backend for AI response
   */
  async sendDoubtToBackend(doubt) {
    try {
      // Determine endpoint based on whether emotion data is available
      const endpoint = doubt.emotion && doubt.confidence !== null
        ? `${API_BASE_URL}/api/emotion-aware/chat`
        : `${API_BASE_URL}/api/chat`;

      const payload = doubt.emotion && doubt.confidence !== null
        ? {
            question: doubt.question,
            emotion: doubt.emotion,
            confidence: doubt.confidence,
            userContext: doubt.userContext
          }
        : {
            message: doubt.question,
            language: doubt.userContext?.language || 'en'
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        response: data.response || data.message || 'Response received'
      };
    } catch (error) {
      console.error('❌ Backend request failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add sync listener
   */
  addListener(callback) {
    this.syncListeners.push(callback);
  }

  /**
   * Remove sync listener
   */
  removeListener(callback) {
    this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress() {
    return this.isSyncing;
  }
}

// Singleton instance
let syncManagerInstance = null;

/**
 * Get sync manager singleton
 */
export function getSyncManager() {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}
