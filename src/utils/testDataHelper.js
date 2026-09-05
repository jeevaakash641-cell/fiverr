/**
 * Test Data Helper
 * Use this to populate sample student data for testing the Student Dashboard
 * 
 * USAGE:
 * 1. Open browser console on the app
 * 2. Import this file or copy functions to console
 * 3. Run: populateSampleData()
 * 4. Navigate to /student-dashboard to see results
 */

import {
  recordStudySession,
  recordFocus,
  recordContentUsage,
  updateMarks,
  updateAttendance,
  updateAssignmentCompletion,
  updateWeakTopics,
  getStudentProfile,
  getStats
} from './studentDataCollector';

/**
 * Populates sample student data for testing
 */
export function populateSampleData() {
  console.log('📊 Populating sample student data...');

  // Set current marks
  updateMarks({
    math: 65,
    science: 72,
    english: 80,
    history: 58,
    geography: 75
  });

  // Record study sessions
  recordStudySession('math', 120);      // 2 hours
  recordStudySession('science', 90);    // 1.5 hours
  recordStudySession('english', 60);    // 1 hour
  recordStudySession('history', 45);    // 0.75 hours
  recordStudySession('geography', 75);  // 1.25 hours
  recordStudySession('math', 60);       // Additional session
  recordStudySession('science', 45);    // Additional session

  // Record focus time
  recordFocus(45);
  recordFocus(30);
  recordFocus(60);
  recordFocus(25);

  // Record content usage
  recordContentUsage('video', 'math-algebra-101', { 
    title: 'Algebra Basics', 
    subject: 'math' 
  });
  recordContentUsage('video', 'science-physics-motion', { 
    title: 'Laws of Motion', 
    subject: 'science' 
  });
  recordContentUsage('book', 'math-textbook-ch5', { 
    title: 'Quadratic Equations', 
    subject: 'math' 
  });
  recordContentUsage('book', 'english-grammar-guide', { 
    title: 'Grammar Guide', 
    subject: 'english' 
  });

  // Set attendance and assignment completion
  updateAttendance(85);
  updateAssignmentCompletion(90);

  // Set weak topics
  updateWeakTopics('math', ['algebra', 'quadratic equations', 'geometry']);
  updateWeakTopics('history', ['ancient civilizations', 'world wars']);
  updateWeakTopics('science', ['chemical equations', 'organic chemistry']);

  console.log('✅ Sample data populated successfully!');
  console.log('📈 Current profile:', getStudentProfile());
  console.log('📊 Stats:', getStats());
  
  return {
    profile: getStudentProfile(),
    stats: getStats()
  };
}

/**
 * Populates minimal data for quick testing
 */
export function populateMinimalData() {
  console.log('📊 Populating minimal test data...');

  updateMarks({
    math: 70,
    science: 65
  });

  recordStudySession('math', 60);
  recordStudySession('science', 45);

  updateAttendance(80);
  updateAssignmentCompletion(85);

  updateWeakTopics('math', ['algebra']);
  updateWeakTopics('science', ['physics']);

  console.log('✅ Minimal data populated!');
  return getStudentProfile();
}

/**
 * Populates data for a high-performing student
 */
export function populateHighPerformerData() {
  console.log('📊 Populating high performer data...');

  updateMarks({
    math: 92,
    science: 88,
    english: 95,
    history: 85,
    geography: 90
  });

  recordStudySession('math', 180);
  recordStudySession('science', 150);
  recordStudySession('english', 120);
  recordStudySession('history', 90);
  recordStudySession('geography', 100);

  recordFocus(90);
  recordFocus(75);
  recordFocus(60);

  updateAttendance(95);
  updateAssignmentCompletion(98);

  updateWeakTopics('math', ['advanced calculus']);
  updateWeakTopics('science', ['quantum physics']);

  console.log('✅ High performer data populated!');
  return getStudentProfile();
}

/**
 * Populates data for a struggling student
 */
export function populateStrugglingStudentData() {
  console.log('📊 Populating struggling student data...');

  updateMarks({
    math: 42,
    science: 48,
    english: 55,
    history: 38,
    geography: 50
  });

  recordStudySession('math', 30);
  recordStudySession('science', 25);
  recordStudySession('english', 40);
  recordStudySession('history', 20);

  recordFocus(15);
  recordFocus(20);

  updateAttendance(65);
  updateAssignmentCompletion(55);

  updateWeakTopics('math', ['algebra', 'geometry', 'trigonometry', 'calculus']);
  updateWeakTopics('science', ['physics', 'chemistry', 'biology']);
  updateWeakTopics('history', ['ancient history', 'modern history', 'world wars']);
  updateWeakTopics('english', ['grammar', 'comprehension', 'writing']);

  console.log('✅ Struggling student data populated!');
  return getStudentProfile();
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.populateSampleData = populateSampleData;
  window.populateMinimalData = populateMinimalData;
  window.populateHighPerformerData = populateHighPerformerData;
  window.populateStrugglingStudentData = populateStrugglingStudentData;
  window.getStudentProfile = getStudentProfile;
  window.getStats = getStats;
}
