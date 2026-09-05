/**
 * Offline Doubt Storage Service
 * Stores student questions locally when offline and syncs when online
 */

import localforage from 'localforage';

const DOUBT_STORE_KEY = 'offline_doubts';
const SYNC_STATUS_KEY = 'doubt_sync_status';

// Configure localforage
const doubtStore = localforage.createInstance({
  name: 'AI-Bharat',
  storeName: 'offline_doubts'
});

export const DOUBT_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed'
};

/**
 * Store a doubt offline
 */
export async function storeDoubtOffline(doubt) {
  try {
    const doubts = await getAllDoubts();
    
    const newDoubt = {
      id: `doubt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: doubt.question,
      subject: doubt.subject || 'general',
      timestamp: Date.now(),
      status: DOUBT_STATUS.PENDING,
      userContext: doubt.userContext || {},
      emotion: doubt.emotion || null,
      confidence: doubt.confidence || null,
      offlineResponse: doubt.offlineResponse || null
    };

    doubts.push(newDoubt);
    await doubtStore.setItem(DOUBT_STORE_KEY, doubts);
    
    console.log('💾 Doubt stored offline:', newDoubt.id);
    return newDoubt;
  } catch (error) {
    console.error('❌ Failed to store doubt offline:', error);
    throw error;
  }
}

/**
 * Get all stored doubts
 */
export async function getAllDoubts() {
  try {
    const doubts = await doubtStore.getItem(DOUBT_STORE_KEY);
    return doubts || [];
  } catch (error) {
    console.error('❌ Failed to get doubts:', error);
    return [];
  }
}

/**
 * Get pending doubts (not synced yet)
 */
export async function getPendingDoubts() {
  try {
    const doubts = await getAllDoubts();
    return doubts.filter(d => d.status === DOUBT_STATUS.PENDING);
  } catch (error) {
    console.error('❌ Failed to get pending doubts:', error);
    return [];
  }
}

/**
 * Update doubt status
 */
export async function updateDoubtStatus(doubtId, status, response = null) {
  try {
    const doubts = await getAllDoubts();
    const doubtIndex = doubts.findIndex(d => d.id === doubtId);
    
    if (doubtIndex !== -1) {
      doubts[doubtIndex].status = status;
      doubts[doubtIndex].syncedAt = Date.now();
      
      if (response) {
        doubts[doubtIndex].onlineResponse = response;
      }
      
      await doubtStore.setItem(DOUBT_STORE_KEY, doubts);
      console.log('✅ Doubt status updated:', doubtId, status);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Failed to update doubt status:', error);
    return false;
  }
}

/**
 * Delete a doubt
 */
export async function deleteDoubt(doubtId) {
  try {
    const doubts = await getAllDoubts();
    const filteredDoubts = doubts.filter(d => d.id !== doubtId);
    await doubtStore.setItem(DOUBT_STORE_KEY, filteredDoubts);
    console.log('🗑️ Doubt deleted:', doubtId);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete doubt:', error);
    return false;
  }
}

/**
 * Clear all synced doubts (older than 7 days)
 */
export async function clearOldSyncedDoubts() {
  try {
    const doubts = await getAllDoubts();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const filteredDoubts = doubts.filter(d => {
      // Keep pending doubts
      if (d.status === DOUBT_STATUS.PENDING) return true;
      
      // Keep recent doubts
      if (d.syncedAt && d.syncedAt > sevenDaysAgo) return true;
      
      // Remove old synced doubts
      return false;
    });
    
    await doubtStore.setItem(DOUBT_STORE_KEY, filteredDoubts);
    console.log('🧹 Old synced doubts cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear old doubts:', error);
    return false;
  }
}

/**
 * Get doubt statistics
 */
export async function getDoubtStats() {
  try {
    const doubts = await getAllDoubts();
    
    return {
      total: doubts.length,
      pending: doubts.filter(d => d.status === DOUBT_STATUS.PENDING).length,
      synced: doubts.filter(d => d.status === DOUBT_STATUS.SYNCED).length,
      failed: doubts.filter(d => d.status === DOUBT_STATUS.FAILED).length
    };
  } catch (error) {
    console.error('❌ Failed to get doubt stats:', error);
    return { total: 0, pending: 0, synced: 0, failed: 0 };
  }
}

/**
 * Export doubts for backup
 */
export async function exportDoubts() {
  try {
    const doubts = await getAllDoubts();
    return JSON.stringify(doubts, null, 2);
  } catch (error) {
    console.error('❌ Failed to export doubts:', error);
    return null;
  }
}

/**
 * Import doubts from backup
 */
export async function importDoubts(jsonData) {
  try {
    const importedDoubts = JSON.parse(jsonData);
    const existingDoubts = await getAllDoubts();
    
    // Merge without duplicates
    const mergedDoubts = [...existingDoubts];
    const existingIds = new Set(existingDoubts.map(d => d.id));
    
    for (const doubt of importedDoubts) {
      if (!existingIds.has(doubt.id)) {
        mergedDoubts.push(doubt);
      }
    }
    
    await doubtStore.setItem(DOUBT_STORE_KEY, mergedDoubts);
    console.log('📥 Doubts imported successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to import doubts:', error);
    return false;
  }
}
