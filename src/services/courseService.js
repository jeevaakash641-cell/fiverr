/**
 * Course Service — Frontend API Client for One Community Ely Courses
 */

import { API_BASE_URL } from '../config';
import { getFirebaseIdToken } from './firebaseAuth';

export const COURSE_CATEGORIES = [
  'Money Management',
  'Employment and Personal Development',
  'Digital Skills',
  'Artificial Intelligence',
  'Communication and Confidence',
  'Podcasting and Digital Media',
  'Small Business',
  'Health and Wellbeing',
  'Legal and Consumer Awareness',
  'Community Safety',
  'Everyday Life Skills',
  'Other'
];

export const COURSE_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
export const COURSE_STATUSES = ['draft', 'published', 'unpublished', 'archived'];

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
 * Fetch all courses for Admin (Includes draft, published, unpublished, archived)
 */
export async function fetchAdminCourses(filters = {}, user = null) {
  try {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

    const url = `${API_BASE_URL}/api/courses/admin${params.toString() ? '?' + params.toString() : ''}`;
    const headers = await getAuthHeaders(user);
    const res = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch courses');
    return data.courses || [];
  } catch (err) {
    console.error('fetchAdminCourses error:', err);
    throw err;
  }
}

/**
 * Fetch published courses for learners / public catalog
 */
export async function fetchPublishedCourses(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

    const url = `${API_BASE_URL}/api/courses/published${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch published courses');
    return data.courses || [];
  } catch (err) {
    console.error('fetchPublishedCourses error:', err);
    throw err;
  }
}

/**
 * Fetch single course by courseId
 */
export async function fetchCourseById(courseId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Course not found');
    return data.course;
  } catch (err) {
    console.error('fetchCourseById error:', err);
    throw err;
  }
}

export const getCourseById = fetchCourseById;

/**
 * Create a new course (Admin only)
 */
export async function createCourse(courseData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...courseData,
        createdBy: user?.email || 'admin'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.details ? data.details.join(', ') : (data.error || 'Failed to create course');
      throw new Error(errMsg);
    }
    return data.course;
  } catch (err) {
    console.error('createCourse error:', err);
    throw err;
  }
}

/**
 * Update course details (Admin only)
 */
export async function updateCourse(courseId, courseData, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(courseData)
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.details ? data.details.join(', ') : (data.error || 'Failed to update course');
      throw new Error(errMsg);
    }
    return data.course;
  } catch (err) {
    console.error('updateCourse error:', err);
    throw err;
  }
}

/**
 * Update course status (draft | published | unpublished | archived) (Admin only)
 */
export async function updateCourseStatus(courseId, status, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data.course;
  } catch (err) {
    console.error('updateCourseStatus error:', err);
    throw err;
  }
}

/**
 * Delete a single course (and its modules/lessons) (Admin only)
 */
export async function deleteCourse(courseId, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}`, {
      method: 'DELETE',
      headers
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete course');
    return data;
  } catch (err) {
    console.error('deleteCourse error:', err);
    throw err;
  }
}

/**
 * Bulk delete multiple courses (Admin only)
 */
export async function bulkDeleteCourses(courseIds, user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/bulk-delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ courseIds })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete selected courses');
    return data;
  } catch (err) {
    console.error('bulkDeleteCourses error:', err);
    throw err;
  }
}

/**
 * Delete ALL courses and their contents (Admin only)
 */
export async function deleteAllCourses(user) {
  try {
    const headers = await getAuthHeaders(user);
    const res = await fetch(`${API_BASE_URL}/api/courses/all`, {
      method: 'DELETE',
      headers
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete all courses');
    return data;
  } catch (err) {
    console.error('deleteAllCourses error:', err);
    throw err;
  }
}

export default {
  COURSE_CATEGORIES,
  COURSE_DIFFICULTIES,
  COURSE_STATUSES,
  fetchAdminCourses,
  fetchPublishedCourses,
  fetchCourseById,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  bulkDeleteCourses,
  deleteAllCourses
};
