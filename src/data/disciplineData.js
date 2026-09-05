/**
 * Discipline & Behavior Learning Data
 * Contains achievements, rewards, and configuration data
 */

export const ACHIEVEMENTS = {
  FIRST_STREAK: {
    id: 'first_streak',
    name: '🔥 First Streak',
    description: 'Maintained discipline for 3 consecutive days',
    requirement: '3 days streak',
    points: 50,
    icon: '🔥'
  },
  WEEK_WARRIOR: {
    id: 'week_warrior',
    name: '🏅 Week Warrior',
    description: 'Maintained discipline for 7 consecutive days',
    requirement: '7 days streak',
    points: 100,
    icon: '🏅'
  },
  FORTNIGHT_CHAMPION: {
    id: 'fortnight_champion',
    name: '🏆 Fortnight Champion',
    description: 'Maintained discipline for 14 consecutive days',
    requirement: '14 days streak',
    points: 200,
    icon: '🏆'
  },
  MONTH_MASTER: {
    id: 'month_master',
    name: '👑 Month Master',
    description: 'Maintained discipline for 30 consecutive days',
    requirement: '30 days streak',
    points: 500,
    icon: '👑'
  },
  FOCUS_EXPERT: {
    id: 'focus_expert',
    name: '🎯 Focus Expert',
    description: 'Achieved 10 deep focus sessions',
    requirement: '10 deep focus sessions',
    points: 150,
    icon: '🎯'
  },
  DECISION_MAKER: {
    id: 'decision_maker',
    name: '🧠 Decision Maker',
    description: 'Completed 20 decision simulations',
    requirement: '20 simulations',
    points: 100,
    icon: '🧠'
  },
  POINT_COLLECTOR: {
    id: 'point_collector',
    name: '⭐ Point Collector',
    description: 'Earned 500 total points',
    requirement: '500 points',
    points: 250,
    icon: '⭐'
  }
};

export const REWARDS = [
  {
    id: 'beginner_badge',
    name: 'Beginner Badge',
    description: 'Your first achievement badge',
    type: 'badge',
    pointsRequired: 50,
    daysRequired: 3,
    icon: '🎖️',
    color: 'bronze'
  },
  {
    id: 'study_certificate',
    name: 'Study Certificate',
    description: 'Certificate of consistent study',
    type: 'certificate',
    pointsRequired: 150,
    daysRequired: 5,
    icon: '🎓',
    color: 'silver'
  },
  {
    id: 'premium_feature',
    name: 'Premium Feature Access',
    description: 'Unlock advanced learning tools',
    type: 'feature_unlock',
    pointsRequired: 250,
    daysRequired: 7,
    icon: '⭐',
    color: 'gold'
  },
  {
    id: 'master_badge',
    name: 'Master Badge',
    description: 'Elite discipline achievement',
    type: 'badge',
    pointsRequired: 500,
    daysRequired: 14,
    icon: '👑',
    color: 'platinum'
  }
];

export const LEVELS = [
  { level: 1, name: 'Beginner', pointsRequired: 0, color: '#9CA3AF' },
  { level: 2, name: 'Learner', pointsRequired: 100, color: '#60A5FA' },
  { level: 3, name: 'Practitioner', pointsRequired: 250, color: '#34D399' },
  { level: 4, name: 'Expert', pointsRequired: 500, color: '#F59E0B' },
  { level: 5, name: 'Master', pointsRequired: 1000, color: '#8B5CF6' }
];

export const POINT_ACTIVITIES = {
  DAILY_LOGIN: { points: 5, name: 'Daily Login' },
  STUDY_SESSION: { points: 10, name: 'Complete Study Session' },
  QUIZ_COMPLETE: { points: 15, name: 'Complete Quiz' },
  STREAK_MAINTAIN: { points: 20, name: 'Maintain Streak' },
  PERFECT_QUIZ: { points: 25, name: 'Perfect Quiz Score' },
  DECISION_SIMULATION: { points: 5, name: 'Decision Simulation' },
  FOCUS_SESSION: { points: 10, name: 'Focus Session' }
};

export function getLevelByPoints(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].pointsRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getNextLevel(currentPoints) {
  const currentLevel = getLevelByPoints(currentPoints);
  const currentIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
  
  if (currentIndex < LEVELS.length - 1) {
    return LEVELS[currentIndex + 1];
  }
  return null;
}

export function getProgressToNextLevel(currentPoints) {
  const nextLevel = getNextLevel(currentPoints);
  if (!nextLevel) return 100;
  
  const currentLevel = getLevelByPoints(currentPoints);
  const pointsInCurrentLevel = currentPoints - currentLevel.pointsRequired;
  const pointsNeededForNext = nextLevel.pointsRequired - currentLevel.pointsRequired;
  
  return Math.round((pointsInCurrentLevel / pointsNeededForNext) * 100);
}
