import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Flame, Shield, Trophy, Calendar, AlertTriangle } from 'lucide-react';
import { getStreakData, updateStreak, useShield, checkStreakStatus, getStreakCalendar } from '../../services/discipline/streakTrackerService';

const DisciplineStreakTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streakData, setStreakData] = useState(null);
  const [streakStatus, setStreakStatus] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      loadStreakData();
    }
  }, [user]);

  const loadStreakData = async () => {
    setLoading(true);
    try {
      const [data, status, cal] = await Promise.all([
        getStreakData(user.email),
        checkStreakStatus(user.email),
        getStreakCalendar(user.email, 7)
      ]);
      
      setStreakData(data);
      setStreakStatus(status);
      setCalendar(cal);
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStreak = async () => {
    setUpdating(true);
    try {
      const result = await updateStreak(user.email);
      if (result.success) {
        await loadStreakData();
        alert(result.message);
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUseShield = async () => {
    if (!window.confirm('Use a Discipline Shield to protect your streak?')) {
      return;
    }
    
    setUpdating(true);
    try {
      const result = await useShield(user.email);
      if (result.success) {
        await loadStreakData();
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error using shield:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Flame className="h-12 w-12 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/discipline')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                🔥 Discipline Streak Tracker
              </h1>
              <p className="text-sm text-gray-600">Build and maintain your streak</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Streak Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <Flame className="h-12 w-12 text-orange-600" />
                <span className="text-5xl font-bold text-orange-600">
                  {streakData?.currentStreak || 0}
                </span>
              </div>
              <p className="text-lg font-bold text-orange-800">Current Streak</p>
              <p className="text-sm text-orange-600 mt-1">Keep going!</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="h-12 w-12 text-yellow-600" />
                <span className="text-5xl font-bold text-yellow-600">
                  {streakData?.longestStreak || 0}
                </span>
              </div>
              <p className="text-lg font-bold text-yellow-800">Best Streak</p>
              <p className="text-sm text-yellow-600 mt-1">Personal record</p>
            </div>
          </div>

          {/* Streak Status Alert */}
          {streakStatus?.status === 'at_risk' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-orange-800">⚠️ Streak Alert!</p>
                  <p className="text-sm text-orange-700 mt-1">{streakStatus.message}</p>
                  <button
                    onClick={handleUpdateStreak}
                    disabled={updating}
                    className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Streak Now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-800">Streak Calendar</h2>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {calendar.map((day, index) => (
                <div key={index} className="text-center">
                  <p className="text-xs text-gray-600 mb-2">{day.dayName}</p>
                  <div
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-2xl ${
                      day.hasActivity
                        ? day.shieldUsed
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-100 border-2 border-gray-300'
                    }`}
                  >
                    {day.hasActivity ? (day.shieldUsed ? '🛡️' : '✅') : '⬜'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(day.date).getDate()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shields */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">🛡️ Discipline Shields</h2>
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                      i < (streakData?.shieldsRemaining || 0)
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-100 border-2 border-gray-300'
                    }`}
                  >
                    {i < (streakData?.shieldsRemaining || 0) ? '🛡️' : '⬜'}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Remaining: {streakData?.shieldsRemaining || 0}/3
                </p>
                <p className="text-xs text-gray-500">
                  Resets: {new Date(streakData?.shieldsResetDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>How Shields Work:</strong> Use a shield to protect your streak if you miss a day. 
                You get 3 shields per month. Use them wisely!
              </p>
            </div>

            <button
              onClick={handleUseShield}
              disabled={updating || (streakData?.shieldsRemaining || 0) === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Using Shield...' : 'Use Shield to Protect Streak'}
            </button>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm border border-indigo-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Shields Used</p>
                <p className="text-2xl font-bold text-indigo-600">{streakData?.totalShieldsUsed || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Activity</p>
                <p className="text-sm font-medium text-gray-800">
                  {streakData?.lastActivityDate 
                    ? new Date(streakData.lastActivityDate).toLocaleDateString('en-IN')
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DisciplineStreakTracker;
