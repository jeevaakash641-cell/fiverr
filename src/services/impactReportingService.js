/**
 * Frontend Impact Reporting Service — One Community Ely Online Training Centre
 * Client for /api/impact-reports endpoints with Firebase Bearer token authentication.
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

/**
 * Format Date to UK format (DD/MM/YYYY)
 */
export function formatUKDate(dateInput) {
  if (!dateInput) return 'Not available';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Not available';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}


/**
 * Build Authorization and JSON headers with Bearer token
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
 * Convert filter object into URLSearchParams string
 */
function buildQueryParams(filters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.courseId && filters.courseId !== 'all') params.append('courseId', filters.courseId);
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.rangePreset) params.append('rangePreset', filters.rangePreset);
  const q = params.toString();
  return q ? `?${q}` : '';
}

/**
 * 1. Fetch Overview Report
 */
export async function fetchOverviewReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/overview${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load overview impact report');
  }
  return data.data;
}

/**
 * 2. Fetch Learner Activity Report
 */
export async function fetchLearnerActivityReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/learners${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load learner activity report');
  }
  return data.data;
}

/**
 * 3. Fetch Course Performance Report
 */
export async function fetchCoursePerformanceReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/courses${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load course performance report');
  }
  return data.data;
}

/**
 * 4. Fetch Quiz Results Report
 */
export async function fetchQuizResultsReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/quizzes${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load quiz results report');
  }
  return data.data;
}

/**
 * 5. Fetch Before-vs-After Outcomes Report
 */
export async function fetchOutcomesReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/outcomes${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load outcomes report');
  }
  return data.data;
}

/**
 * 6. Fetch Beneficiary Feedback Report
 */
export async function fetchFeedbackReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/feedback${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load beneficiary feedback report');
  }
  return data.data;
}

/**
 * 7. Fetch Certificates Report
 */
export async function fetchCertificatesReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/certificates${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load certificates report');
  }
  return data.data;
}

/**
 * 8. Fetch Evidence Library Report
 */
export async function fetchEvidenceReport(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/evidence${query}`, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load evidence report');
  }
  return data.data;
}

/**
 * 9. Download CSV Export
 */
export async function downloadCsvReport(type, filters = {}, user = null) {
  const token = await getFirebaseIdToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (user?.idToken || user?.token) {
    headers['Authorization'] = `Bearer ${user.idToken || user.token}`;
  }

  const query = buildQueryParams({ ...filters, type });
  const res = await fetch(`${API_BASE_URL}/api/impact-reports/export/csv${query}`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    let errMsg = 'Failed to generate CSV export';
    try {
      const errJson = await res.json();
      if (errJson?.error) errMsg = errJson.error;
    } catch {}
    throw new Error(errMsg);
  }

  const blob = await res.blob();
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `one_community_ely_${type}_report_${timestamp}.csv`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default {
  fetchOverviewReport,
  fetchLearnerActivityReport,
  fetchCoursePerformanceReport,
  fetchQuizResultsReport,
  fetchOutcomesReport,
  fetchFeedbackReport,
  fetchCertificatesReport,
  downloadCsvReport
};
