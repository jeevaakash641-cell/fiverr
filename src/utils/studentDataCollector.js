/**
 * Student Data Collector Utility
 * Tracks study behavior and maintains student profile for AI Study Twin
 * All data is stored in-memory (no backend calls)
 */

// In-memory student profile storage
let studentProfile = {
  current_marks: {},
  study_time_hours: {},
  attendance_percent: 0,
  assignment_completion: 0,
  weak_topics: {},
  // Additional tracking data
  _metadata: {
    total_study_sessions: 0,
    total_focus_minutes: 0,
    content_usage: {
      videos: [],
      books: []
    },
    last_updated: null
  }
};

/**
 * Records a study session for a specific subject
 * 
 * @param {string} subject - Subject name (e.g., "math", "science", "english")
 * @param {number} minutes - Duration of study session in minutes
 * @returns {Object} Updated study time for the subject
 * 
 * @example
 * recordStudySession("math", 45);
 * // Updates study_time_hours.math by adding 0.75 hours
 */
export function recordStudySession(subject, minutes) {
  if (!subject || typeof minutes !== 'number' || minutes <= 0) {
    console.warn('⚠️ Invalid study session data:', { subject, minutes });
    return null;
  }

  const hours = minutes / 60;
  
  // Initialize subject if not exists
  if (!studentProfile.study_time_hours[subject]) {
    studentProfile.study_time_hours[subject] = 0;
  }
  
  // Add study time
  studentProfile.study_time_hours[subject] += hours;
  studentProfile._metadata.total_study_sessions += 1;
  studentProfile._metadata.last_updated = new Date().toISOString();
  
  console.log(`📚 Study session recorded: ${subject} - ${minutes} minutes (${hours.toFixed(2)} hours)`);
  
  return {
    subject,
    session_minutes: minutes,
    total_hours: studentProfile.study_time_hours[subject]
  };
}

/**
 * Records focus duration (deep focus time without distractions)
 * 
 * @param {number} minutes - Duration of focused study in minutes
 * @returns {Object} Total focus time tracked
 * 
 * @example
 * recordFocus(30);
 * // Adds 30 minutes to total focus time
 */
export function recordFocus(minutes) {
  if (typeof minutes !== 'number' || minutes <= 0) {
    console.warn('⚠️ Invalid focus duration:', minutes);
    return null;
  }
  
  studentProfile._metadata.total_focus_minutes += minutes;
  studentProfile._metadata.last_updated = new Date().toISOString();
  
  console.log(`🎯 Focus time recorded: ${minutes} minutes (Total: ${studentProfile._metadata.total_focus_minutes})`);
  
  return {
    session_minutes: minutes,
    total_focus_minutes: studentProfile._metadata.total_focus_minutes
  };
}

/**
 * Records content usage (videos or books accessed)
 * 
 * @param {string} type - Content type: "video" or "book"
 * @param {string} id - Unique identifier of the content
 * @param {Object} metadata - Optional metadata (title, subject, duration, etc.)
 * @returns {Object} Updated content usage stats
 * 
 * @example
 * recordContentUsage("video", "physics-101", { title: "Newton's Laws", subject: "physics" });
 * recordContentUsage("book", "math-textbook-ch5", { title: "Algebra Chapter 5", subject: "math" });
 */
