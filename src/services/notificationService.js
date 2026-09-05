/**
 * Frontend Notification Service — One Community Ely Online Training Centre
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
 * Fetch all notifications for the authenticated learner
 */
export async function fetchMyNotifications(user = null, unreadOnly = false) {
  const qs = unreadOnly ? '?unread=true' : '';
  const url = `${API_BASE_URL}/api/notifications${qs}`;
  const authHeaders = await getAuthHeaders(user);

  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to fetch notifications (${res.status})`);
  }

  return res.json();
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId, user = null) {
  const url = `${API_BASE_URL}/api/notifications/${notificationId}/read`;
  const authHeaders = await getAuthHeaders(user);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to mark notification as read');
  }

  return res.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(user = null) {
  const url = `${API_BASE_URL}/api/notifications/read-all`;
  const authHeaders = await getAuthHeaders(user);

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to mark all notifications as read');
  }

  return res.json();
}
