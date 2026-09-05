/**
 * Decision Consequence Simulator Service
 * Calculates predictions based on student habits
 */

const STORAGE_KEY = 'decision_simulations';

export const simulateConsequences = (habits) => {
  const { studyHours, playHours, sleepTime, screenHours } = habits;
  
  // Calculate Energy Level (0-100)
  let energy = 50; // Base energy
  
  // Sleep time impact
  const sleepHour = parseInt(sleepTime.split(':')[0]);
  if (sleepHour <= 23 && sleepHour >= 21) {
    energy += 20; // Sleep before 11 PM
  } else if (sleepHour >= 0 && sleepHour <= 2) {
    energy -= 20; // Sleep after midnight
  }
  
  // Study hours impact
  if (studyHours >= 4 && studyHours <= 6) {
    energy += 15;
  } else if (studyHours > 8) {
    energy -= 15; // Too much study
  }
  
  // Screen time impact
  if (screenHours > 4) {
    energy -= 15;
  } else if (screenHours <= 2) {
    energy += 10;
  }
  
  // Play time balance
  if (playHours >= 1 && playHours <= 2) {
    energy += 10;
  }
  
  energy = Math.max(0, Math.min(100, energy));
  
  // Calculate Focus Level (0-100)
  let focus = 50; // Base focus
  
  // Study hours impact
  if (studyHours >= 4) {
    focus += 30;
  } else if (studyHours >= 2) {
    focus += 15;
  } else if (studyHours < 1) {
    focus -= 20;
  }
  
  // Screen time vs study time
  if (screenHours < studyHours) {
    focus += 20;
  } else if (screenHours > studyHours * 2) {
    focus -= 25;
  }
  
  // Sleep quality
  if (sleepHour <= 23 && sleepHour >= 21) {
    focus += 15;
  } else if (sleepHour >= 0 && sleepHour <= 2) {
    focus -= 20;
  }
  
  focus = Math.max(0, Math.min(100, focus));
  
  // Calculate Performance (0-100)
  const performance = Math.round(
    (energy * 0.3) + (focus * 0.4) + (studyHours * 5)
  );
  
  const finalPerformance = Math.max(0, Math.min(100, performance));
  
  return {
    energy: Math.round(energy),
    focus: Math.round(focus),
    performance: finalPerformance,
    insights: generateInsights(habits, energy, focus, finalPerformance)
  };
};

const generateInsights = (habits, energy, focus, performance) => {
  const insights = [];
  const { studyHours, playHours, sleepTime, screenHours } = habits;
  const sleepHour = parseInt(sleepTime.split(':')[0]);
  
  // Sleep insights
  if (sleepHour >= 0 && sleepHour <= 2) {
    insights.push({
      type: 'warning',
      message: `Sleeping at ${sleepTime} reduces your energy by 25%. Try sleeping before 11 PM.`
    });
  } else if (sleepHour <= 23 && sleepHour >= 21) {
    insights.push({
      type: 'positive',
      message: `Great! Sleeping at ${sleepTime} gives you optimal energy for the next day.`
    });
  }
  
  // Study insights
  if (studyHours < 2) {
    insights.push({
      type: 'warning',
      message: `Low study time (${studyHours}h) affects your exam readiness. Aim for 4-6 hours.`
    });
  } else if (studyHours >= 4 && studyHours <= 6) {
    insights.push({
      type: 'positive',
      message: `Excellent! ${studyHours} hours of study is optimal for learning.`
    });
  } else if (studyHours > 8) {
    insights.push({
      type: 'info',
      message: `${studyHours} hours is a lot! Make sure to take breaks to avoid burnout.`
    });
  }
  
  // Screen time insights
  if (screenHours > studyHours) {
    insights.push({
      type: 'warning',
      message: `Screen time (${screenHours}h) exceeds study time (${studyHours}h). This reduces focus by ${Math.round((screenHours - studyHours) * 10)}%.`
    });
  } else if (screenHours <= 2) {
    insights.push({
      type: 'positive',
      message: `Low screen time (${screenHours}h) helps maintain high focus levels.`
    });
  }
  
  // Play time insights
  if (playHours < 0.5) {
    insights.push({
      type: 'info',
      message: 'Consider adding some physical activity or play time for better energy.'
    });
  } else if (playHours > 4) {
    insights.push({
      type: 'warning',
      message: `High play time (${playHours}h) may reduce study effectiveness.`
    });
  }
  
  // Overall performance
  if (performance >= 80) {
    insights.push({
      type: 'positive',
      message: `Outstanding! Your habits lead to ${performance}% exam readiness.`
    });
  } else if (performance < 50) {
    insights.push({
      type: 'warning',
      message: `Your current habits result in only ${performance}% exam readiness. Consider improving sleep and study time.`
    });
  }
  
  return insights;
};

export const saveSimulation = async (userId, habits, results) => {
  try {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    if (!allData[userId]) {
      allData[userId] = [];
    }
    
    allData[userId].push({
      date: new Date().toISOString(),
      habits,
      results,
      timestamp: Date.now()
    });
    
    // Keep only last 30 simulations
    if (allData[userId].length > 30) {
      allData[userId] = allData[userId].slice(-30);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    return true;
  } catch (error) {
    console.error('Error saving simulation:', error);
    return false;
  }
};

export const getSimulationHistory = async (userId) => {
  try {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return allData[userId] || [];
  } catch (error) {
    console.error('Error getting simulation history:', error);
    return [];
  }
};

export const getSimulationStats = async (userId) => {
  const history = await getSimulationHistory(userId);
  
  if (history.length === 0) {
    return null;
  }
  
  const avgEnergy = history.reduce((sum, sim) => sum + sim.results.energy, 0) / history.length;
  const avgFocus = history.reduce((sum, sim) => sum + sim.results.focus, 0) / history.length;
  const avgPerformance = history.reduce((sum, sim) => sum + sim.results.performance, 0) / history.length;
  
  return {
    totalSimulations: history.length,
    avgEnergy: Math.round(avgEnergy),
    avgFocus: Math.round(avgFocus),
    avgPerformance: Math.round(avgPerformance),
    lastSimulation: history[history.length - 1]
  };
};
