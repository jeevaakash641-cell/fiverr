/**
 * Content Request Frontend Service — One Community Ely Online Training Centre
 * Handles learner requests for missing/mismatched quizzes & assessments,
 * admin retrieval, status updates, linking existing content, and rejections.
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
 * Learner: Submit a content request (quiz, baseline assessment, or after assessment)
 */
export async function submitContentRequest({ courseId, courseTitle, requestType = 'quiz', moduleId = null, moduleTitle = null, lessonId = null, lessonTitle = null, note = '' }, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/content-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ courseId, courseTitle, requestType, moduleId, moduleTitle, lessonId, lessonTitle, note })
  });
}

/**
 * Learner: Get own submitted content requests
 */
export async function fetchMyContentRequests(courseId = null, user = null) {
  const headers = await getAuthHeaders(user);
  const qs = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/content-requests/my${qs}`, {
    method: 'GET',
    headers
  });
  return result.requests || [];
}

/**
 * Admin: Get all content requests
 */
export async function fetchAdminContentRequests(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = new URLSearchParams();
  if (filters.status && filters.status !== 'all') query.append('status', filters.status);
  if (filters.requestType && filters.requestType !== 'all') query.append('requestType', filters.requestType);
  if (filters.courseId && filters.courseId !== 'all') query.append('courseId', filters.courseId);
  if (filters.search) query.append('search', filters.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/content-requests/admin${qs}`, {
    method: 'GET',
    headers
  });
  return result.requests || [];
}

/**
 * Admin: Link existing content to a request and fulfill it
 */
export async function linkExistingContentToRequest(requestId, contentIdOrPayload, contentTypeOrUser = null, optionalUser = null) {
  let effectiveContentId = contentIdOrPayload;
  let effectiveContentType = contentTypeOrUser;
  let user = optionalUser;

  if (typeof contentIdOrPayload === 'object' && contentIdOrPayload !== null) {
    effectiveContentId = contentIdOrPayload.contentId;
    effectiveContentType = contentIdOrPayload.contentType;
    user = contentTypeOrUser;
  }

  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/content-requests/admin/link-content`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requestId, contentId: effectiveContentId, contentType: effectiveContentType })
  });
}

/**
 * Admin: Reject a content request with reason
 */
export async function rejectAdminContentRequest(requestId, rejectionReason, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/content-requests/admin/${requestId}/reject`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ rejectionReason })
  });
}

/**
 * Admin: Update request status (backwards compatibility)
 */
export async function updateAdminContentRequest(requestId, status, adminNote = '', user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/content-requests/admin/${requestId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status, adminNote })
  });
}
