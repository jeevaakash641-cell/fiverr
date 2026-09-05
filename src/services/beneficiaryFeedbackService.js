/**
 * Beneficiary Feedback & Testimonial Consent Frontend Service
 * One Community Ely Online Training Centre
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
 * Learner: Check feedback status & eligibility
 */
export async function fetchCourseFeedbackStatus(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/course/${courseId}/status`, {
    method: 'GET',
    headers
  });
}

/**
 * Learner: Get feedback form questions and options
 */
export async function fetchCourseFeedbackForm(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/course/${courseId}/form`, {
    method: 'GET',
    headers
  });
}

/**
 * Learner: Submit feedback
 */
export async function submitCourseFeedback(courseId, payload, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/course/${courseId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
}

/**
 * Learner: Fetch own submitted feedback
 */
export async function fetchMyCourseFeedback(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/course/${courseId}/my-feedback`, {
    method: 'GET',
    headers
  });
  return result.feedback;
}

/**
 * Admin: List all feedback with filters
 */
export async function fetchAdminFeedbackList(params = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = new URLSearchParams();
  if (params.courseId && params.courseId !== 'all') query.append('courseId', params.courseId);
  if (params.recommendation && params.recommendation !== 'all') query.append('recommendation', params.recommendation);
  if (params.consent && params.consent !== 'all') query.append('consent', params.consent);
  if (params.search) query.append('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/admin${qs}`, {
    method: 'GET',
    headers
  });
  return result.feedback || [];
}

/**
 * Admin: Fetch single feedback
 */
export async function fetchAdminFeedbackItem(feedbackId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/admin/${feedbackId}`, {
    method: 'GET',
    headers
  });
  return result.feedback;
}

/**
 * Admin: Record Testimonial Consent Withdrawal
 */
export async function recordAdminConsentWithdrawal(feedbackId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/admin/${feedbackId}/consent-withdrawal`, {
    method: 'PATCH',
    headers
  });
}

/**
 * Admin: Soft Archive Feedback
 */
export async function archiveAdminFeedback(feedbackId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/beneficiary-feedback/admin/${feedbackId}`, {
    method: 'DELETE',
    headers
  });
}
