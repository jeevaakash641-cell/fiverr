import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Focus, Play, Square, TrendingUp } from 'lucide-react';
import { startFocusSession, endFocusSession, getCurrentSession, getFocusHistory, getFocusStats, getFocusStatusIcon, getFocusStatus } from '../../services/discipline/focusMonitorService';
import { awardPoints } from '../../services/discipline/gratificationService';

const FocusScoreMeter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
      
      // Check for active session
      const active = getCurrentSession();
      if (active) {
        setSession(active);
        startSessionUpdates();
      }
    }
    
    return () => {
      stopSessionUpdates();
    };
  }, [user]);

  let updateInterval = null;

  const startSessionUpdates = () => {
    updateInterval = setInterval(() => {
      const current = getCurrentSession();
      if (current) {
        // Update focus status based on current score
        current.focusStatus = getFocusStatus(current.focusScore);
        setSession(current);
      }
    }, 1000);
  };

  const stopSessionUpdates = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [hist, st] = await Promise.all([
        getFocusHistory(user.email),
        getFocusStats(user.email)
      ]);
      
      setHistory(hist.slice(-10));
      setStats(st);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = () => {
    const newSession = startFocusSession(user.email);
    setSession(newSession);
    startSessionUpdates();
  };

  const handleEndSession = async () => {
    stopSessionUpdates();
    const completedSession = await endFocusSession();
    
    if (completedSession) {
      // Award points based on focus score
      if (completedSession.focusScore >= 80) {
        await awardPoints(user.email, 'FOCUS_SESSION', 15);
      } else {
        await awardPoints(user.email, 'FOCUS_SESSION');
      }
      
      await loadData();
      setSession(null);
      alert(`Session completed! Focus Score: ${completedSession.focusScore}%`);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Focus className="h-12 w-12 text-purple-600 animate-pulse mx-auto mb-4" />
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
                📊 Focus Score Meter
              </h1>
              <p className="text-sm text-gray-600">Track your study focus in real-time</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Active Session Widget */}
          {session ? (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-lg border-2 border-purple-300 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Active Focus Session</h2>
                <p className="text-sm text-gray-600">Stay focused to maintain your score!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Focus Score</p>
                  <p className={`text-5xl font-bold ${getScoreColor(session.focusScore)}`}>
                    {session.focusScore}%
                  </p>
                  <p className="text-lg mt-2">
                    {getFocusStatusIcon(session.focusStatus)} {session.focusStatus}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Duration</p>
                  <p className="text-4xl font-bold text-indigo-600">
                    {session.durationMinutes}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">minutes</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Tab Switches</p>
                  <p className="text-4xl font-bold text-orange-600">
                    {session.tabSwitches}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">times</p>
                </div>
              </div>

              <button
                onClick={handleEndSession}
                className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-lg flex items-center justify-center space-x-2"
              >
                <Square className="h-6 w-6" />
                <span>End Session</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Focus className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Start a Focus Session</h2>
              <p className="text-gray-600 mb-6">
                Track your concentration and improve your study habits
              </p>
              <button
                onClick={handleStartSession}
                className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold text-lg flex items-center justify-center space-x-2 mx-auto"
              >
                <Play className="h-6 w-6" />
                <span>Start Focus Session</span>
              </button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                <p className="text-3xl font-bold text-indigo-600">{stats.totalSessions}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">Avg Score</p>
                <p className="text-3xl font-bold text-purple-600">{stats.avgScore}%</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">Deep Focus</p>
                <p className="text-3xl font-bold text-green-600">{stats.deepFocusSessions}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">Total Time</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalMinutes}m</p>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Sessions</h2>
              <div className="space-y-3">
                {history.map((sess, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(sess.startTime).toLocaleDateString('en-IN', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-600">
                        Duration: {sess.durationMinutes}m | Switches: {sess.tabSwitches}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getFocusStatusIcon(sess.focusStatus)}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(sess.focusScore)}`}>
                        {sess.focusScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FocusScoreMeter;
