import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Gift, Star, Lock, Unlock, TrendingUp } from 'lucide-react';
import { getPointsData, getUserRewards, getPointsStats } from '../../services/discipline/gratificationService';
import { getStreakData } from '../../services/discipline/streakTrackerService';
import { getLevelByPoints, getNextLevel, getProgressToNextLevel } from '../../data/disciplineData';

const DelayedGratificationTrainer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pointsData, setPointsData] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [stats, setStats] = useState(null);
  const [level, setLevel] = useState(null);
  const [nextLevel, setNextLevel] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [points, userRewards, streak, pointsStats] = await Promise.all([
        getPointsData(user.email),
        getUserRewards(user.email),
        getStreakData(user.email),
        getPointsStats(user.email)
      ]);
      
      setPointsData(points);
      setRewards(userRewards);
      setStreakData(streak);
      setStats(pointsStats);
      
      if (points) {
        const currentLevel = getLevelByPoints(points.totalPoints);
        const next = getNextLevel(points.totalPoints);
        const prog = getProgressToNextLevel(points.totalPoints);
        
        setLevel(currentLevel);
        setNextLevel(next);
        setProgress(prog);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRewardColor = (color) => {
    const colors = {
      bronze: 'from-orange-100 to-orange-200 border-orange-300',
      silver: 'from-gray-100 to-gray-200 border-gray-300',
      gold: 'from-yellow-100 to-yellow-200 border-yellow-300',
      platinum: 'from-purple-100 to-purple-200 border-purple-300'
    };
    return colors[color] || colors.bronze;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Gift className="h-12 w-12 text-green-600 animate-pulse mx-auto mb-4" />
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
                🎁 Delayed Gratification Trainer
              </h1>
              <p className="text-sm text-gray-600">Earn rewards through consistency</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Points Overview */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow-sm border border-green-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-green-700 mb-1">Your Points</p>
                <p className="text-5xl font-bold text-green-600">
                  ⭐ {pointsData?.totalPoints || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-700 mb-1">Consecutive Days</p>
                <p className="text-4xl font-bold text-green-600">
                  🔥 {pointsData?.consecutiveDays || 0}
                </p>
              </div>
            </div>

            {/* Level Progress */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Level: {level?.name || 'Beginner'}
                </span>
                {nextLevel && (
                  <span className="text-sm text-gray-600">
                    Next: {nextLevel.name} ({nextLevel.pointsRequired} pts)
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1 text-center">{progress}% to next level</p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">Today</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.pointsToday}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pointsThisWeek}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">Streak</p>
                <p className="text-2xl font-bold text-orange-600">{stats.consecutiveDays}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-sm text-gray-600 mb-1">Activities</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalActivities}</p>
              </div>
            </div>
          )}

          {/* Rewards */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Available Rewards</h2>
            <div className="space-y-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`bg-gradient-to-r ${getRewardColor(reward.color)} rounded-lg border-2 p-6 ${
                    reward.isUnlocked ? 'opacity-100' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-4xl">{reward.icon}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{reward.name}</h3>
                        <p className="text-sm text-gray-600">{reward.description}</p>
                      </div>
                    </div>
                    <div>
                      {reward.isUnlocked ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <Unlock className="h-6 w-6" />
                          <span className="font-bold">Unlocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Lock className="h-6 w-6" />
                          <span className="font-bold">Locked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!reward.isUnlocked && (
                    <>
                      <div className="space-y-3">
                        {/* Points Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">Points Required</span>
                            <span className="text-sm font-bold text-gray-800">
                              {pointsData?.totalPoints || 0} / {reward.pointsRequired}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-green-500 transition-all duration-500"
                              style={{ 
                                width: `${Math.min(((pointsData?.totalPoints || 0) / reward.pointsRequired) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>

                        {/* Days Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">Streak Required</span>
                            <span className="text-sm font-bold text-gray-800">
                              {streakData?.currentStreak || 0} / {reward.daysRequired} days
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-orange-500 transition-all duration-500"
                              style={{ 
                                width: `${Math.min(((streakData?.currentStreak || 0) / reward.daysRequired) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 bg-white bg-opacity-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          {((pointsData?.totalPoints || 0) >= reward.pointsRequired) && 
                           ((streakData?.currentStreak || 0) >= reward.daysRequired)
                            ? '🎉 Ready to unlock! Keep up the great work!'
                            : ((pointsData?.totalPoints || 0) >= reward.pointsRequired)
                            ? `Keep going! ${reward.daysRequired - (streakData?.currentStreak || 0)} more days needed!`
                            : ((streakData?.currentStreak || 0) >= reward.daysRequired)
                            ? `Almost there! ${reward.pointsRequired - (pointsData?.totalPoints || 0)} more points needed!`
                            : `Keep working! You need ${reward.pointsRequired - (pointsData?.totalPoints || 0)} points and ${reward.daysRequired - (streakData?.currentStreak || 0)} more days.`
                          }
                        </p>
                      </div>
                    </>
                  )}

                  {reward.isUnlocked && (
                    <div className="mt-4 bg-green-100 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ Unlocked on {new Date(reward.unlockedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* How to Earn Points */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm border border-indigo-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">💡 How to Earn Points</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Daily Login: 5 points</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📚</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Study Session: 10 points</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📝</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Complete Quiz: 15 points</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Maintain Streak: 20 points</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DelayedGratificationTrainer;
