/**
 * Frontend Recommendation & Course Selection Service
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

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
  if (user?.email) {
    headers['x-user-email'] = user.email;
  }
  return headers;
};

/**
 * Get course recommendations matching learner's interest
 */
export async function fetchCourseRecommendations(learningInterest = '') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/recommendations/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningInterest })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch recommendations');
    return data;
  } catch (err) {
    console.error('fetchCourseRecommendations error:', err);
    throw err;
  }
}

/**
 * Fetch course overview for a learner
 */
export async function fetchCourseOverview(courseId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}/overview`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Course overview not found');
    return data;
  } catch (err) {
    console.error('fetchCourseOverview error:', err);
    throw err;
  }
}

/**
 * Select a published course
 */
export async function selectCourse(courseId, source = 'recommendation', recommendationReason = '', user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/course-selections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        courseId,
        source,
        recommendationReason
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to select course');
    return data;
  } catch (err) {
    console.error('selectCourse error:', err);
    throw err;
  }
}

/**
 * Fetch all selected courses for the current learner
 */
export async function fetchMyCourseSelections(user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/course-selections/me`, {
      method: 'GET',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load selected courses');
    return data.selections || [];
  } catch (err) {
    console.error('fetchMyCourseSelections error:', err);
    return [];
  }
}

/**
 * Check if the learner already selected a specific course
 */
export async function checkCourseSelection(courseId, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/course-selections/check/${encodeURIComponent(courseId)}`, {
      method: 'GET',
      headers
    });
    const data = await res.json();
    if (!res.ok) return { isSelected: false };
    return data;
  } catch (err) {
    console.error('checkCourseSelection error:', err);
    return { isSelected: false };
  }
}

export default {
  fetchCourseRecommendations,
  fetchCourseOverview,
  selectCourse,
  fetchMyCourseSelections,
  checkCourseSelection
};
