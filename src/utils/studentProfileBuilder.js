/**
 * Student Profile Builder
 * Automatically builds student profile from user data for AI Study Twin
 * Uses real user object fields when available
 */

import {
  updateMarks,
  updateAttendance,
  updateAssignmentCompletion,
  updateWeakTopics,
  recordStudySession,
  getStudentProfile
} from './studentDataCollector';

/**
 * Builds student profile from user object
 * Uses real data when available, generates realistic defaults otherwise
 * 
 * @param {Object} user - User object from authentication
 * @returns {Object} Student profile ready for AI Study Twin API
 */
export function buildStudentProfile(user) {
  console.log('📊 Building student profile for:', user.name || user.email);

  // Only build profile for students
  if (user.userType !== 'student') {
    console.log('⚠️ User is not a student, skipping profile build');
    return null;
  }

  // Extract subjects from user profile
  const subjects = extractSubjects(user);
  console.log('📚 Subjects:', subjects);

  // Build marks data
  const marks = buildMarksData(user, subjects);
  if (Object.keys(marks).length > 0) {
    updateMarks(marks);
  }

  // Build study time data
  buildStudyTimeData(user, subjects);

  // Set attendance
  const attendance = extractAttendance(user);
  if (attendance !== null) {
    updateAttendance(attendance);
  }

  // Set assignment completion
  const assignmentCompletion = extractAssignmentCompletion(user);
  if (assignmentCompletion !== null) {
    updateAssignmentCompletion(assignmentCompletion);
  }

  // Build weak topics
  buildWeakTopics(user, subjects, marks);

  const profile = getStudentProfile();
  console.log('✅ Student profile built:', profile);
  
  return profile;
}

/**
 * Extracts subjects from user object
 */
function extractSubjects(user) {
  // Try to get subjects from user profile
  if (user.subjects && Array.isArray(user.subjects) && user.subjects.length > 0) {
    return user.subjects.map(s => s.toLowerCase());
  }

  // Default subjects based on class/grade
  const classNum = parseInt(user.class) || 10;
  
  if (classNum <= 5) {
    return ['math', 'science', 'english', 'social studies'];
  } else if (classNum <= 8) {
    return ['math', 'science', 'english', 'history', 'geography'];
  } else if (classNum <= 10) {
    return ['math', 'science', 'english', 'history', 'geography'];
  } else {
    // Higher classes might have specialization
    if (user.department === 'science') {
      return ['math', 'physics', 'chemistry', 'biology', 'english'];
    } else if (user.department === 'commerce') {
      return ['math', 'economics', 'accountancy', 'business studies', 'english'];
    } else if (user.department === 'arts') {
      return ['history', 'geography', 'political science', 'english', 'sociology'];
    }
    return ['math', 'science', 'english', 'history', 'geography'];
  }
}

/**
 * Builds marks data from user object or generates realistic defaults
 */
function buildMarksData(user, subjects) {
  const marks = {};

  // Check if user has marks data
  if (user.marks && typeof user.marks === 'object') {
    // Use existing marks
    Object.keys(user.marks).forEach(subject => {
      marks[subject.toLowerCase()] = user.marks[subject];
    });
    console.log('📊 Using existing marks from user profile');
    return marks;
  }

  // Check if user has recent test scores
  if (user.testScores && typeof user.testScores === 'object') {
    Object.keys(user.testScores).forEach(subject => {
      marks[subject.toLowerCase()] = user.testScores[subject];
    });
    console.log('📊 Using test scores from user profile');
    return marks;
  }

  // Generate realistic marks based on user's class and performance indicators
  console.log('📊 Generating realistic marks');
  
  // Base score depends on various factors
  let baseScore = 70; // Default average student
  
  // Adjust based on attendance if available
  if (user.attendance) {
    const attendance = parseInt(user.attendance);
    if (attendance >= 90) baseScore += 10;
    else if (attendance >= 80) baseScore += 5;
    else if (attendance < 70) baseScore -= 10;
  }

  // Adjust based on assignment completion if available
  if (user.assignmentCompletion) {
    const completion = parseInt(user.assignmentCompletion);
    if (completion >= 90) baseScore += 5;
    else if (completion < 70) baseScore -= 5;
  }

  // Generate marks for each subject with variation
  subjects.forEach(subject => {
    // Add random variation (-10 to +15)
    const variation = Math.floor(Math.random() * 25) - 10;
    let score = baseScore + variation;
    
    // Ensure score is within valid range
    score = Math.max(35, Math.min(95, score));
    
    marks[subject] = score;
  });

  return marks;
}

/**
 * Builds study time data
 */
