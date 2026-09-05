import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Moon, Eye, BookOpen, Coffee, TrendingUp, Calendar, Save, BarChart3, Zap } from 'lucide-react';
import { saveHealthData, getHealthData, calculateWellnessScore } from '../services/healthTrackerService';

const HealthTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todayData, setTodayData] = useState({
    sleepHours: '',
    screenTime: '',
    studyHours: '',
    breakTime: ''
  });
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadHealthData();
    }
  }, [user]);

  const loadHealthData = async () => {
    const data = await getHealthData(user.email);
    setHistory(data);
    
    // Load today's data if exists
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = data.find(entry => entry.date === today);
    if (todayEntry) {
      setTodayData(todayEntry.data);
      generateFeedback(todayEntry.data);
    }
  };

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value) || '';
    setTodayData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const generateFeedback = (data) => {
    const { sleepHours, screenTime, studyHours, breakTime } = data;
    const wellness = calculateWellnessScore(data);
    
    const messages = [];
    
    // Sleep analysis
    if (sleepHours < 6) {
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
    if (screenTime > studyHours) {
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

  const handleSave = async () => {
    if (!todayData.sleepHours || !todayData.screenTime || !todayData.studyHours || !todayData.breakTime) {
      alert('Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      await saveHealthData(user.email, todayData);
      generateFeedback(todayData);
      await loadHealthData();
      alert('Health data saved successfully!');
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
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Student Health Tracker</h1>
                <p className="text-sm text-gray-600">Track your daily wellness</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/health-analytics')}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="hidden md:inline">View Analytics</span>
            </button>
            <button
              onClick={() => navigate('/auto-health-tracker')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Zap className="h-5 w-5" />
              <span className="hidden md:inline">Auto Tracker</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Today's Input */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-800">Today's Data</h2>
              <span className="text-sm text-gray-500 ml-auto">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Moon className="h-4 w-4 text-blue-600" />
                  <span>Sleep Hours</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={todayData.sleepHours}
                  onChange={(e) => handleInputChange('sleepHours', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 7"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                  <span>Screen Time (hours)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={todayData.screenTime}
                  onChange={(e) => handleInputChange('screenTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="h-4 w-4 text-green-600" />
                  <span>Study Hours</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={todayData.studyHours}
                  onChange={(e) => handleInputChange('studyHours', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 4"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Coffee className="h-4 w-4 text-orange-600" />
                  <span>Break Time (hours)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={todayData.breakTime}
                  onChange={(e) => handleInputChange('breakTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 2"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Saving...' : 'Save Today\'s Data'}</span>
            </button>
          </div>

          {/* Wellness Score & Feedback */}
          {feedback && (
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

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent History</h2>
              <div className="space-y-3">
                {history.slice(0, 7).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">
                        {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        Sleep: {entry.data.sleepHours}h | Study: {entry.data.studyHours}h | Screen: {entry.data.screenTime}h
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(calculateWellnessScore(entry.data))}`}>
                      {calculateWellnessScore(entry.data)}
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

export default HealthTracker;
