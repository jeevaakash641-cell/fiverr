/**
 * Learner Dashboard Frontend API Service
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

/**
 * Fetch unified authoritative learner dashboard summary
 */
export async function fetchLearnerDashboardSummary(user = null) {
  const headers = await getAuthHeaders(user);
  const res = await fetch(`${API_BASE_URL}/api/learner-dashboard/summary`, {
    method: 'GET',
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Failed to load dashboard summary (${res.status})`);
    }
    return data;
  }

  const text = await res.text();
  throw new Error(text.substring(0, 160) || `Server returned error ${res.status}`);
}
