// Health Tracker Service — DynamoDB backed via studentDataService
import { getData, saveData } from './studentDataService.js'

const DATA_TYPE = 'health'

export const saveHealthData = async (userId, data) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const entries = await getData(userId, DATA_TYPE, [])

    const idx = entries.findIndex(e => e.date === today)
    const entry = { date: today, data, timestamp: new Date().toISOString() }
    if (idx >= 0) entries[idx] = entry
    else entries.push(entry)

    entries.sort((a, b) => new Date(b.date) - new Date(a.date))
    saveData(userId, DATA_TYPE, entries)
    return true
  } catch (err) {
    console.error('Error saving health data:', err)
    throw err
  }
}

export const getHealthData = async (userId) => {
  try {
    return await getData(userId, DATA_TYPE, [])
  } catch {
    return []
  }
}

export const calculateWellnessScore = (data) => {
  const { sleepHours, screenTime, studyHours, breakTime } = data;
  
  let score = 0;
  
  // Sleep score (30 points max) - School students need 7-9 hours
  if (sleepHours >= 7 && sleepHours <= 9) {
    score += 30; // Perfect sleep
  } else if (sleepHours >= 6 && sleepHours < 7) {
    score += 25; // Good sleep
  } else if (sleepHours >= 5 && sleepHours < 6) {
    score += 15; // Acceptable
  } else if (sleepHours >= 4 && sleepHours < 5) {
    score += 5; // Poor
  }
  // Less than 4 hours = 0 points
  
  // Study hours score (35 points max) - Adjusted for school students
  // 3-6 hours is excellent for school students (1st-12th standard)
  if (studyHours >= 3 && studyHours <= 6) {
    score += 35; // Excellent - Perfect for school students
  } else if (studyHours >= 2 && studyHours < 3) {
    score += 28; // Good - Acceptable for younger students
  } else if (studyHours >= 1.5 && studyHours < 2) {
    score += 20; // Fair - Minimum for school
  } else if (studyHours > 6 && studyHours <= 8) {
    score += 30; // Good but watch for burnout
  } else if (studyHours > 8) {
    score += 20; // Too much - risk of burnout
  } else if (studyHours >= 1 && studyHours < 1.5) {
    score += 10; // Low - needs improvement
  }
  // Less than 1 hour = 0 points
  
  // Screen time vs study time (20 points max)
  if (studyHours > 0) {
    const ratio = screenTime / studyHours;
    if (ratio <= 0.5) {
      score += 20; // Excellent - Screen time is half or less of study time
    } else if (ratio <= 0.8) {
      score += 18; // Very good
    } else if (ratio <= 1) {
      score += 15; // Good - Equal time
    } else if (ratio <= 1.5) {
      score += 10; // Fair - Screen time slightly higher
    } else if (ratio <= 2) {
      score += 5; // Poor - Screen time double
    }
    // Ratio > 2 = 0 points
  } else {
    // If no study hours, penalize high screen time
    if (screenTime <= 2) {
      score += 10;
    } else if (screenTime <= 4) {
      score += 5;
    }
    // More than 4 hours screen with no study = 0 points
  }
  
  // Break time score (15 points max) - Adjusted for realistic expectations
  if (studyHours > 0) {
    const breakRatio = breakTime / studyHours;
    if (breakRatio >= 0.15 && breakRatio <= 0.35) {
      score += 15; // Perfect - 15-35% break time
    } else if (breakRatio >= 0.1 && breakRatio < 0.15) {
      score += 12; // Good - 10-15% break time
    } else if (breakRatio >= 0.05 && breakRatio < 0.1) {
      score += 8; // Fair - 5-10% break time
    } else if (breakRatio > 0.35 && breakRatio <= 0.5) {
      score += 12; // Good - Adequate breaks
    } else if (breakRatio > 0.5 && breakRatio <= 0.7) {
      score += 8; // Too many breaks
    } else if (breakRatio < 0.05) {
      score += 5; // Too few breaks
    }
    // More than 70% break time = 0 points (not really studying)
  } else {
    // If no study, break time doesn't matter much
    score += 5;
  }
  
  return Math.round(score);
};

export const getWeeklyStats = async (userId) => {
  const data = await getHealthData(userId);
  const lastWeek = data.slice(0, 7);
  
  if (lastWeek.length === 0) return null;
  
  const avgSleep = lastWeek.reduce((sum, entry) => sum + entry.data.sleepHours, 0) / lastWeek.length;
  const avgStudy = lastWeek.reduce((sum, entry) => sum + entry.data.studyHours, 0) / lastWeek.length;
  const avgScreen = lastWeek.reduce((sum, entry) => sum + entry.data.screenTime, 0) / lastWeek.length;
  const avgBreak = lastWeek.reduce((sum, entry) => sum + entry.data.breakTime, 0) / lastWeek.length;
  const avgWellness = lastWeek.reduce((sum, entry) => sum + calculateWellnessScore(entry.data), 0) / lastWeek.length;
  
  return {
    avgSleep: avgSleep.toFixed(1),
    avgStudy: avgStudy.toFixed(1),
    avgScreen: avgScreen.toFixed(1),
    avgBreak: avgBreak.toFixed(1),
    avgWellness: Math.round(avgWellness),
    daysTracked: lastWeek.length
  };
};

export const getDataByRange = (allData, days) => {
  // Get data for the last N days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return allData.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= cutoffDate;
  }).reverse(); // Reverse to get chronological order
};

