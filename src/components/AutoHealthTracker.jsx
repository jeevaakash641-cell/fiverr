import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAutoHealthTracking } from '../hooks/useAutoHealthTracking';
import { ArrowLeft, Moon, Eye, BookOpen, Coffee, TrendingUp, Calendar, Save, BarChart3, Zap, Activity } from 'lucide-react';
import { saveHealthData, calculateWellnessScore } from '../services/healthTrackerService';

const AutoHealthTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTracking, summary, history, updateSleepHours, refreshData } = useAutoHealthTracking();
  const [sleepInput, setSleepInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (summary) {
      generateFeedback(summary);
    }
  }, [summary]);

  const generateFeedback = (data) => {
    const { sleepHours, screenTime, studyHours, breakTime } = data;
    const wellness = calculateWellnessScore(data);
    
    const messages = [];
    
    // Sleep analysis
    if (sleepHours === 0) {
      messages.push({
        type: 'info',
        text: 'Sleep hours not tracked yet. Enter your sleep hours below for accurate wellness score.'
      });
    } else if (sleepHours < 6) {
      messages.push({
        type: 'warning',
        text: `You slept only ${sleepHours} hours. Your learning efficiency may decrease. Aim for 7-8 hours.`
      });
    } else if (sleepHours >= 7 && sleepHours <= 9) {
      messages.push({
        type: 'success',
        text: `Great! ${sleepHours} hours of sleep is optimal for learning.`
      });
    }

    // Screen time vs study time
    if (screenTime > studyHours && studyHours > 0) {
      messages.push({
        type: 'warning',
        text: `Your screen time (${screenTime}h) is higher than study time (${studyHours}h). Consider reducing distractions.`
      });
    }

    // Study hours analysis
    if (studyHours >= 4 && studyHours <= 6) {
      messages.push({
        type: 'success',
        text: `Excellent! ${studyHours} hours of focused study is very productive.`
      });
    } else if (studyHours > 8) {
      messages.push({
        type: 'info',
        text: `You studied ${studyHours} hours. Make sure to take breaks to avoid burnout.`
      });
    } else if (studyHours > 0) {
      messages.push({
        type: 'info',
        text: `You've studied ${studyHours} hours so far today. Keep it up!`
      });
    }

    // Break time analysis
    const studyBreakRatio = studyHours > 0 ? breakTime / studyHours : 0;
    if (studyBreakRatio < 0.15 && studyHours > 0) {
      messages.push({
        type: 'warning',
        text: 'Take more breaks! Short breaks improve focus and retention.'
      });
    }

    setFeedback({
      score: wellness,
      messages
    });
  };

  const handleSleepUpdate = () => {
    const hours = parseFloat(sleepInput);
    if (hours && hours > 0 && hours <= 24) {
      updateSleepHours(hours);
      setSleepInput('');
    } else {
      alert('Please enter valid sleep hours (0-24)');
    }
  };

  const handleSaveToHistory = async () => {
    if (!summary) return;

    setSaving(true);
    try {
      await saveHealthData(user.email, {
        sleepHours: summary.sleepHours || 0,
        screenTime: summary.screenTime,
        studyHours: summary.studyHours,
        breakTime: summary.breakTime
      });
      alert('Health data saved to history!');
      refreshData();
    } catch (error) {
      console.error('Error saving health data:', error);
      alert('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Auto Health Tracker</h1>
                <p className="text-sm text-gray-600">Automatic wellness monitoring</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/health-analytics')}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="hidden md:inline">Analytics</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Tracking Status */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm border border-indigo-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}>
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Auto-Tracking Status</h3>
                  <p className="text-sm text-gray-600">
                    {isTracking ? '🟢 Active - Monitoring your activity' : '🔴 Inactive'}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isTracking ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {isTracking ? 'Running' : 'Stopped'}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center space-x-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-gray-600">Auto Features</span>
                </div>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>✓ Screen time</li>
                  <li>✓ Study hours</li>
                  <li>✓ Break time</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center space-x-2 mb-1">
                  <Moon className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-600">Changeable Input</span>
                </div>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• Sleep hours (update anytime)</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-3 border col-span-2">
                <div className="flex items-center space-x-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs text-gray-600">How It Works</span>
                </div>
                <p className="text-xs text-gray-700">
                  We track your screen time, study sessions, and breaks automatically. You can set and update your sleep hours anytime for a complete wellness score!
                </p>
              </div>
            </div>
          </div>

          {/* Today's Auto-Tracked Data */}
          {summary && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-800">Today's Data</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Moon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Sleep</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.sleepHours || 0}h
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {summary.sleepHours === 0 ? 'Not set' : 'Changeable'}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Screen</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.screenTime}h
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Auto-tracked</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Study</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {summary.studyHours}h
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {summary.sessionCount} sessions
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coffee className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Breaks</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.breakTime}h
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Auto-tracked</p>
                </div>
              </div>

              {/* Sleep Input - Always Available */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {summary.sleepHours === 0 
                    ? 'Enter Your Sleep Hours (Required for Wellness Score)' 
                    : 'Update Your Sleep Hours'}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={sleepInput}
                    onChange={(e) => setSleepInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={summary.sleepHours > 0 ? `Current: ${summary.sleepHours}h` : "e.g., 7.5"}
                  />
                  <button
                    onClick={handleSleepUpdate}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    {summary.sleepHours === 0 ? 'Set' : 'Update'}
                  </button>
                </div>
                {summary.sleepHours > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Current sleep: {summary.sleepHours}h
                  </p>
                )}
              </div>

              <button
                onClick={handleSaveToHistory}
                disabled={saving}
                className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                <span>{saving ? 'Saving...' : 'Save to History'}</span>
              </button>

              {summary.sleepHours === 0 && (
                <p className="text-xs text-yellow-600 mt-2">
                  💡 Tip: Add sleep hours for a more accurate wellness score
                </p>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Last updated: {summary.lastUpdated}
              </p>
            </div>
          )}

          {/* Wellness Score & Feedback */}
          {feedback && summary && summary.sleepHours > 0 && (
            <div className={`rounded-lg shadow-sm border p-6 ${getScoreColor(feedback.score)}`}>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-6 w-6" />
                <h2 className="text-xl font-bold">Daily Wellness Score</h2>
              </div>
              <div className="text-5xl font-bold mb-4">{feedback.score}/100</div>
              
              <div className="space-y-3">
                {feedback.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      msg.type === 'success' ? 'bg-green-100 text-green-800' :
                      msg.type === 'warning' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">💡 How Auto-Tracking Works</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>✓ <strong>Screen Time:</strong> Automatically tracked when you're active on the platform</p>
              <p>✓ <strong>Study Hours:</strong> Tracked when you use AI Assistant, read books, or watch videos</p>
              <p>✓ <strong>Break Time:</strong> Detected when you're idle for more than 5 minutes</p>
              <p>✓ <strong>Sleep Hours:</strong> Enter manually for accurate wellness score</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AutoHealthTracker;
