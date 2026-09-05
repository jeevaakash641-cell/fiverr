/**
 * User DB Service
 * Syncs user data with DynamoDB backend.
 * localStorage is used as a fast local cache.
 */
import { API_BASE_URL } from '../config.js';

const BASE = `${API_BASE_URL}/api/users`;

const getAuthHeaders = () => {
  try {
    const token = localStorage.getItem('edulearn_id_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/** Save/update user in DynamoDB (fire and forget — never blocks UI) */
export const syncUserToDb = async (user) => {
  if (!user?.email) return;
  try {
    await fetch(BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(user),
    });
  } catch (err) {
    console.warn('User sync to DB failed (non-fatal):', err.message);
  }
};

/** Fetch user from DynamoDB by email */
export const fetchUserFromDb = async (email) => {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(email)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
};

/** Update specific fields on a user in DynamoDB */
export const updateUserInDb = async (email, updates) => {
  if (!email) return;
  try {
    await fetch(`${BASE}/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.warn('User update to DB failed (non-fatal):', err.message);
  }
};

/** Delete user from DynamoDB */
export const deleteUserFromDb = async (email) => {
  try {
    await fetch(`${BASE}/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return true;
  } catch {
    return false;
  }
};

/** Delete all learners from DynamoDB */
export const deleteAllLearnersFromDb = async () => {
  try {
    const res = await fetch(`${BASE}/learners/all`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete learners from database');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Delete all learners DB failed:', err.message);
    throw err;
  }
};

/** Fetch all users from DynamoDB (for Admin Panel) */
export const fetchAllUsersFromDb = async () => {
  try {
    const res = await fetch(BASE, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch {
    return [];
  }
};