export function recordContentUsage(type, id, metadata = {}) {
  if (!type || !id) {
    console.warn('⚠️ Invalid content usage data:', { type, id });
    return null;
  }
  
  const normalizedType = type.toLowerCase();
  const contentType = normalizedType === 'video' ? 'videos' : 'books';
  
  if (!studentProfile._metadata.content_usage[contentType]) {
    studentProfile._metadata.content_usage[contentType] = [];
  }
  
  const usageRecord = {
    id,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  studentProfile._metadata.content_usage[contentType].push(usageRecord);
  studentProfile._metadata.last_updated = new Date().toISOString();
  
  console.log(`📖 Content usage recorded: ${type} - ${id}`);
  
  return {
    type: contentType,
    id,
    total_count: studentProfile._metadata.content_usage[contentType].length
  };
}

/**
 * Gets the current student profile in AI Study Twin compatible format
 * 
 * @param {boolean} includeMetadata - Whether to include tracking metadata (default: false)
 * @returns {Object} Student profile object
 * 
 * @example
 * const profile = getStudentProfile();
 * // Returns: { current_marks: {...}, study_time_hours: {...}, ... }
 * 
 * const profileWithMeta = getStudentProfile(true);
 * // Returns profile with _metadata included
 */
export function getStudentProfile(includeMetadata = false) {
  if (includeMetadata) {
    return { ...studentProfile };
  }
  
  // Return only AI Study Twin compatible fields
  return {
    current_marks: { ...studentProfile.current_marks },
    study_time_hours: { ...studentProfile.study_time_hours },
    attendance_percent: studentProfile.attendance_percent,
    assignment_completion: studentProfile.assignment_completion,
    weak_topics: { ...studentProfile.weak_topics }
  };
}

/**
 * Updates current marks for subjects
 * 
 * @param {Object} marks - Object with subject-score pairs (e.g., {math: 75, science: 82})
 * @returns {Object} Updated marks
 * 
 * @example
 * updateMarks({ math: 75, science: 82, english: 88 });
 */
export function updateMarks(marks) {
  if (!marks || typeof marks !== 'object') {
    console.warn('⚠️ Invalid marks data:', marks);
    return null;
  }
  
  studentProfile.current_marks = { ...studentProfile.current_marks, ...marks };
  studentProfile._metadata.last_updated = new Date().toISOString();
  
  console.log('📊 Marks updated:', marks);
  
  return { ...studentProfile.current_marks };
}

/**
 * Updates attendance percentage
 * 
 * @param {number} percent - Attendance percentage (0-100)
 * @returns {number} Updated attendance
 * 
 * @example
 * updateAttendance(85);
 */
export function updateAttendance(percent) {
  if (typeof percent !== 'number' || percent < 0 || percent > 100) {
    console.warn('⚠️ Invalid attendance percentage:', percent);
    return null;
  }
  
  studentProfile.attendance_percent = percent;
  studentProfile._metadata.last_updated = new Date().toISOString();
  
  console.log('📅 Attendance updated:', percent);
  
  return studentProfile.attendance_percent;
}

/**
 * Updates assignment completion percentage
 * 
 * @param {number} percent - Assignment completion percentage (0-100)
 * @returns {number} Updated completion rate
 * 
 * @example
 * updateAssignmentCompletion(90);
 */
export function updateAssignmentCompletion(percent) {
  if (typeof percent !== 'number' || percent < 0 || percent > 100) {
    console.warn('⚠️ Invalid assignment completion percentage:', percent);
    return null;
  }
  
  studentProfile.assignment_completion = percent;
  studentProfile._metadata.last_updated = new Date().toISOString();
  
  console.log('✅ Assignment completion updated:', percent);
  
  return studentProfile.assignment_completion;
}

/**
 * Updates weak topics for subjects
 * 
 * @param {string} subject - Subject name
 * @param {Array<string>} topics - Array of weak topic names
 * @returns {Object} Updated weak topics
 * 
 * @example
 * updateWeakTopics("math", ["algebra", "geometry"]);
 * updateWeakTopics("science", ["chemical equations"]);
 */
export function updateWeakTopics(subject, topics) {
  if (!subject || !Array.isArray(topics)) {
    console.warn('⚠️ Invalid weak topics data:', { subject, topics });
    return null;
  }
  
  studentProfile.weak_topics[subject] = topics;
  studentProfile._metadata.last_updated = new Date().toISOString();
  
  console.log(`📝 Weak topics updated for ${subject}:`, topics);
  
  return { ...studentProfile.weak_topics };
}

/**
 * Resets the student profile to initial state
 * 
 * @returns {Object} Reset profile
 * 
 * @example
 * resetProfile();
 */
export function resetProfile() {
  studentProfile = {
    current_marks: {},
    study_time_hours: {},
    attendance_percent: 0,
    assignment_completion: 0,
    weak_topics: {},
    _metadata: {
      total_study_sessions: 0,
      total_focus_minutes: 0,
      content_usage: {
        videos: [],
        books: []
      },
      last_updated: null
    }
  };
  
  console.log('🔄 Student profile reset');
  
  return getStudentProfile();
}

/**
 * Gets summary statistics from tracked data
 * 
 * @returns {Object} Summary statistics
 * 
 * @example
 * const stats = getStats();
 * // Returns: { total_study_hours: 15.5, subjects_tracked: 3, ... }
 */
export function getStats() {
  const totalStudyHours = Object.values(studentProfile.study_time_hours)
    .reduce((sum, hours) => sum + hours, 0);
  
  const subjectsTracked = Object.keys(studentProfile.study_time_hours).length;
  
  const totalContentUsed = 
    studentProfile._metadata.content_usage.videos.length +
    studentProfile._metadata.content_usage.books.length;
  
  return {
    total_study_hours: parseFloat(totalStudyHours.toFixed(2)),
    subjects_tracked: subjectsTracked,
    total_study_sessions: studentProfile._metadata.total_study_sessions,
    total_focus_minutes: studentProfile._metadata.total_focus_minutes,
    total_content_used: totalContentUsed,
    videos_watched: studentProfile._metadata.content_usage.videos.length,
    books_accessed: studentProfile._metadata.content_usage.books.length,
    last_updated: studentProfile._metadata.last_updated
  };
}

/**
 * Exports student profile as JSON string (for storage/sharing)
 * 
 * @returns {string} JSON string of profile
 * 
 * @example
 * const jsonData = exportProfile();
 * localStorage.setItem('studentProfile', jsonData);
 */
export function exportProfile() {
  return JSON.stringify(studentProfile, null, 2);
}

/**
 * Imports student profile from JSON string
 * 
 * @param {string} jsonData - JSON string of profile
 * @returns {Object} Imported profile
 * 
 * @example
 * const jsonData = localStorage.getItem('studentProfile');
 * importProfile(jsonData);
 */
export function importProfile(jsonData) {
  try {
    const imported = JSON.parse(jsonData);
    studentProfile = imported;
    console.log('📥 Profile imported successfully');
    return getStudentProfile();
  } catch (error) {
    console.error('❌ Failed to import profile:', error);
    return null;
  }
}
