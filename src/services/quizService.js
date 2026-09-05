import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

/**
 * Obtain verified Authorization Bearer header from Firebase Auth
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
 * Robust JSON fetch wrapper that gracefully handles non-JSON / HTML / Gateway error responses
 */
async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
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

// ==========================================
// ADMIN QUIZ APIS
// ==========================================

/**
 * Fetch all quizzes for Admin with optional filters
 */
export async function fetchAdminQuizzes(filters = {}, user = null) {
  try {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.courseId && filters.courseId !== 'all') params.append('courseId', filters.courseId);
    if (filters.creationMethod && filters.creationMethod !== 'all') params.append('creationMethod', filters.creationMethod);
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

    const url = `${API_BASE_URL}/api/quizzes/admin${params.toString() ? '?' + params.toString() : ''}`;
    const data = await safeFetchJson(url, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data.quizzes || [];
  } catch (err) {
    console.error('fetchAdminQuizzes error:', err);
    throw err;
  }
}

/**
 * Fetch full quiz details (with correct answers & explanations) for Admin editing
 */
export async function fetchAdminQuizById(quizId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/admin/${quizId}`, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data.quiz;
  } catch (err) {
    console.error(`fetchAdminQuizById error for ${quizId}:`, err);
    throw err;
  }
}

/**
 * Create a new quiz manually (Admin only)
 */
export async function createManualQuiz(quizData, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes`, {
      method: 'POST',
      headers: await getAuthHeaders(user),
      body: JSON.stringify(quizData)
    });
    return data.quiz;
  } catch (err) {
    console.error('createManualQuiz error:', err);
    throw err;
  }
}

/**
 * Generate a Draft Quiz using AI via AWS Bedrock (Admin only)
 */
export async function generateAIQuiz(params, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/generate-ai`, {
      method: 'POST',
      headers: await getAuthHeaders(user),
      body: JSON.stringify(params)
    });
    return data.quiz;
  } catch (err) {
    console.error('generateAIQuiz error:', err);
    throw err;
  }
}

/**
 * Update an existing quiz (Admin only)
 */
export async function updateQuiz(quizId, quizData, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/${quizId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(user),
      body: JSON.stringify(quizData)
    });
    return data.quiz;
  } catch (err) {
    console.error(`updateQuiz error for ${quizId}:`, err);
    throw err;
  }
}

/**
 * Update quiz status (Publish / Unpublish / Archive)
 */
export async function updateQuizStatus(quizId, status, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/${quizId}/status`, {
      method: 'PATCH',
      headers: await getAuthHeaders(user),
      body: JSON.stringify({ status })
    });
    return data.quiz;
  } catch (err) {
    console.error(`updateQuizStatus error for ${quizId}:`, err);
    throw err;
  }
}

/**
 * Duplicate a quiz (Admin only)
 */
export async function duplicateQuiz(quizId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/${quizId}/duplicate`, {
      method: 'POST',
      headers: await getAuthHeaders(user)
    });
    return data.quiz;
  } catch (err) {
    console.error(`duplicateQuiz error for ${quizId}:`, err);
    throw err;
  }
}

/**
 * Delete / Archive a quiz (Admin only)
 */
export async function deleteQuiz(quizId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(user)
    });
    return data;
  } catch (err) {
    console.error(`deleteQuiz error for ${quizId}:`, err);
    throw err;
  }
}

// ==========================================
// LEARNER QUIZ APIS
// ==========================================

/**
 * Fetch published quizzes for learners
 */
export async function fetchLearnerQuizzes(filters = {}, user = null) {
  try {
    const params = new URLSearchParams();
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.lessonId) params.append('lessonId', filters.lessonId);
    if (filters.search) params.append('search', filters.search.trim());

    const url = `${API_BASE_URL}/api/quizzes/learner${params.toString() ? '?' + params.toString() : ''}`;
    const data = await safeFetchJson(url, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data.quizzes || [];
  } catch (err) {
    console.error('fetchLearnerQuizzes error:', err);
    throw err;
  }
}

/**
 * Load a published quiz without answers for a learner
 */
export async function fetchLearnerQuizById(quizId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/learner/${quizId}`, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data;
  } catch (err) {
    console.error(`fetchLearnerQuizById error for ${quizId}:`, err);
    throw err;
  }
}

/**
 * Submit answers for a quiz attempt (graded authoritative by backend with idempotency key)
 */
export async function submitQuizAttempt(quizId, answers, clientSubmissionId = null, user = null) {
  try {
    const headers = await getAuthHeaders(user);
    if (clientSubmissionId) {
      headers['Idempotency-Key'] = clientSubmissionId;
    }
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/learner/${quizId}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answers, clientSubmissionId })
    });
    return data.result;
  } catch (err) {
    console.error(`submitQuizAttempt error for ${quizId}:`, err);
    throw err;
  }
}

/**
 * Fetch learner's past attempts for a specific quiz
 */
export async function fetchLearnerQuizAttempts(quizId, user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/learner/${quizId}/attempts`, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data.attempts || [];
  } catch (err) {
    console.error(`fetchLearnerQuizAttempts error for ${quizId}:`, err);
    throw err;
  }
}

/**
 * Fetch all quiz attempts by current learner across all courses
 */
export async function fetchMyQuizAttempts(user = null) {
  try {
    const data = await safeFetchJson(`${API_BASE_URL}/api/quizzes/learner/my-attempts`, {
      method: 'GET',
      headers: await getAuthHeaders(user)
    });
    return data.attempts || [];
  } catch (err) {
    console.error('fetchMyQuizAttempts error:', err);
    throw err;
  }
}

