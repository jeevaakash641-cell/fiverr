/**
 * Course Service — stores and manages courses in DynamoDB
 * Table: EduLearnCourses (partition key: courseId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

import path from 'path';
import fs from 'fs';

const TABLE_NAME = process.env.DYNAMODB_TABLE_COURSES || 'EduLearnCourses';

let docClient = null;

function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
      },
    });
    docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return docClient;
}

// In-memory course store + disk persistence
export const inMemoryCourses = new Map();
const COURSES_STORE_PATH = path.join(process.cwd(), 'data', 'courses.json');

function loadPersistedCourses() {
  try {
    if (fs.existsSync(COURSES_STORE_PATH)) {
      const raw = fs.readFileSync(COURSES_STORE_PATH, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(c => inMemoryCourses.set(c.courseId, c));
      }
    }
  } catch (err) {
    console.warn('[courseService] Failed to read persisted courses:', err.message);
  }
}

function persistCourses() {
  try {
    const dir = path.dirname(COURSES_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const list = Array.from(inMemoryCourses.values());
    fs.writeFileSync(COURSES_STORE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[courseService] Failed to persist courses:', err.message);
  }
}

loadPersistedCourses();

export const VALID_CATEGORIES = [
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

export const VALID_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
export const VALID_STATUSES = ['draft', 'published', 'unpublished', 'archived'];

/**
 * Validate course input payload
 */
export function validateCoursePayload(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
      errors.push('Course title is required and must contain at least 3 characters');
    }
  }

  if (!isUpdate || data.shortDescription !== undefined) {
    if (!data.shortDescription || typeof data.shortDescription !== 'string' || data.shortDescription.trim().length < 10) {
      errors.push('Short description is required and must contain at least 10 characters');
    }
  }

  if (!isUpdate || data.category !== undefined) {
    if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
      errors.push('Category is required');
    }
  }

  if (!isUpdate || data.estimatedDuration !== undefined) {
    if (!data.estimatedDuration || typeof data.estimatedDuration !== 'string' || !data.estimatedDuration.trim()) {
      errors.push('Estimated duration is required');
    }
  }

  if (!isUpdate || data.difficultyLevel !== undefined) {
    if (!data.difficultyLevel || !VALID_DIFFICULTIES.includes(data.difficultyLevel)) {
      errors.push(`Difficulty level must be one of: ${VALID_DIFFICULTIES.join(', ')}`);
    }
  }

  if (!isUpdate || data.learningOutcomes !== undefined) {
    if (!Array.isArray(data.learningOutcomes)) {
      errors.push('Learning outcomes must be an array');
    } else {
      const cleanOutcomes = data.learningOutcomes.map(o => typeof o === 'string' ? o.trim() : '').filter(Boolean);
      if (cleanOutcomes.length === 0) {
        errors.push('At least one non-empty learning outcome is required');
      }
    }
  }

  return errors;
}

/**
 * Create a new course (Default status: draft)
 */
