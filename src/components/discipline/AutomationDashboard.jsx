import React, { useEffect, useState } from 'react';
import { useDisciplineAutomation } from '../../hooks/useDisciplineAutomation';
import { Bot, TrendingUp, Zap, Activity, Calendar } from 'lucide-react';

const AutomationDashboard = () => {
  const { isActive, stats, refreshStats } = useDisciplineAutomation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await refreshStats();
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm border border-indigo-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Automation Status</h3>
            <p className="text-sm text-gray-600">
              {isActive ? '🟢 Active - Tracking your progress' : '🔴 Inactive'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {isActive ? 'Running' : 'Stopped'}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">Auto Features</span>
          </div>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>✓ Auto-update streaks on login</li>
            <li>✓ Auto-award daily points</li>
            <li>✓ Auto-unlock rewards</li>
            <li>✓ Streak reminders</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Smart Tracking</span>
          </div>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>✓ Study session tracking</li>
            <li>✓ Quiz completion tracking</li>
            <li>✓ Focus monitoring</li>
            <li>✓ Daily summaries</li>
          </ul>
        </div>
      </div>

      {/* Stats */}
      {stats && stats.totalDays > 0 && (
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Automation Stats</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalDays}</p>
              <p className="text-xs text-gray-600">Days Tracked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {Math.round(stats.avgStreak)}
              </p>
              <p className="text-xs text-gray-600">Avg Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(stats.avgPoints)}
              </p>
              <p className="text-xs text-gray-600">Avg Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(stats.avgFocus)}%
              </p>
              <p className="text-xs text-gray-600">Avg Focus</p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>💡 Tip:</strong> Automation runs in the background and tracks your activities automatically. 
          Just use the platform normally and earn rewards!
        </p>
      </div>
    </div>
  );
};

export default AutomationDashboard;
