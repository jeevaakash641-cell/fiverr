/**
 * Help Topics Service — Frontend API Client
 * Manages "What would you most like help with?" topics for learners and admin
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

const getAuthHeaders = async (user = null) => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (user?.idToken || user?.token) {
      headers['Authorization'] = `Bearer ${user.idToken || user.token}`;
    }
  } catch {}
  if (user?.email) {
    headers['x-user-email'] = user.email;
  }
  return headers;
};

export const DEFAULT_FALLBACK_TOPICS = [
  { topicId: 'topic_money_mgmt', label: 'Managing my money', category: 'Money Management', isActive: true, orderIndex: 0, description: 'Budgeting, banking, debt awareness, financial resilience, and savings' },
  { topicId: 'topic_work_prep', label: 'Finding/preparing for work', category: 'Employment and Personal Development', isActive: true, orderIndex: 1, description: 'CV writing, interview prep, job applications, confidence, workplace skills' },
  { topicId: 'topic_digital_skills', label: 'Improving my digital skills', category: 'Digital Skills', isActive: true, orderIndex: 2, description: 'Using computers, internet safety, email, office software, everyday technology' },
  { topicId: 'topic_ai_learning', label: 'Learning how to use AI', category: 'Artificial Intelligence', isActive: true, orderIndex: 3, description: 'Practical artificial intelligence, ChatGPT, Bedrock, prompting, AI tools for daily tasks' },
  { topicId: 'topic_communication', label: 'Improving communication/confidence', category: 'Communication and Confidence', isActive: true, orderIndex: 4, description: 'Speaking up, assertive communication, active listening, personal presentation' },
  { topicId: 'topic_podcasting', label: 'Learning podcasting/digital media', category: 'Podcasting and Digital Media', isActive: true, orderIndex: 5, description: 'Audio recording, editing, digital media production, storytelling, broadcasting' },
  { topicId: 'topic_small_business', label: 'Starting a small business', category: 'Small Business', isActive: true, orderIndex: 6, description: 'Entrepreneurship, enterprise planning, marketing, customer service, startup fundamentals' },
  { topicId: 'topic_life_skills', label: 'Developing everyday life skills', category: 'Everyday Life Skills', isActive: true, orderIndex: 7, description: 'Time management, problem solving, household administration, personal wellbeing' },
  { topicId: 'topic_something_else', label: 'Something else', category: 'Other', isActive: true, orderIndex: 8, description: 'Custom learning goals and personalized course inquiries' }
];

/**
 * Fetch active help topics for learners dropdown
 */
export async function fetchHelpTopics() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/help-topics`);
    const data = await res.json();
    if (res.ok && Array.isArray(data.topics) && data.topics.length > 0) {
      return data.topics;
    }
    return DEFAULT_FALLBACK_TOPICS;
  } catch (err) {
    console.warn('fetchHelpTopics error (using fallback):', err.message);
    return DEFAULT_FALLBACK_TOPICS;
  }
}

/**
 * Fetch all help topics for Admin Portal management (Admin only)
 */
export async function fetchAdminHelpTopics(user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/help-topics/admin`, {
      method: 'GET',
      headers
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.topics) && data.topics.length > 0) {
      return data.topics;
    }
    // If empty or unauthorized, provide the default topics fallback
    return DEFAULT_FALLBACK_TOPICS;
  } catch (err) {
    console.warn('fetchAdminHelpTopics error (falling back to default topics):', err.message);
    return DEFAULT_FALLBACK_TOPICS;
  }
}

/**
 * Create a new help topic (Admin only)
 */
export async function createHelpTopic(topicData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/help-topics`, {
      method: 'POST',
      headers,
      body: JSON.stringify(topicData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create help topic');
    return data.topic;
  } catch (err) {
    console.error('createHelpTopic error:', err);
    throw err;
  }
}

/**
 * Update an existing help topic (Admin only)
 */
export async function updateHelpTopic(topicId, topicData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/help-topics/${encodeURIComponent(topicId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(topicData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update help topic');
    return data.topic;
  } catch (err) {
    console.error('updateHelpTopic error:', err);
    throw err;
  }
}

/**
 * Delete a help topic (Admin only)
 */
export async function deleteHelpTopic(topicId, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/help-topics/${encodeURIComponent(topicId)}`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete help topic');
    return data.topic;
  } catch (err) {
    console.error('deleteHelpTopic error:', err);
    throw err;
  }
}

/**
 * Delete all help topics (Admin only)
 */
export async function deleteAllHelpTopics(user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/help-topics/all`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete all help topics');
    return data;
  } catch (err) {
    console.error('deleteAllHelpTopics error:', err);
    throw err;
  }
}

/**
 * Reset help topics to defaults (Admin only)
 */
export async function resetDefaultHelpTopics(user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/help-topics/reset-defaults`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset help topics');
    return data.topics || [];
  } catch (err) {
    console.error('resetDefaultHelpTopics error:', err);
    throw err;
  }
}

export default {
  DEFAULT_FALLBACK_TOPICS,
  fetchHelpTopics,
  fetchAdminHelpTopics,
  createHelpTopic,
  updateHelpTopic,
  deleteHelpTopic,
  deleteAllHelpTopics,
  resetDefaultHelpTopics
};
