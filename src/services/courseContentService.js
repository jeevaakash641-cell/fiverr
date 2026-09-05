/**
 * Course Content Service — Frontend API Client for Modules, Lessons & Hierarchy
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
 * Fetch full course hierarchy for Admin (course + all modules + all lessons)
 */
export async function fetchCourseContentAdmin(courseId, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}/content/admin`, {
      method: 'GET',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load course content');
    return data;
  } catch (err) {
    console.error('fetchCourseContentAdmin error:', err);
    throw err;
  }
}

/**
 * Fetch published course content for public / learners
 */
export async function fetchPublishedCourseContent(courseId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}/content`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load course content');
    return data;
  } catch (err) {
    console.error('fetchPublishedCourseContent error:', err);
    throw err;
  }
}

/**
 * Create a new module inside a course (Admin only)
 */
export async function createModule(courseId, moduleData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}/modules`, {
      method: 'POST',
      headers,
      body: JSON.stringify(moduleData)
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.details ? data.details.join(', ') : (data.error || 'Failed to create module');
      throw new Error(errMsg);
    }
    return data.module;
  } catch (err) {
    console.error('createModule error:', err);
    throw err;
  }
}

/**
 * Update module details (Admin only)
 */
export async function updateModule(moduleId, moduleData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/modules/${encodeURIComponent(moduleId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(moduleData)
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.details ? data.details.join(', ') : (data.error || 'Failed to update module');
      throw new Error(errMsg);
    }
    return data.module;
  } catch (err) {
    console.error('updateModule error:', err);
    throw err;
  }
}

/**
 * Update module status (Admin only)
 */
export async function updateModuleStatus(moduleId, status, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/modules/${encodeURIComponent(moduleId)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update module status');
    return data.module;
  } catch (err) {
    console.error('updateModuleStatus error:', err);
    throw err;
  }
}

/**
 * Reorder modules in a course (Admin only)
 */
export async function reorderModules(courseId, moduleIds, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}/modules/reorder`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ moduleIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reorder modules');
    return data.modules;
  } catch (err) {
    console.error('reorderModules error:', err);
    throw err;
  }
}

/**
 * Create a new lesson inside a module (Admin only)
 */
export async function createLesson(moduleId, lessonData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/modules/${encodeURIComponent(moduleId)}/lessons`, {
      method: 'POST',
      headers,
      body: JSON.stringify(lessonData)
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.details ? data.details.join(', ') : (data.error || 'Failed to create lesson');
      throw new Error(errMsg);
    }
    return data.lesson;
  } catch (err) {
    console.error('createLesson error:', err);
    throw err;
  }
}

/**
 * Fetch single lesson by lessonId
 */
export async function fetchLessonById(lessonId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/lessons/${encodeURIComponent(lessonId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lesson not found');
    return data.lesson;
  } catch (err) {
    console.error('fetchLessonById error:', err);
    throw err;
  }
}

/**
 * Update lesson details (Admin only)
 */
export async function updateLesson(lessonId, lessonData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(lessonData)
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.details ? data.details.join(', ') : (data.error || 'Failed to update lesson');
      throw new Error(errMsg);
    }
    return data.lesson;
  } catch (err) {
    console.error('updateLesson error:', err);
    throw err;
  }
}

/**
 * Update lesson status (Admin only)
 */
export async function updateLessonStatus(lessonId, status, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/lessons/${encodeURIComponent(lessonId)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update lesson status');
    return data.lesson;
  } catch (err) {
    console.error('updateLessonStatus error:', err);
    throw err;
  }
}

/**
 * Reorder lessons in a module (Admin only)
 */
export async function reorderLessons(moduleId, lessonIds, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/modules/${encodeURIComponent(moduleId)}/lessons/reorder`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ lessonIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reorder lessons');
    return data.lessons;
  } catch (err) {
    console.error('reorderLessons error:', err);
    throw err;
  }
}

/**
 * Move a lesson to another module in the same course (Admin only)
 */
export async function moveLesson(lessonId, targetModuleId, targetCourseId, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/lessons/${encodeURIComponent(lessonId)}/move`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ targetModuleId, targetCourseId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to move lesson');
    return data.lesson;
  } catch (err) {
    console.error('moveLesson error:', err);
    throw err;
  }
}

export default {
  fetchCourseContentAdmin,
  fetchPublishedCourseContent,
  createModule,
  updateModule,
  updateModuleStatus,
  reorderModules,
  createLesson,
  fetchLessonById,
  updateLesson,
  updateLessonStatus,
  reorderLessons,
  moveLesson
};