function buildStudyTimeData(user, subjects) {
  // Check if user has study time data
  if (user.studyTime && typeof user.studyTime === 'object') {
    Object.keys(user.studyTime).forEach(subject => {
      const hours = user.studyTime[subject];
      const minutes = hours * 60;
      recordStudySession(subject.toLowerCase(), minutes);
    });
    console.log('⏱️ Using existing study time from user profile');
    return;
  }

  // Generate realistic study time
  console.log('⏱️ Generating realistic study time');
  
  subjects.forEach(subject => {
    // Generate 1-3 study sessions per subject
    const sessionCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < sessionCount; i++) {
      // Each session: 30-120 minutes
      const minutes = Math.floor(Math.random() * 90) + 30;
      recordStudySession(subject, minutes);
    }
  });
}

/**
 * Extracts attendance from user object
 */
function extractAttendance(user) {
  if (user.attendance) {
    const attendance = parseInt(user.attendance);
    if (!isNaN(attendance) && attendance >= 0 && attendance <= 100) {
      console.log('📅 Using attendance from user profile:', attendance);
      return attendance;
    }
  }

  // Generate realistic attendance (70-95%)
  const attendance = Math.floor(Math.random() * 25) + 70;
  console.log('📅 Generated attendance:', attendance);
  return attendance;
}

/**
 * Extracts assignment completion from user object
 */
function extractAssignmentCompletion(user) {
  if (user.assignmentCompletion) {
    const completion = parseInt(user.assignmentCompletion);
    if (!isNaN(completion) && completion >= 0 && completion <= 100) {
      console.log('✅ Using assignment completion from user profile:', completion);
      return completion;
    }
  }

  // Generate realistic completion (60-95%)
  const completion = Math.floor(Math.random() * 35) + 60;
  console.log('✅ Generated assignment completion:', completion);
  return completion;
}

/**
 * Builds weak topics based on marks
 */
function buildWeakTopics(user, subjects, marks) {
  // Check if user has weak topics data
  if (user.weakTopics && typeof user.weakTopics === 'object') {
    Object.keys(user.weakTopics).forEach(subject => {
      updateWeakTopics(subject.toLowerCase(), user.weakTopics[subject]);
    });
    console.log('📝 Using weak topics from user profile');
    return;
  }

  // Generate weak topics for subjects with lower marks
  console.log('📝 Generating weak topics based on marks');
  
  const topicsBySubject = {
    math: ['algebra', 'geometry', 'trigonometry', 'calculus', 'statistics'],
    science: ['physics', 'chemistry', 'biology'],
    physics: ['mechanics', 'electricity', 'optics', 'thermodynamics'],
    chemistry: ['organic chemistry', 'inorganic chemistry', 'physical chemistry'],
    biology: ['cell biology', 'genetics', 'ecology', 'human anatomy'],
    english: ['grammar', 'comprehension', 'writing', 'vocabulary'],
    history: ['ancient history', 'medieval history', 'modern history'],
    geography: ['physical geography', 'human geography', 'maps'],
    economics: ['microeconomics', 'macroeconomics', 'statistics'],
    accountancy: ['journal entries', 'balance sheet', 'financial statements'],
    'business studies': ['marketing', 'finance', 'human resources'],
    'political science': ['constitution', 'political theory', 'international relations'],
    'social studies': ['civics', 'history', 'geography']
  };

  subjects.forEach(subject => {
    const score = marks[subject] || 70;
    
    // Add weak topics for subjects with score < 75
    if (score < 75) {
      const availableTopics = topicsBySubject[subject] || ['general concepts'];
      const numWeakTopics = score < 60 ? 3 : score < 70 ? 2 : 1;
      
      const weakTopics = availableTopics.slice(0, numWeakTopics);
      updateWeakTopics(subject, weakTopics);
    }
  });
}

/**
 * Checks if student profile has sufficient data for predictions
 */
export function hasValidProfile() {
  const profile = getStudentProfile();
  return (
    Object.keys(profile.current_marks).length > 0 &&
    Object.keys(profile.study_time_hours).length > 0
  );
}

/**
 * Gets a summary of the built profile
 */
export function getProfileSummary() {
  const profile = getStudentProfile();
  
  return {
    subjects: Object.keys(profile.current_marks),
    averageMarks: Object.values(profile.current_marks).reduce((a, b) => a + b, 0) / Object.keys(profile.current_marks).length,
    totalStudyHours: Object.values(profile.study_time_hours).reduce((a, b) => a + b, 0),
    attendance: profile.attendance_percent,
    assignmentCompletion: profile.assignment_completion,
    weakSubjects: Object.keys(profile.weak_topics)
  };
}
