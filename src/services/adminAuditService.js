/**
 * Frontend Admin Audit API Service — One Community Ely Online Training Centre
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

/**
 * Helper to build auth headers
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
 * Fetch filtered & paginated admin audit logs
 */
export async function fetchAdminAuditLogs({
  category = 'all',
  adminEmail = 'all',
  result = 'all',
  search = '',
  rangePreset = 'all',
  startDate = '',
  endDate = '',
  sortBy = 'newest',
  page = 1,
  limit = 20,
  user = null
} = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (adminEmail && adminEmail !== 'all') params.set('adminEmail', adminEmail);
  if (result && result !== 'all') params.set('result', result);
  if (search) params.set('search', search);
  if (rangePreset && rangePreset !== 'all') params.set('rangePreset', rangePreset);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (sortBy) params.set('sortBy', sortBy);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  const url = `${API_BASE_URL}/api/admin/audit-logs?${params.toString()}`;
  const authHeaders = await getAuthHeaders(user);
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch admin audit logs (${response.status})`);
  }

  return response.json();
}

/**
 * Fetch summary KPI metrics for Admin Activity History
 */
export async function fetchAdminAuditStats(user = null) {
  const url = `${API_BASE_URL}/api/admin/audit-logs/stats`;
  const authHeaders = await getAuthHeaders(user);
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch audit stats (${response.status})`);
  }

  return response.json();
}

/**
 * Download CSV export of admin audit logs
 */
export async function exportAdminAuditCsv({
  category = 'all',
  adminEmail = 'all',
  result = 'all',
  search = '',
  rangePreset = 'all',
  startDate = '',
  endDate = '',
  user = null
} = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (adminEmail && adminEmail !== 'all') params.set('adminEmail', adminEmail);
  if (result && result !== 'all') params.set('result', result);
  if (search) params.set('search', search);
  if (rangePreset && rangePreset !== 'all') params.set('rangePreset', rangePreset);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const url = `${API_BASE_URL}/api/admin/audit-logs/export-csv?${params.toString()}`;
  const authHeaders = await getAuthHeaders(user);
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to export CSV (${response.status})`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `one_community_ely_admin_audit_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Log client-authorized admin action (e.g., login, logout)
 */
export async function logAdminClientEvent(eventData, user = null) {
  try {
    const url = `${API_BASE_URL}/api/admin/audit-logs/log-event`;
    const authHeaders = await getAuthHeaders(user);
    await fetch(url, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(eventData)
    });
  } catch (err) {
    console.warn('Could not log client admin event:', err);
  }
}
