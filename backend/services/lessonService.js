/**
 * Lesson Service — stores and manages course lessons in DynamoDB
 * Table: EduLearnLessons (partition key: lessonId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { getCourseById } from './courseService.js';
import { getModuleById } from './moduleService.js';
import { sanitizeHtml, stripHtml } from '../utils/sanitizeHtml.js';

const TABLE_NAME = process.env.DYNAMODB_TABLE_LESSONS || 'EduLearnLessons';

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
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

export const VALID_LESSON_STATUSES = ['draft', 'published', 'unpublished', 'archived'];

/**
 * Validate lesson input payload
 */
export function validateLessonPayload(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
      errors.push('Lesson title is required and must contain at least 3 characters');
    }
  }

  if (!isUpdate || data.shortDescription !== undefined) {
    if (!data.shortDescription || typeof data.shortDescription !== 'string' || data.shortDescription.trim().length < 10) {
      errors.push('Short description is required and must contain at least 10 characters');
    }
  }

  if (!isUpdate || data.content !== undefined) {
    const textOnly = stripHtml(data.content || '');
    if (!textOnly || textOnly.length === 0) {
      errors.push('Lesson content cannot be empty');
    }
  }

  if (!isUpdate || data.estimatedMinutes !== undefined) {
    const mins = Number(data.estimatedMinutes);
    if (!Number.isInteger(mins) || mins <= 0) {
      errors.push('Estimated duration in minutes must be a positive whole number');
    }
  }

  if (data.status !== undefined && !VALID_LESSON_STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${VALID_LESSON_STATUSES.join(', ')}`);
  }

  if (data.videoUrl && typeof data.videoUrl === 'string' && data.videoUrl.trim()) {
    try {
      new URL(data.videoUrl.trim());
    } catch {
      errors.push('Invalid video URL format');
    }
  }

  if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.trim()) {
    try {
      new URL(data.imageUrl.trim());
    } catch {
      errors.push('Invalid image URL format');
    }
  }

  return errors;
}

/**
 * Create a new lesson inside a module
 */
export async function createLesson(courseId, moduleId, data, createdByEmail = 'admin') {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error(`Course "${courseId}" does not exist`);
  }

  const moduleItem = await getModuleById(moduleId);
  if (!moduleItem) {
    throw new Error(`Module "${moduleId}" does not exist`);
  }

  if (moduleItem.courseId !== courseId) {
    throw new Error(`Module "${moduleId}" does not belong to course "${courseId}"`);
  }

  const client = getClient();
  const now = new Date().toISOString();

  // Next orderIndex in this module
  const existingLessons = await getLessonsByModule(moduleId, true);
  const maxOrderIndex = existingLessons.reduce((max, l) => Math.max(max, l.orderIndex ?? 0), -1);
  const nextOrderIndex = typeof data.orderIndex === 'number' && data.orderIndex >= 0
    ? data.orderIndex
    : maxOrderIndex + 1;

  const lessonId = `les_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const initialStatus = data.status && VALID_LESSON_STATUSES.includes(data.status) ? data.status : 'draft';

  // Sanitize content
  const cleanContent = sanitizeHtml(data.content || '');

  // Attached resources normalization
  const cleanResources = Array.isArray(data.attachedResources)
    ? data.attachedResources.map(r => ({
        resourceId: r.resourceId || r.id || r.key || '',
        title: r.title || 'Resource',
        format: (r.format || 'PDF').toUpperCase(),
        storageKey: r.storageKey || r.key || '',
        viewUrl: r.viewUrl || ''
      })).filter(r => r.resourceId)
    : [];

  const lessonItem = {
    lessonId,
    courseId,
    moduleId,
    title: (data.title || '').trim(),
    shortDescription: (data.shortDescription || '').trim(),
    content: cleanContent,
    contentFormat: 'html',
    videoUrl: (data.videoUrl || '').trim(),
    imageUrl: (data.imageUrl || '').trim(),
    attachedResources: cleanResources,
    estimatedMinutes: Number(data.estimatedMinutes) || 15,
    orderIndex: nextOrderIndex,
    status: initialStatus,
    createdBy: createdByEmail || 'admin',
    createdAt: now,
    updatedAt: now,
    publishedAt: initialStatus === 'published' ? now : null
  };

  await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: lessonItem
  }));

  return lessonItem;
}

/**
 * Get all lessons for a given module
 */
export async function getLessonsByModule(moduleId, includeAllStatuses = false) {
  const client = getClient();
  const result = await client.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'moduleId = :mid',
    ExpressionAttributeValues: { ':mid': moduleId }
  }));

  let items = result.Items || [];

  if (!includeAllStatuses) {
    items = items.filter(l => l.status === 'published');
  }

  // Sort ascending by orderIndex
  items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return items;
}

/**
 * Get all lessons for a course
 */
export async function getLessonsByCourse(courseId, includeAllStatuses = false) {
  const client = getClient();
  const result = await client.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'courseId = :cid',
    ExpressionAttributeValues: { ':cid': courseId }
  }));

  let items = result.Items || [];

  if (!includeAllStatuses) {
    items = items.filter(l => l.status === 'published');
  }

  items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  return items;
}

/**
 * Get single lesson by lessonId
 */
export async function getLessonById(lessonId) {
  const client = getClient();
  const result = await client.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { lessonId }
  }));
  return result.Item || null;
}

/**
 * Update lesson details
 */
