/**
 * Auto Data Populator
 * Automatically generates realistic student data when user logs in
 * This ensures the Student Dashboard always has data to display
 */

import {
  recordStudySession,
  recordFocus,
  recordContentUsage,
  updateMarks,
  updateAttendance,
  updateAssignmentCompletion,
  updateWeakTopics,
  getStudentProfile
} from './studentDataCollector';

/**
 * Checks if student profile has sufficient data
 */
export function hasStudentData() {
  const profile = getStudentProfile();
  return Object.keys(profile.current_marks).length > 0;
}

/**
 * Generates realistic student data based on user profile
 * Called automatically on login if no data exists
 */
export function autoGenerateStudentData(userProfile) {
  console.log('🤖 Auto-generating student data for:', userProfile.name);

  // Get subjects from user profile or use defaults
  const subjects = userProfile.subjects || ['math', 'science', 'english', 'history', 'geography'];
  
  // Generate realistic marks (60-90 range for most students)
  const marks = {};
  subjects.forEach(subject => {
    // Generate marks with some variation
    const baseScore = 65 + Math.random() * 20; // 65-85 base
    marks[subject.toLowerCase()] = Math.round(baseScore);
  });
  updateMarks(marks);

  // Generate study time data (0.5 to 3 hours per subject)
  subjects.forEach(subject => {
    const studyMinutes = Math.floor(30 + Math.random() * 150); // 30-180 minutes
    recordStudySession(subject.toLowerCase(), studyMinutes);
  });

  // Add some additional study sessions for variety
  const extraSessions = Math.floor(Math.random() * 5) + 2; // 2-6 extra sessions
  for (let i = 0; i < extraSessions; i++) {
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const sessionMinutes = Math.floor(20 + Math.random() * 60); // 20-80 minutes
    recordStudySession(randomSubject.toLowerCase(), sessionMinutes);
  }

  // Generate focus time (total 60-180 minutes across sessions)
  const focusSessions = Math.floor(Math.random() * 4) + 2; // 2-5 focus sessions
  for (let i = 0; i < focusSessions; i++) {
    const focusMinutes = Math.floor(15 + Math.random() * 45); // 15-60 minutes
    recordFocus(focusMinutes);
  }

  // Generate content usage
  const contentItems = Math.floor(Math.random() * 8) + 3; // 3-10 items
  for (let i = 0; i < contentItems; i++) {
    const type = Math.random() > 0.5 ? 'video' : 'book';
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    recordContentUsage(
      type,
      `${randomSubject}-${type}-${i}`,
      {
        title: `${randomSubject} ${type === 'video' ? 'Lesson' : 'Chapter'} ${i + 1}`,
        subject: randomSubject.toLowerCase()
      }
    );
  }

  // Set attendance (70-95%)
  const attendance = Math.floor(70 + Math.random() * 25);
  updateAttendance(attendance);

  // Set assignment completion (60-95%)
  const assignmentCompletion = Math.floor(60 + Math.random() * 35);
  updateAssignmentCompletion(assignmentCompletion);

  // Generate weak topics (1-3 topics per subject for lower-scoring subjects)
  const weakTopicsBySubject = {
    math: ['algebra', 'geometry', 'trigonometry', 'calculus', 'statistics'],
    science: ['physics', 'chemistry', 'biology', 'chemical equations', 'organic chemistry'],
    english: ['grammar', 'comprehension', 'writing', 'vocabulary', 'literature'],
    history: ['ancient civilizations', 'world wars', 'modern history', 'medieval period'],
    geography: ['maps', 'climate', 'physical geography', 'human geography']
  };

  subjects.forEach(subject => {
    const subjectLower = subject.toLowerCase();
    const score = marks[subjectLower];
    
    // Add weak topics for subjects with lower scores
    if (score < 75) {
      const availableTopics = weakTopicsBySubject[subjectLower] || ['general concepts'];
      const numWeakTopics = Math.floor(Math.random() * 3) + 1; // 1-3 topics
      const weakTopics = [];
      
      for (let i = 0; i < numWeakTopics && i < availableTopics.length; i++) {
        weakTopics.push(availableTopics[i]);
      }
      
      if (weakTopics.length > 0) {
        updateWeakTopics(subjectLower, weakTopics);
      }
    }
  });

  console.log('✅ Auto-generated student data successfully');
  console.log('📊 Profile:', getStudentProfile());
  
  return getStudentProfile();
}

/**
 * Initializes student data on login
 * Call this from AuthContext or Dashboard component
 */
export function initializeStudentData(user) {
  // Only auto-generate for students
  if (user.userType !== 'student') {
    return null;
  }

  // Check if data already exists
  if (hasStudentData()) {
    console.log('✓ Student data already exists');
    return getStudentProfile();
  }

  // Generate data if none exists
  console.log('⚡ No student data found, auto-generating...');
  return autoGenerateStudentData(user);
}

/**
 * Refreshes student data with new random values
 * Useful for testing different scenarios
 */
export function refreshStudentData(user) {
  console.log('🔄 Refreshing student data...');
  return autoGenerateStudentData(user);
}
