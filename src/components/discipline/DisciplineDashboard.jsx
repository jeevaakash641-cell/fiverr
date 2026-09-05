import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Target, Flame, Focus, Gift, TrendingUp } from 'lucide-react';
import { getStreakData } from '../../services/discipline/streakTrackerService';
import { getPointsData } from '../../services/discipline/gratificationService';
import { getFocusStats } from '../../services/discipline/focusMonitorService';
import { getLevelByPoints } from '../../data/disciplineData';
import AutomationDashboard from './AutomationDashboard';

const DisciplineDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streakData, setStreakData] = useState(null);
  const [pointsData, setPointsData] = useState(null);
  const [focusStats, setFocusStats] = useState(null);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [streak, points, focus] = await Promise.all([
        getStreakData(user.email),
        getPointsData(user.email),
        getFocusStats(user.email)
      ]);
      
      setStreakData(streak);
      setPointsData(points);
      setFocusStats(focus);
      
      if (points) {
        setLevel(getLevelByPoints(points.totalPoints));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      id: 'decision-simulator',
      title: 'Decision Simulator',
      description: 'See how your daily habits affect performance',
      icon: Target,
      color: 'bg-blue-500',
      route: '/discipline/decision-simulator'
    },
    {
      id: 'streak-tracker',
      title: 'Streak Tracker',
      description: 'Build and maintain your discipline streak',
      icon: Flame,
      color: 'bg-orange-500',
      route: '/discipline/streak-tracker',
      badge: streakData?.currentStreak > 0 ? `${streakData.currentStreak} days` : null
    },
    {
      id: 'focus-meter',
      title: 'Focus Meter',
      description: 'Track your study focus in real-time',
      icon: Focus,
      color: 'bg-purple-500',
      route: '/discipline/focus-meter',
      badge: focusStats ? `${focusStats.avgScore}%` : null
    },
    {
      id: 'rewards',
      title: 'Rewards',
      description: 'Unlock rewards through consistency',
      icon: Gift,
      color: 'bg-green-500',
      route: '/discipline/rewards',
      badge: pointsData ? `${pointsData.totalPoints} pts` : null
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
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
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                Discipline & Behavior Learning
              </h1>
              <p className="text-sm text-gray-600">Build better habits, achieve your goals</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Automation Dashboard */}
          <AutomationDashboard />

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Flame className="h-8 w-8 text-orange-600" />
                <span className="text-3xl font-bold text-orange-600">
                  {streakData?.currentStreak || 0}
                </span>
              </div>
              <p className="text-sm text-orange-800 font-medium">Current Streak</p>
              <p className="text-xs text-orange-600 mt-1">
                Best: {streakData?.longestStreak || 0} days
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <Gift className="h-8 w-8 text-green-600" />
                <span className="text-3xl font-bold text-green-600">
                  {pointsData?.totalPoints || 0}
                </span>
              </div>
              <p className="text-sm text-green-800 font-medium">Total Points</p>
              <p className="text-xs text-green-600 mt-1">
                Level: {level?.name || 'Beginner'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Focus className="h-8 w-8 text-purple-600" />
                <span className="text-3xl font-bold text-purple-600">
                  {focusStats?.avgScore || 0}%
                </span>
              </div>
              <p className="text-sm text-purple-800 font-medium">Avg Focus Score</p>
              <p className="text-xs text-purple-600 mt-1">
                {focusStats?.totalSessions || 0} sessions
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <span className="text-3xl font-bold text-blue-600">
                  {pointsData?.consecutiveDays || 0}
                </span>
              </div>
              <p className="text-sm text-blue-800 font-medium">Consecutive Days</p>
              <p className="text-xs text-blue-600 mt-1">
                Keep it up!
              </p>
            </div>
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.id}
                  onClick={() => navigate(module.route)}
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${module.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    {module.badge && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                        {module.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{module.title}</h3>
                  <p className="text-sm text-gray-600">{module.description}</p>
                  <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium group-hover:translate-x-2 transition-transform">
                    Open Module →
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Quick Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Use Decision Simulator</p>
                  <p className="text-xs text-gray-600">See how your habits affect performance</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Maintain Your Streak</p>
                  <p className="text-xs text-gray-600">Log in daily to keep your streak alive</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Track Your Focus</p>
                  <p className="text-xs text-gray-600">Monitor concentration during study</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Earn Rewards</p>
                  <p className="text-xs text-gray-600">Unlock badges through consistency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DisciplineDashboard;