export async function updateLesson(lessonId, updates) {
  const client = getClient();
  const existing = await getLessonById(lessonId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const cleanUpdates = { ...updates, updatedAt: now };
  delete cleanUpdates.lessonId;
  delete cleanUpdates.courseId;
  delete cleanUpdates.createdAt;
  delete cleanUpdates.createdBy;

  if (cleanUpdates.title !== undefined) cleanUpdates.title = cleanUpdates.title.trim();
  if (cleanUpdates.shortDescription !== undefined) cleanUpdates.shortDescription = cleanUpdates.shortDescription.trim();
  if (cleanUpdates.content !== undefined) cleanUpdates.content = sanitizeHtml(cleanUpdates.content);
  if (cleanUpdates.videoUrl !== undefined) cleanUpdates.videoUrl = cleanUpdates.videoUrl.trim();
  if (cleanUpdates.imageUrl !== undefined) cleanUpdates.imageUrl = cleanUpdates.imageUrl.trim();
  if (cleanUpdates.estimatedMinutes !== undefined) cleanUpdates.estimatedMinutes = Number(cleanUpdates.estimatedMinutes);

  if (Array.isArray(cleanUpdates.attachedResources)) {
    cleanUpdates.attachedResources = cleanUpdates.attachedResources.map(r => ({
      resourceId: r.resourceId || r.id || r.key || '',
      title: r.title || 'Resource',
      format: (r.format || 'PDF').toUpperCase(),
      storageKey: r.storageKey || r.key || '',
      viewUrl: r.viewUrl || ''
    })).filter(r => r.resourceId);
  }

  if (cleanUpdates.status === 'published' && existing.status !== 'published') {
    cleanUpdates.publishedAt = now;
  }

  const entries = Object.entries(cleanUpdates);
  if (!entries.length) return existing;

  const updateExpr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

  const result = await client.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { lessonId },
    UpdateExpression: updateExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW'
  }));

  return result.Attributes || null;
}

/**
 * Update lesson status (draft, published, unpublished, archived)
 */
export async function updateLessonStatus(lessonId, newStatus) {
  if (!VALID_LESSON_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_LESSON_STATUSES.join(', ')}`);
  }

  const existing = await getLessonById(lessonId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates = { status: newStatus, updatedAt: now };

  if (newStatus === 'published' && (!existing.publishedAt || existing.status !== 'published')) {
    updates.publishedAt = now;
  }

  return await updateLesson(lessonId, updates);
}

/**
 * Reorder lessons in a module
 */
export async function reorderLessons(moduleId, lessonIds) {
  if (!Array.isArray(lessonIds)) {
    throw new Error('lessonIds must be an array');
  }

  const updatedLessons = [];
  for (let i = 0; i < lessonIds.length; i++) {
    const lessonId = lessonIds[i];
    const updated = await updateLesson(lessonId, { orderIndex: i });
    if (updated) updatedLessons.push(updated);
  }

  return updatedLessons.sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Move a lesson to another module in the SAME course
 */
export async function moveLesson(lessonId, targetModuleId, targetCourseId = null) {
  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new Error(`Lesson "${lessonId}" not found`);
  }

  const targetModule = await getModuleById(targetModuleId);
  if (!targetModule) {
    throw new Error(`Target module "${targetModuleId}" not found`);
  }

  // Cross-course move validation: Must belong to the exact same course
  if (lesson.courseId !== targetModule.courseId) {
    throw new Error('Cross-course lesson move is not permitted. Both modules must belong to the same course.');
  }

  if (targetCourseId && targetCourseId !== lesson.courseId) {
    throw new Error('Target course ID does not match current lesson course ID.');
  }

  // Calculate new order index at the end of target module
  const targetLessons = await getLessonsByModule(targetModuleId, true);
  const nextOrderIndex = targetLessons.length;

  const updated = await updateLesson(lessonId, {
    moduleId: targetModuleId,
    orderIndex: nextOrderIndex
  });

  return updated;
}

/**
 * Delete a single lesson
 */
export async function deleteLesson(lessonId) {
  const client = getClient();
  const existing = await getLessonById(lessonId);
  if (!existing) return null;

  await client.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { lessonId }
  }));

  return existing;
}

/**
 * Delete all lessons belonging to a specific module
 */
export async function deleteLessonsByModule(moduleId) {
  const client = getClient();
  const lessons = await getLessonsByModule(moduleId, true);
  if (lessons.length === 0) return 0;
  await Promise.all(lessons.map(l => client.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { lessonId: l.lessonId }
  }))));
  return lessons.length;
}

/**
 * Delete all lessons belonging to a specific course
 */
export async function deleteLessonsByCourse(courseId) {
  const client = getClient();
  const lessons = await getLessonsByCourse(courseId, true);
  if (lessons.length === 0) return 0;
  await Promise.all(lessons.map(l => client.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { lessonId: l.lessonId }
  }))));
  return lessons.length;
}

/**
 * Delete all lessons from the database
 */
export async function deleteAllLessons() {
  const client = getClient();
  const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = result.Items || [];
  if (items.length === 0) return 0;
  await Promise.all(items.map(item => client.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { lessonId: item.lessonId }
  }))));
  return items.length;
}

export default {
  VALID_LESSON_STATUSES,
  validateLessonPayload,
  createLesson,
  getLessonsByModule,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  updateLessonStatus,
  reorderLessons,
  moveLesson,
  deleteLesson,
  deleteLessonsByModule,
  deleteLessonsByCourse,
  deleteAllLessons
};