export async function createCourse(data, createdByEmail = 'admin') {
  const now = new Date().toISOString();

  const cleanOutcomes = Array.isArray(data.learningOutcomes)
    ? data.learningOutcomes.map(o => typeof o === 'string' ? o.trim() : '').filter(Boolean)
    : [];

  const courseId = `course_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const initialStatus = data.status && VALID_STATUSES.includes(data.status) ? data.status : 'draft';

  const courseItem = {
    courseId,
    title: (data.title || '').trim(),
    shortDescription: (data.shortDescription || '').trim(),
    fullDescription: (data.fullDescription || '').trim(),
    category: (data.category || 'Other').trim(),
    thumbnailUrl: (data.thumbnailUrl || '').trim(),
    estimatedDuration: (data.estimatedDuration || '').trim(),
    difficultyLevel: data.difficultyLevel && VALID_DIFFICULTIES.includes(data.difficultyLevel) ? data.difficultyLevel : 'Beginner',
    learningOutcomes: cleanOutcomes,
    status: initialStatus,
    createdBy: createdByEmail || 'admin',
    createdAt: now,
    updatedAt: now,
    publishedAt: initialStatus === 'published' ? now : null
  };

  inMemoryCourses.set(courseId, courseItem);
  persistCourses();

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: courseItem
    }));
  } catch (err) {
    console.warn(`[courseService] DynamoDB put failed for ${TABLE_NAME}, using memory:`, err.message);
  }

  return courseItem;
}

/**
 * Get all courses for Admin (includes all statuses)
 */
export async function getAllCourses(filters = {}) {
  let courses = Array.from(inMemoryCourses.values());

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    if (result.Items && result.Items.length > 0) {
      courses = result.Items;
      courses.forEach(c => inMemoryCourses.set(c.courseId, c));
      persistCourses();
    }
  } catch (err) {
    console.warn(`[courseService] DynamoDB scan failed for ${TABLE_NAME}, using memory:`, err.message);
  }

  // Filter by status if requested
  if (filters.status && filters.status !== 'all' && VALID_STATUSES.includes(filters.status)) {
    courses = courses.filter(c => c.status === filters.status);
  }

  // Filter by category if requested
  if (filters.category && filters.category !== 'all') {
    courses = courses.filter(c => (c.category || '').toLowerCase() === filters.category.toLowerCase());
  }

  // Search by keyword
  if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    courses = courses.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.shortDescription || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  }

  // Sort latest updated first
  courses.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  return courses;
}

/**
 * Get only published courses for learners / public view
 */
export async function getPublishedCourses(filters = {}) {
  let courses = Array.from(inMemoryCourses.values()).filter(c => c.status === 'published');

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#status = :published',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':published': 'published' }
    }));
    if (result.Items && result.Items.length > 0) {
      courses = result.Items;
      result.Items.forEach(c => inMemoryCourses.set(c.courseId, c));
      persistCourses();
    }
  } catch (err) {
    console.warn(`[courseService] DynamoDB scan published failed, using memory:`, err.message);
  }

  // Filter by category if requested
  if (filters.category && filters.category !== 'all') {
    courses = courses.filter(c => (c.category || '').toLowerCase() === filters.category.toLowerCase());
  }

  // Search by keyword
  if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    courses = courses.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.shortDescription || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  }

  // Sort latest published first
  courses.sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));

  return courses;
}

/**
 * Get single course by courseId
 */
export async function getCourseById(courseId) {
  if (!courseId) return null;
  let item = inMemoryCourses.get(courseId) || null;

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { courseId }
    }));
    if (result.Item) {
      item = result.Item;
      inMemoryCourses.set(courseId, item);
      persistCourses();
    }
  } catch (err) {
    // Rely on memory
  }

  return item;
}

/**
 * Update course details
 */
export async function updateCourse(courseId, data) {
  const existing = await getCourseById(courseId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates = { ...data, updatedAt: now };
  delete updates.courseId;
  delete updates.createdAt;
  delete updates.createdBy;

  if (updates.title !== undefined) updates.title = updates.title.trim();
  if (updates.shortDescription !== undefined) updates.shortDescription = updates.shortDescription.trim();
  if (updates.fullDescription !== undefined) updates.fullDescription = updates.fullDescription.trim();
  if (updates.category !== undefined) updates.category = updates.category.trim();
  if (updates.thumbnailUrl !== undefined) updates.thumbnailUrl = updates.thumbnailUrl.trim();
  if (updates.estimatedDuration !== undefined) updates.estimatedDuration = updates.estimatedDuration.trim();
  if (Array.isArray(updates.learningOutcomes)) {
    updates.learningOutcomes = updates.learningOutcomes.map(o => typeof o === 'string' ? o.trim() : '').filter(Boolean);
  }

  // If status is changed to published, set publishedAt
  if (updates.status === 'published' && existing.status !== 'published') {
    updates.publishedAt = now;
  }

  const updatedItem = { ...existing, ...updates };
  inMemoryCourses.set(courseId, updatedItem);
  persistCourses();

  try {
    const client = getClient();
    const entries = Object.entries(updates);
    if (entries.length > 0) {
      const updateExpr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
      const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
      const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

      await client.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { courseId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW'
      }));
    }
  } catch (err) {
    console.warn('[courseService] DynamoDB update failed, using memory:', err.message);
  }

  return updatedItem;
}

/**
 * Update course status (draft -> published -> unpublished -> archived)
 */
export async function updateCourseStatus(courseId, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const existing = await getCourseById(courseId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates = {
    status: newStatus,
    updatedAt: now
  };

  if (newStatus === 'published' && (!existing.publishedAt || existing.status !== 'published')) {
    updates.publishedAt = now;
  }

  return await updateCourse(courseId, updates);
}

/**
 * Delete a single course (and cascade delete all its modules, lessons, and learner selections in parallel)
 */
export async function deleteCourse(courseId) {
  const existing = await getCourseById(courseId);
  if (!existing) return null;

  inMemoryCourses.delete(courseId);
  persistCourses();

  const { deleteLessonsByCourse } = await import('./lessonService.js');
  const { deleteModulesByCourse } = await import('./moduleService.js');
  const { deleteSelectionsByCourse } = await import('./courseSelectionService.js');

  try {
    const client = getClient();
    await Promise.all([
      deleteLessonsByCourse(courseId).catch(() => {}),
      deleteModulesByCourse(courseId).catch(() => {}),
      deleteSelectionsByCourse(courseId).catch(() => {}),
      client.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { courseId }
      })).catch(() => {})
    ]);
  } catch (err) {
    // Ignore deletion errors on AWS
  }

  return existing;
}

/**
 * Delete multiple specified courses in parallel
 */
export async function deleteMultipleCourses(courseIds) {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return [];
  }

  const results = await Promise.all(courseIds.map(id => deleteCourse(id)));
  return results.filter(Boolean);
}

/**
 * Delete ALL courses, modules, lessons, and selections (High-Speed Complete Wipe)
 */
export async function deleteAllCourses() {
  const allCourses = await getAllCourses();

  inMemoryCourses.clear();
  persistCourses();

  const { deleteAllModules } = await import('./moduleService.js');
  const { deleteAllLessons } = await import('./lessonService.js');
  const { deleteAllSelections } = await import('./courseSelectionService.js');

  try {
    const client = getClient();
    await Promise.all([
      Promise.all(allCourses.map(c => client.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { courseId: c.courseId }
      })).catch(() => {}))),
      deleteAllModules().catch(() => {}),
      deleteAllLessons().catch(() => {}),
      deleteAllSelections().catch(() => {})
    ]);
  } catch (err) {
    // Ignore AWS wipe errors
  }

  return allCourses.length;
}

export const getAllCoursesAdmin = getAllCourses;

export default {
  VALID_CATEGORIES,
  VALID_DIFFICULTIES,
  VALID_STATUSES,
  validateCoursePayload,
  createCourse,
  getAllCourses,
  getAllCoursesAdmin,
  getPublishedCourses,
  getCourseById,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  deleteMultipleCourses,
  deleteAllCourses
};
