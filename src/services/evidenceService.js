/**
 * Evidence Library Service — One Community Ely Online Training Centre
 * Client for /api/evidence endpoints with Bearer token authentication.
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

export const EVIDENCE_CATEGORIES = [
  'Training',
  'Community Event',
  'Podcast',
  'Workshop',
  'Volunteering',
  'Outreach',
  'Partnership',
  'Other'
];

export const EVIDENCE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published / Internal' },
  { value: 'archived', label: 'Archived' }
];

export const CONSENT_STATUS_OPTIONS = [
  { value: 'No public-use permission', label: 'No public-use permission (Internal only)' },
  { value: 'Anonymous use permitted', label: 'Anonymous use permitted (Name withheld)' },
  { value: 'Named use permitted', label: 'Named use permitted (Full consent)' },
  { value: 'Consent withdrawn', label: 'Consent withdrawn (Must not use)' }
];

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
 * Build Authorization headers with Firebase ID Bearer token
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
  if (filters.source && filters.source !== 'all') params.append('source', filters.source);
  if (filters.search) params.append('search', filters.search.trim());
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  const q = params.toString();
  return q ? `?${q}` : '';
}

/**
 * 1. Fetch paginated list of evidence records
 */
export async function fetchEvidenceList(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/evidence${query}`, {
    method: 'GET',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch evidence records (${res.status})`);
  }
  return data;
}

/**
 * 2. Fetch single evidence record by ID
 */
export async function fetchEvidenceById(evidenceId, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/${evidenceId}`, {
    method: 'GET',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch evidence record (${res.status})`);
  }
  return data.evidence;
}

/**
 * 3. Create a new evidence record
 */
export async function createEvidence(payload, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to create evidence record (${res.status})`);
  }
  return data.evidence;
}

/**
 * 4. Update an evidence record with optimistic locking
 */
export async function updateEvidence(evidenceId, payload, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/${evidenceId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const err = new Error(data.error || `Failed to update evidence record (${res.status})`);
    err.statusCode = res.status;
    throw err;
  }
  return data.evidence;
}

/**
 * 5. Update evidence status (archive, restore, publish, draft)
 */
export async function updateEvidenceStatus(evidenceId, status, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/${evidenceId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to update evidence status (${res.status})`);
  }
  return data.evidence;
}

/**
 * 6. Permanently delete an evidence record
 */
export async function deleteEvidence(evidenceId, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/${evidenceId}`, {
    method: 'DELETE',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to delete evidence record (${res.status})`);
  }
  return data;
}

/**
 * 7. Upload attachment to evidence record
 */
export async function uploadEvidenceAttachment(evidenceId, file, description = '', user = null) {
  const token = user?.idToken || user?.token || await getFirebaseIdToken(user);
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/evidence/${evidenceId}/attachments`, {
    method: 'POST',
    headers,
    body: formData
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to upload attachment (${res.status})`);
  }
  return data.attachment;
}

/**
 * 8. Remove attachment from evidence record
 */
export async function deleteEvidenceAttachment(evidenceId, attachmentId, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/${evidenceId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to remove attachment (${res.status})`);
  }
  return data;
}

/**
 * 9. Download attachment
 */
export async function downloadEvidenceAttachment(evidenceId, attachmentId, filename = 'attachment', user = null) {
  const token = user?.idToken || user?.token || await getFirebaseIdToken(user);
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/evidence/${evidenceId}/attachments/${attachmentId}/download`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to download attachment (${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * ==========================================
 * AUTOMATIC EVIDENCE CLIENT METHODS
 * ==========================================
 */

/**
 * 10. Generate and recalculate all automatic evidence from platform activity
 */
export async function generateAutomaticEvidence(options = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/automatic/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(options)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to generate automatic evidence (${res.status})`);
  }
  return data;
}

/**
 * 11. Refresh single or all automatic evidence records
 */
export async function refreshAutomaticEvidence(evidenceId = null, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/automatic/refresh`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ evidenceId })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to refresh automatic evidence (${res.status})`);
  }
  return data;
}

/**
 * 12. Fetch paginated list of automatic evidence records
 */
export async function fetchAutomaticEvidenceList(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams({ ...filters, source: 'automatic' });
  const res = await fetch(`${API_BASE_URL}/api/evidence/automatic${query}`, {
    method: 'GET',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch automatic evidence (${res.status})`);
  }
  return data;
}

/**
 * 13. Fetch single automatic evidence record by ID
 */
export async function fetchAutomaticEvidenceById(evidenceId, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/automatic/${evidenceId}`, {
    method: 'GET',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch automatic evidence record (${res.status})`);
  }
  return data.evidence;
}

/**
 * 14. Admin review: update notes, outcome summary, status, attachments on automatic evidence
 */
export async function updateAutomaticEvidenceNotes(evidenceId, updateData, user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/evidence/automatic/${evidenceId}/notes`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateData)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to update automatic evidence notes (${res.status})`);
  }
  return data.evidence;
}

/**
 * 15. Download CSV export for an automatic evidence record
 */
export async function downloadAutomaticEvidenceExport(evidenceId, filename = null, user = null) {
  const token = user?.idToken || user?.token || await getFirebaseIdToken(user);
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/evidence/automatic/${evidenceId}/export`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to download automatic evidence export (${res.status})`);
  }

  const blob = await res.blob();
  const downloadName = filename || `automatic-evidence-${evidenceId}.csv`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * 16. Fetch paginated list of manual community evidence records
 */
export async function fetchManualEvidenceList(filters = {}, user = null) {
  const headers = await getAuthHeaders(user);
  const query = buildQueryParams({ ...filters, source: 'manual' });
  const res = await fetch(`${API_BASE_URL}/api/evidence/manual${query}`, {
    method: 'GET',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch manual evidence (${res.status})`);
  }
  return data;
}

