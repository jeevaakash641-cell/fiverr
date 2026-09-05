/**
 * After Assessment & Outcome Comparison Frontend Service
 * One Community Ely Online Training Centre
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
 * Admin: Fetch all After Assessments
 */
export async function fetchAdminAfterAssessments(params = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = new URLSearchParams();
  if (params.courseId && params.courseId !== 'all') query.append('courseId', params.courseId);
  if (params.status && params.status !== 'all') query.append('status', params.status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/admin${qs}`, {
    method: 'GET',
    headers
  });
  return result.assessments || [];
}

/**
 * Admin: Create a new After Assessment
 */
export async function createAfterAssessment(payload, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return result.assessment;
}

/**
 * Admin: 1-Click Draft from Baseline Assessment
 */
export async function createDraftFromBaseline(baselineAssessmentId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/from-baseline/${baselineAssessmentId}`, {
    method: 'POST',
    headers
  });
  return result.assessment;
}

/**
 * Admin: Update After Assessment configuration
 */
export async function updateAfterAssessment(assessmentId, payload, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/${assessmentId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  return result.assessment;
}

/**
 * Admin: Update status (draft, published, unpublished, archived)
 */
export async function updateAfterAssessmentStatus(assessmentId, status, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/${assessmentId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });
  return result.assessment;
}

/**
 * Admin: Archive After Assessment
 */
export async function deleteAfterAssessment(assessmentId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/${assessmentId}`, {
    method: 'DELETE',
    headers
  });
  return result.assessment;
}

/**
 * Admin: Fetch learner submissions and outcome comparisons
 */
export async function fetchAfterAssessmentResponsesAdmin(assessmentId, params = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/admin/${assessmentId}/responses${qs}`, {
    method: 'GET',
    headers
  });
  return result.responses || [];
}

/**
 * Learner: Check eligibility for course After Assessment
 */
export async function fetchCourseAfterEligibility(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/after-assessments/course/${courseId}/eligibility`, {
    method: 'GET',
    headers
  });
}

/**
 * Learner: Fetch active published After Assessment for course
 */
export async function fetchCourseAfterAssessment(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/course/${courseId}`, {
    method: 'GET',
    headers
  });
  return result.assessment;
}

/**
 * Fetch After Assessment by ID
 */
export async function fetchAfterAssessmentById(assessmentId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/${assessmentId}`, {
    method: 'GET',
    headers
  });
  return result.assessment;
}

/**
 * Learner: Submit After Assessment answers & generate comparison
 */
export async function submitAfterResponse(assessmentId, answers, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/after-assessments/${assessmentId}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answers })
  });
}

/**
 * Learner: Retrieve own outcome comparison for a course
 */
export async function fetchCourseOutcomeResult(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/after-assessments/course/${courseId}/my-result`, {
    method: 'GET',
    headers
  });
  return result.result;
}