export const generateInsights = (data) => {
  if (data.length < 2) return [];
  
  const insights = [];
  
  // Calculate averages for current period
  const avgSleep = data.reduce((sum, entry) => sum + entry.data.sleepHours, 0) / data.length;
  const avgStudy = data.reduce((sum, entry) => sum + entry.data.studyHours, 0) / data.length;
  const avgScreen = data.reduce((sum, entry) => sum + entry.data.screenTime, 0) / data.length;
  const avgWellness = data.reduce((sum, entry) => sum + calculateWellnessScore(entry.data), 0) / data.length;
  
  // Split data into two halves for comparison
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);
  
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstHalfAvgSleep = firstHalf.reduce((sum, entry) => sum + entry.data.sleepHours, 0) / firstHalf.length;
    const secondHalfAvgSleep = secondHalf.reduce((sum, entry) => sum + entry.data.sleepHours, 0) / secondHalf.length;
    
    const firstHalfAvgStudy = firstHalf.reduce((sum, entry) => sum + entry.data.studyHours, 0) / firstHalf.length;
    const secondHalfAvgStudy = secondHalf.reduce((sum, entry) => sum + entry.data.studyHours, 0) / secondHalf.length;
    
    const firstHalfAvgWellness = firstHalf.reduce((sum, entry) => sum + calculateWellnessScore(entry.data), 0) / firstHalf.length;
    const secondHalfAvgWellness = secondHalf.reduce((sum, entry) => sum + calculateWellnessScore(entry.data), 0) / secondHalf.length;
    
    // Sleep insights
    const sleepChange = ((secondHalfAvgSleep - firstHalfAvgSleep) / firstHalfAvgSleep) * 100;
    if (Math.abs(sleepChange) > 10) {
      if (sleepChange < 0) {
        insights.push({
          type: 'warning',
          message: `Your sleep hours decreased by ${Math.abs(sleepChange).toFixed(0)}% in the recent period. Try maintaining at least 7 hours for better focus.`
        });
      } else {
        insights.push({
          type: 'positive',
          message: `Great! Your sleep hours improved by ${sleepChange.toFixed(0)}% recently. Keep it up!`
        });
      }
    }
    
    // Study consistency insights
    const studyChange = ((secondHalfAvgStudy - firstHalfAvgStudy) / firstHalfAvgStudy) * 100;
    if (Math.abs(studyChange) > 15) {
      if (studyChange > 0) {
        insights.push({
          type: 'positive',
          message: `Your study consistency improved by ${studyChange.toFixed(0)}% compared to the earlier period. Excellent progress!`
        });
      } else {
        insights.push({
          type: 'warning',
          message: `Your study hours decreased by ${Math.abs(studyChange).toFixed(0)}%. Try to maintain a consistent study schedule.`
        });
      }
    }
    
    // Wellness trend
    const wellnessChange = secondHalfAvgWellness - firstHalfAvgWellness;
    if (Math.abs(wellnessChange) > 5) {
      if (wellnessChange > 0) {
        insights.push({
          type: 'positive',
          message: `Your overall wellness score improved by ${wellnessChange.toFixed(0)} points. You're building healthy habits!`
        });
      } else {
        insights.push({
          type: 'warning',
          message: `Your wellness score dropped by ${Math.abs(wellnessChange).toFixed(0)} points. Focus on sleep and study balance.`
        });
      }
    }
  }
  
  // General insights based on averages
  if (avgSleep < 6) {
    insights.push({
      type: 'warning',
      message: `Your average sleep is ${avgSleep.toFixed(1)} hours. Aim for 7-8 hours to improve learning efficiency.`
    });
  } else if (avgSleep >= 7 && avgSleep <= 9) {
    insights.push({
      type: 'positive',
      message: `Perfect! Your average sleep of ${avgSleep.toFixed(1)} hours is in the optimal range.`
    });
  }
  
  // Screen time vs study time
  if (avgScreen > avgStudy) {
    const ratio = (avgScreen / avgStudy).toFixed(1);
    insights.push({
      type: 'warning',
      message: `Your screen time is ${ratio}x your study time. Consider reducing distractions for better productivity.`
    });
  } else if (avgStudy > avgScreen * 1.5) {
    insights.push({
      type: 'positive',
      message: `Excellent balance! Your study time significantly exceeds screen time. Keep up the focused work!`
    });
  }
  
  // Study hours insight
  if (avgStudy >= 4 && avgStudy <= 6) {
    insights.push({
      type: 'positive',
      message: `Your average study time of ${avgStudy.toFixed(1)} hours is in the optimal range for effective learning.`
    });
  } else if (avgStudy < 3) {
    insights.push({
      type: 'info',
      message: `Your average study time is ${avgStudy.toFixed(1)} hours. Consider increasing it to 4-6 hours for better results.`
    });
  } else if (avgStudy > 8) {
    insights.push({
      type: 'warning',
      message: `You're studying ${avgStudy.toFixed(1)} hours on average. Remember to take breaks to avoid burnout!`
    });
  }
  
  // Wellness score insight
  if (avgWellness >= 80) {
    insights.push({
      type: 'positive',
      message: `Outstanding! Your average wellness score of ${avgWellness.toFixed(0)} shows excellent health habits.`
    });
  } else if (avgWellness < 50) {
    insights.push({
      type: 'warning',
      message: `Your wellness score is ${avgWellness.toFixed(0)}. Focus on improving sleep, study balance, and reducing screen time.`
    });
  }
  
  return insights;
};
