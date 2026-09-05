/**
 * Baseline Assessment Frontend Service — One Community Ely Online Training Centre
 * Communicates with /api/baseline-assessments using Firebase Bearer tokens.
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

/**
 * Obtain verified Authorization Bearer header
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
 * Admin: Fetch all assessments
 */
export async function fetchAdminAssessments(params = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = new URLSearchParams();
  if (params.courseId && params.courseId !== 'all') query.append('courseId', params.courseId);
  if (params.status && params.status !== 'all') query.append('status', params.status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/admin${qs}`, {
    method: 'GET',
    headers
  });
  return result.assessments || [];
}

/**
 * Admin: Create a new baseline assessment
 */
export async function createAssessment(payload, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return result.assessment;
}

/**
 * Admin: Update assessment configuration
 */
export async function updateAssessment(assessmentId, payload, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/${assessmentId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  return result.assessment;
}

/**
 * Admin: Update assessment status (draft, published, unpublished, archived)
 */
export async function updateAssessmentStatus(assessmentId, status, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/${assessmentId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });
  return result.assessment;
}

/**
 * Admin: Archive/Delete assessment
 */
export async function deleteAssessment(assessmentId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/${assessmentId}`, {
    method: 'DELETE',
    headers
  });
  return result.assessment;
}

/**
 * Admin: Fetch responses for an assessment
 */
export async function fetchAssessmentResponsesAdmin(assessmentId, params = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/admin/${assessmentId}/responses${qs}`, {
    method: 'GET',
    headers
  });
  return result.responses || [];
}

/**
 * Learner/General: Check baseline completion status for a course
 */
export async function fetchCourseBaselineStatus(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/course/${courseId}/status`, {
    method: 'GET',
    headers
  });
}

/**
 * Learner: Fetch active published baseline assessment for a course
 */
export async function fetchCourseBaselineAssessment(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/course/${courseId}`, {
    method: 'GET',
    headers
  });
  return result.assessment;
}

/**
 * Fetch assessment by ID
 */
export async function fetchAssessmentById(assessmentId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/${assessmentId}`, {
    method: 'GET',
    headers
  });
  return result.assessment;
}

/**
 * Learner: Submit baseline assessment answers
 */
export async function submitBaselineResponse(assessmentId, answers, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/baseline-assessments/${assessmentId}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answers })
  });
}
