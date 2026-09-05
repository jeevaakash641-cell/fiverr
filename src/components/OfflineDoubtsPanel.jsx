import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { getAllDoubts, deleteDoubt, getDoubtStats, DOUBT_STATUS } from '../services/offlineDoubtStorage';
import { getSyncManager } from '../services/syncManager';

/**
 * Offline Doubts Panel
 * Shows stored offline doubts and sync status
 */
const OfflineDoubtsPanel = ({ isOpen, onClose }) => {
  const [doubts, setDoubts] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, synced: 0, failed: 0 });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDoubts();
    }
  }, [isOpen]);

  const loadDoubts = async () => {
    const allDoubts = await getAllDoubts();
    const doubtStats = await getDoubtStats();
    setDoubts(allDoubts.sort((a, b) => b.timestamp - a.timestamp));
    setStats(doubtStats);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('Syncing...');
    
    const syncManager = getSyncManager();
    const result = await syncManager.syncPendingDoubts();
    
    if (result.success) {
      setSyncMessage(`✅ Synced ${result.synced} doubts${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      await loadDoubts();
    } else {
      setSyncMessage('❌ Sync failed. Please try again.');
    }
    
    setSyncing(false);
    setTimeout(() => setSyncMessage(''), 3000);
  };

  const handleDelete = async (doubtId) => {
    if (confirm('Delete this doubt?')) {
      await deleteDoubt(doubtId);
      await loadDoubts();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case DOUBT_STATUS.PENDING:
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case DOUBT_STATUS.SYNCING:
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case DOUBT_STATUS.SYNCED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case DOUBT_STATUS.FAILED:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case DOUBT_STATUS.PENDING:
        return 'Pending Sync';
      case DOUBT_STATUS.SYNCING:
        return 'Syncing...';
      case DOUBT_STATUS.SYNCED:
        return 'Synced';
      case DOUBT_STATUS.FAILED:
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Offline Doubts</h2>
            <p className="text-sm text-gray-600">
              {stats.total} total • {stats.pending} pending • {stats.synced} synced
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sync Button */}
        {stats.pending > 0 && (
          <div className="p-4 bg-blue-50 border-b">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : `Sync ${stats.pending} Pending Doubt${stats.pending > 1 ? 's' : ''}`}
            </button>
            {syncMessage && (
              <p className="text-sm text-center mt-2 text-gray-700">{syncMessage}</p>
            )}
          </div>
        )}

        {/* Doubts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {doubts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No offline doubts stored</p>
              <p className="text-sm mt-1">Questions asked offline will appear here</p>
            </div>
          ) : (
            doubts.map((doubt) => (
              <div
                key={doubt.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(doubt.status)}
                      <span className="text-xs font-medium text-gray-600">
                        {getStatusText(doubt.status)}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(doubt.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-2 line-clamp-3">
                      {doubt.question}
                    </p>

                    {doubt.subject && (
                      <span className="inline-block text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                        {doubt.subject}
                      </span>
                    )}

                    {doubt.emotion && (
                      <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded ml-2">
                        {doubt.emotion} • {doubt.confidence}%
                      </span>
                    )}

                    {doubt.onlineResponse && (
                      <div className="mt-3 p-3 bg-white rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-700 mb-1">AI Response:</p>
                        <p className="text-xs text-gray-700 line-clamp-3">
                          {doubt.onlineResponse.substring(0, 150)}...
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(doubt.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete doubt"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-600">
          Doubts are automatically synced when internet reconnects
        </div>
      </div>
    </div>
  );
};

export default OfflineDoubtsPanel;
