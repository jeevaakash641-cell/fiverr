import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserHistory, getUserActivityStats } from '../services/userHistoryTracker';
import { Clock, Activity, TrendingUp, Calendar, Filter, Download } from 'lucide-react';

const UserActivityHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (user?.email) {
      loadHistory();
      loadStats();
    }
  }, [user, filter, days]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const options = {
        limit: 50
      };

      if (filter !== 'all') {
        options.activityType = filter;
      }

      const result = await getUserHistory(user.email, options);
      setHistory(result.items || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getUserActivityStats(user.email, days);
      setStats(result.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      ai_chat: '💬',
      quiz_attempt: '📝',
      video_watch: '🎥',
      book_read: '📖',
      book_download: '📥',
      visualization_view: '🔬',
      study_session: '📚',
      prediction_view: '📊',
      performance_check: '📈',
      health_log: '❤️',
      discipline_update: '🎯',
      streak_update: '🔥',
      reward_unlock: '🏆',
      career_simulate: '💼',
      decision_simulate: '🎲',
      login: '🔐',
      logout: '👋',
      profile_update: '👤'
    };
    return icons[type] || '📌';
  };

  const getActivityColor = (type) => {
    const colors = {
      ai_chat: 'bg-blue-50 border-blue-200 text-blue-700',
      quiz_attempt: 'bg-purple-50 border-purple-200 text-purple-700',
      video_watch: 'bg-red-50 border-red-200 text-red-700',
      book_read: 'bg-green-50 border-green-200 text-green-700',
      book_download: 'bg-teal-50 border-teal-200 text-teal-700',
      visualization_view: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      study_session: 'bg-orange-50 border-orange-200 text-orange-700',
      health_log: 'bg-pink-50 border-pink-200 text-pink-700',
      discipline_update: 'bg-amber-50 border-amber-200 text-amber-700',
      career_simulate: 'bg-cyan-50 border-cyan-200 text-cyan-700'
    };
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const exportHistory = () => {
    const csv = [
      ['Timestamp', 'Activity Type', 'Details'],
      ...history.map(item => [
        item.timestamp,
        item.activityType,
        JSON.stringify(item.activityDetails)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-history-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to view your activity history</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Activity History</h1>
        <p className="text-gray-600">Track your learning journey and activities</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Activities</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalActivities}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Most Active Day</p>
                <p className="text-lg font-bold text-green-900">
                  {stats.mostActiveDay ? stats.mostActiveDay.count : 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Top Activity</p>
                <p className="text-xs font-bold text-purple-900">
                  {stats.mostCommonActivity ? stats.mostCommonActivity.type.replace('_', ' ') : 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Period</p>
                <p className="text-lg font-bold text-orange-900">{days} days</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Activities</option>
            <option value="ai_chat">AI Chat</option>
            <option value="quiz_attempt">Quizzes</option>
            <option value="video_watch">Videos</option>
            <option value="book_read">Books</option>
            <option value="study_session">Study Sessions</option>
            <option value="health_log">Health Logs</option>
          </select>

          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>

          <button
            onClick={exportHistory}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading activity history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No activities found</p>
            <p className="text-sm text-gray-500 mt-2">Start using the platform to see your activity history</p>
          </div>
        ) : (
          <div className="divide-y">
            {history.map((item, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${getActivityColor(item.activityType)} flex items-center justify-center text-2xl border`}>
                    {getActivityIcon(item.activityType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-800 capitalize">
                          {item.activityType.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.activityDetails.subject && `Subject: ${item.activityDetails.subject}`}
                          {item.activityDetails.score !== undefined && ` • Score: ${item.activityDetails.score}%`}
                          {item.activityDetails.duration && ` • Duration: ${item.activityDetails.duration}s`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivityHistory;
