/**
 * Certificate of Completion Frontend Service
 * One Community Ely Online Training Centre
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

const getAuthHeaders = async (user = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (user?.idToken || user?.token) {
    headers['Authorization'] = `Bearer ${user.idToken || user.token}`;
    return headers;
  }
  const token = await getFirebaseIdToken(user);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
 * Learner: Check certificate eligibility for a course
 */
export async function fetchCourseCertificateEligibility(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/certificates/course/${courseId}/eligibility`, {
    method: 'GET',
    headers
  });
}

/**
 * Learner: Issue certificate of completion (idempotent)
 */
export async function issueCourseCertificate(courseId, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/certificates/course/${courseId}/issue`, {
    method: 'POST',
    headers
  });
}

/**
 * Learner: List all certificates issued to authenticated learner
 */
export async function fetchMyCertificates(user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/certificates/my-certificates`, {
    method: 'GET',
    headers
  });
  return result.certificates || [];
}

/**
 * Learner / Admin: Fetch single certificate metadata
 */
export async function fetchCertificateById(certificateId, user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/certificates/${certificateId}`, {
    method: 'GET',
    headers
  });
  return result.certificate;
}

/**
 * Download Certificate PDF
 */
export async function downloadCertificatePdf(certificateId, customFileName = 'Certificate', user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/certificates/${certificateId}/download`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to download certificate (${res.status})`);
  }

  // Extract filename from Content-Disposition header if available
  let finalFileName = `${customFileName}.pdf`;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename*=')) {
    try {
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (match && match[1]) {
        finalFileName = decodeURIComponent(match[1]);
      }
    } catch {}
  } else if (disposition && disposition.includes('filename=')) {
    try {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        finalFileName = match[1];
      }
    } catch {}
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = finalFileName.endsWith('.pdf') ? finalFileName : `${finalFileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Fetch active certificate template
 */
export async function fetchCertificateTemplate(user = null) {
  const headers = await getAuthHeaders(user);
  const result = await safeFetchJson(`${API_BASE_URL}/api/certificates/template`, {
    method: 'GET',
    headers
  });
  return result.template || null;
}

/**
 * Admin: Upload certificate demo/template file
 */
export async function uploadCertificateTemplate(file, user = null) {
  const formData = new FormData();
  formData.append('templateFile', file);

  const authHeaders = await getAuthHeaders(user);
  delete authHeaders['Content-Type'];

  const res = await fetch(`${API_BASE_URL}/api/certificates/template/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload certificate template');
  }
  return data;
}

/**
 * Admin: Reset certificate template to default
 */
export async function resetCertificateTemplate(user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/certificates/template`, {
    method: 'DELETE',
    headers
  });
}

/**
 * Admin: List all certificates with filters
 */
export async function fetchAdminCertificates(params = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = new URLSearchParams();
  if (params.courseId && params.courseId !== 'all') query.append('courseId', params.courseId);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const result = await safeFetchJson(`${API_BASE_URL}/api/certificates/admin${qs}`, {
    method: 'GET',
    headers
  });
  return result.certificates || [];
}

/**
 * Admin: Revoke certificate
 */
export async function revokeAdminCertificate(certificateId, reason, user = null) {
  const headers = await getAuthHeaders(user);
  return await safeFetchJson(`${API_BASE_URL}/api/certificates/admin/${certificateId}/revoke`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ reason })
  });
}

/**
 * Public: Verify certificate by certificate number (Unauthenticated)
 */
export async function verifyCertificatePublic(certificateNumber) {
  return await safeFetchJson(`${API_BASE_URL}/api/certificates/verify/${encodeURIComponent(certificateNumber)}`, {
    method: 'GET'
  });
}
