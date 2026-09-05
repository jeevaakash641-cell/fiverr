/**
 * Frontend Course Progress & Resume Service
 * Communicates with backend /api/progress endpoints using verified Bearer tokens.
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

/**
 * Obtain verified Authorization Bearer header from Firebase Auth
 */
const getAuthHeaders = async (user = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (user?.idToken || user?.token) {
    headers['Authorization'] = `Bearer ${user.idToken || user.token}`;
  } else {
    const token = await getFirebaseIdToken(user);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

/**
 * Safe JSON fetch wrapper with clear error messages
 */
async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || data.message || `Request failed with status ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text.substring(0, 160) || `Server error (${res.status} ${res.statusText})`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Unexpected response format from server (${res.status})`);
  }
}

/**
 * Start a course for the current learner
 */
export async function startCourse(courseId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/progress/courses/${encodeURIComponent(courseId)}/start`, {
      method: 'POST',
      headers: await getAuthHeaders(user)
    });
    return data.progress;
  } catch (err) {
    console.error('startCourse error:', err);
    throw err;
  }
}

/**
 * Fetch progress for a specific course
 */
export async function fetchCourseProgress(courseId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/progress/courses/${encodeURIComponent(courseId)}`, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data.progress;
  } catch (err) {
    console.error('fetchCourseProgress error:', err);
    throw err;
  }
}

/**
 * Fetch all selected courses and categorized progress for the learner dashboard
 */
export async function fetchMyCoursesProgress(user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/progress/my-courses`, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return {
      inProgress: data.inProgress || [],
      notStarted: data.notStarted || [],
      completed: data.completed || [],
      all: data.all || []
    };
  } catch (err) {
    console.error('fetchMyCoursesProgress error:', err);
    throw err;
  }
}

/**
 * Record that the learner visited/opened a lesson
 */
export async function recordLessonVisit(courseId, lessonId, moduleId = null, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/progress/courses/${encodeURIComponent(courseId)}/visit`, {
      method: 'POST',
      headers: await getAuthHeaders(user),
      body: JSON.stringify({ lessonId, moduleId })
    });
    return data.progress;
  } catch (err) {
    console.error('recordLessonVisit error:', err);
    throw err;
  }
}

/**
 * Mark a lesson complete on backend (validates quizzes & recalculates progress)
 */
export async function completeLesson(courseId, lessonId, user = null) {
  try {
    const data = await safeFetchJson(
      `${API_BASE_URL}/api/progress/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/complete`,
      {
        method: 'POST',
        headers: await getAuthHeaders(user)
      }
    );
    return data;
  } catch (err) {
    console.error('completeLesson error:', err);
    throw err;
  }
}

/**
 * Fetch the exact resume position for "Continue Learning"
 */
export async function fetchCourseResume(courseId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/progress/courses/${encodeURIComponent(courseId)}/resume`, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data;
  } catch (err) {
    console.error('fetchCourseResume error:', err);
    throw err;
  }
}

/**
 * Request authoritative progress recalculation
 */
export async function recalculateCourseProgress(courseId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/progress/courses/${encodeURIComponent(courseId)}/recalculate`, {
      method: 'POST',
      headers: await getAuthHeaders(user)
    });
    return data.calculation;
  } catch (err) {
    console.error('recalculateCourseProgress error:', err);
    throw err;
  }
}

export default {
  startCourse,
  fetchCourseProgress,
  fetchMyCoursesProgress,
  recordLessonVisit,
  completeLesson,
  fetchCourseResume,
  recalculateCourseProgress
};
