import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, TrendingUp, BarChart3, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { getHealthData, calculateWellnessScore, getDataByRange, generateInsights } from '../services/healthTrackerService';

const HealthAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7'); // 7, 30, 90 days
  const [data, setData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const allData = await getHealthData(user.email);
      const rangeData = getDataByRange(allData, parseInt(timeRange));
      setData(rangeData);
      
      const generatedInsights = generateInsights(rangeData);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCombinedChart = () => {
    if (data.length === 0) return null;

    // Prepare all data series
    const sleepData = data.map(entry => entry.data.sleepHours);
    const studyData = data.map(entry => entry.data.studyHours);
    const screenData = data.map(entry => entry.data.screenTime);
    const wellnessData = data.map(entry => calculateWellnessScore(entry.data));

    // Find max value across all series for scaling
    const maxValue = Math.max(
      ...sleepData,
      ...studyData,
      ...screenData,
      Math.max(...wellnessData) / 10 // Scale wellness score down for display
    );
    const minValue = 0;
    const range = maxValue - minValue || 1;

    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Health Metrics Overview</h3>
        <div className="relative h-64">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
            <span>{maxValue.toFixed(1)}</span>
            <span>{(maxValue / 2).toFixed(1)}</span>
            <span>{minValue.toFixed(1)}</span>
          </div>
          
          {/* Chart area */}
          <div className="ml-12 h-full relative">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Define arrow markers */}
              <defs>
                <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
                </marker>
                <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
                </marker>
                <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
                </marker>
                <marker id="arrowPurple" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#8b5cf6" />
                </marker>
              </defs>
              
              {/* Grid lines */}
              <line x1="0" y1="0" x2="100" y2="0" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />
              
              {/* Sleep Hours Line (Blue) with arrow */}
              <polyline
                points={sleepData.map((value, i) => {
                  const x = (i / (sleepData.length - 1)) * 100;
                  const y = 100 - ((value - minValue) / range) * 100;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                markerEnd="url(#arrowBlue)"
              />
              {/* Sleep data points */}
              {sleepData.map((value, i) => {
                const x = (i / (sleepData.length - 1)) * 100;
                const y = 100 - ((value - minValue) / range) * 100;
                return <circle key={`sleep-${i}`} cx={x} cy={y} r="1.5" fill="#3b82f6" />;
              })}
              
              {/* Study Hours Line (Green) with arrow */}
              <polyline
                points={studyData.map((value, i) => {
                  const x = (i / (studyData.length - 1)) * 100;
                  const y = 100 - ((value - minValue) / range) * 100;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                markerEnd="url(#arrowGreen)"
              />
              {/* Study data points */}
              {studyData.map((value, i) => {
                const x = (i / (studyData.length - 1)) * 100;
                const y = 100 - ((value - minValue) / range) * 100;
                return <circle key={`study-${i}`} cx={x} cy={y} r="1.5" fill="#10b981" />;
              })}
              
              {/* Screen Time Line (Orange) with arrow */}
              <polyline
                points={screenData.map((value, i) => {
                  const x = (i / (screenData.length - 1)) * 100;
                  const y = 100 - ((value - minValue) / range) * 100;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                markerEnd="url(#arrowOrange)"
              />
              {/* Screen data points */}
              {screenData.map((value, i) => {
                const x = (i / (screenData.length - 1)) * 100;
                const y = 100 - ((value - minValue) / range) * 100;
                return <circle key={`screen-${i}`} cx={x} cy={y} r="1.5" fill="#f59e0b" />;
              })}
              
              {/* Wellness Score Line (Purple) with arrow - Scaled down */}
              <polyline
                points={wellnessData.map((value, i) => {
                  const x = (i / (wellnessData.length - 1)) * 100;
                  const scaledValue = value / 10; // Scale down from 0-100 to 0-10
                  const y = 100 - ((scaledValue - minValue) / range) * 100;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                markerEnd="url(#arrowPurple)"
              />
              {/* Wellness data points */}
              {wellnessData.map((value, i) => {
                const x = (i / (wellnessData.length - 1)) * 100;
                const scaledValue = value / 10;
                const y = 100 - ((scaledValue - minValue) / range) * 100;
                return <circle key={`wellness-${i}`} cx={x} cy={y} r="1.5" fill="#8b5cf6" />;
              })}
            </svg>
            
            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {data.length > 0 && (
                <>
                  <span>{new Date(data[0].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  {data.length > 1 && (
                    <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-8 h-0.5 bg-blue-500" />
              <svg width="12" height="12" viewBox="0 0 12 12" className="-ml-1">
                <path d="M0,0 L0,12 L12,6 z" fill="#3b82f6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Sleep Hours</p>
              <p className="text-sm font-bold text-blue-600">
                {(sleepData.reduce((a, b) => a + b, 0) / sleepData.length).toFixed(1)}h avg
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-8 h-0.5 bg-green-500" />
              <svg width="12" height="12" viewBox="0 0 12 12" className="-ml-1">
                <path d="M0,0 L0,12 L12,6 z" fill="#10b981" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Study Hours</p>
              <p className="text-sm font-bold text-green-600">
                {(studyData.reduce((a, b) => a + b, 0) / studyData.length).toFixed(1)}h avg
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-8 h-0.5 bg-orange-500" />
              <svg width="12" height="12" viewBox="0 0 12 12" className="-ml-1">
                <path d="M0,0 L0,12 L12,6 z" fill="#f59e0b" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Screen Time</p>
              <p className="text-sm font-bold text-orange-600">
                {(screenData.reduce((a, b) => a + b, 0) / screenData.length).toFixed(1)}h avg
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-8 h-0.5 bg-purple-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #8b5cf6, #8b5cf6 4px, transparent 4px, transparent 6px)' }} />
              <svg width="12" height="12" viewBox="0 0 12 12" className="-ml-1">
                <path d="M0,0 L0,12 L12,6 z" fill="#8b5cf6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Wellness Score</p>
              <p className="text-sm font-bold text-purple-600">
                {Math.round(wellnessData.reduce((a, b) => a + b, 0) / wellnessData.length)}/100
              </p>
            </div>
          </div>
        </div>
        
        {/* Note about wellness score scaling */}
        <p className="mt-4 text-xs text-gray-500 italic">
          * Wellness Score is scaled (÷10) for display on the same chart
        </p>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/health-tracker')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Health Analytics</h1>
                <p className="text-sm text-gray-600">Track your wellness trends</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="max-w-2xl mx-auto text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Data Yet</h2>
            <p className="text-gray-600 mb-6">
              Start tracking your daily health metrics to see analytics and trends.
            </p>
            <button
              onClick={() => navigate('/health-tracker')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start Tracking
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/health-tracker')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Health Analytics</h1>
                <p className="text-sm text-gray-600">Track your wellness trends</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Time Range Filter */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-700">Time Range:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeRange('7')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    timeRange === '7'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTimeRange('30')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    timeRange === '30'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setTimeRange('90')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    timeRange === '90'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 3 Months
                </button>
              </div>
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm border border-indigo-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-800">AI Insights</h2>
              </div>
              <div className="space-y-3">
                {insights.map((insight, index) => (
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
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combined Arrow Chart - ONLY GRAPH */}
          {renderCombinedChart()}
        </div>
      </main>
    </div>
  );
};

export default HealthAnalytics;
