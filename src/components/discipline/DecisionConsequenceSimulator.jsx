import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Target, TrendingDown, TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { simulateConsequences, saveSimulation, getSimulationHistory } from '../../services/discipline/decisionSimulatorService';
import { awardPoints } from '../../services/discipline/gratificationService';

const DecisionConsequenceSimulator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [habits, setHabits] = useState({
    studyHours: 4,
    playHours: 2,
    sleepTime: '22:00',
    screenHours: 3
  });
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    const data = await getSimulationHistory(user.email);
    setHistory(data.slice(-5)); // Last 5 simulations
  };

  const handleInputChange = (field, value) => {
    setHabits(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const simulationResults = simulateConsequences(habits);
      setResults(simulationResults);
      
      // Save simulation
      await saveSimulation(user.email, habits, simulationResults);
      
      // Award points
      await awardPoints(user.email, 'DECISION_SIMULATION');
      
      // Reload history
      await loadHistory();
    } catch (error) {
      console.error('Error simulating:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getBarColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

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
                🎯 Decision Consequence Simulator
              </h1>
              <p className="text-sm text-gray-600">See how your habits affect performance</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Your Daily Habits</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Time: {habits.studyHours} hours
                </label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={habits.studyHours}
                  onChange={(e) => handleInputChange('studyHours', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Play Time: {habits.playHours} hours
                </label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="0.5"
                  value={habits.playHours}
                  onChange={(e) => handleInputChange('playHours', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0h</span>
                  <span>4h</span>
                  <span>8h</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sleep Time: {habits.sleepTime}
                </label>
                <input
                  type="time"
                  value={habits.sleepTime}
                  onChange={(e) => handleInputChange('sleepTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Screen Time: {habits.screenHours} hours
                </label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={habits.screenHours}
                  onChange={(e) => handleInputChange('screenHours', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={loading}
              className="mt-6 w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Simulating...' : 'Simulate Consequences'}
            </button>
          </div>

          {/* Results Section */}
          {results && (
            <>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Predicted Outcomes</h2>
                
                <div className="space-y-4">
                  {/* Energy Level */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Energy Level</span>
                      <span className={`text-lg font-bold ${getScoreColor(results.energy)} px-3 py-1 rounded-full`}>
                        {results.energy}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${getBarColor(results.energy)} transition-all duration-500`}
                        style={{ width: `${results.energy}%` }}
                      />
                    </div>
                  </div>

                  {/* Focus Level */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Focus Level</span>
                      <span className={`text-lg font-bold ${getScoreColor(results.focus)} px-3 py-1 rounded-full`}>
                        {results.focus}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${getBarColor(results.focus)} transition-all duration-500`}
                        style={{ width: `${results.focus}%` }}
                      />
                    </div>
                  </div>

                  {/* Exam Performance */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Exam Performance</span>
                      <span className={`text-lg font-bold ${getScoreColor(results.performance)} px-3 py-1 rounded-full`}>
                        {results.performance}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${getBarColor(results.performance)} transition-all duration-500`}
                        style={{ width: `${results.performance}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm border border-indigo-200 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">💡 AI Insights</h2>
                <div className="space-y-3">
                  {results.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 rounded-lg ${
                        insight.type === 'positive'
                          ? 'bg-green-100 text-green-800'
                          : insight.type === 'warning'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {insight.type === 'positive' ? (
                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      ) : insight.type === 'warning' ? (
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Simulations</h2>
              <div className="space-y-3">
                {history.map((sim, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(sim.date).toLocaleDateString('en-IN', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-600">
                        Study: {sim.habits.studyHours}h | Sleep: {sim.habits.sleepTime} | Screen: {sim.habits.screenHours}h
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(sim.results.performance)}`}>
                        {sim.results.performance}%
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

export default DecisionConsequenceSimulator;
