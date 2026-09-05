/**
 * Module Service — stores and manages course modules in DynamoDB
 * Table: EduLearnModules (partition key: moduleId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { getCourseById } from './courseService.js';

const TABLE_NAME = process.env.DYNAMODB_TABLE_MODULES || 'EduLearnModules';

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

export const VALID_MODULE_STATUSES = ['draft', 'published', 'unpublished', 'archived'];

/**
 * Validate module payload
 */
export function validateModulePayload(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
      errors.push('Module title is required and must contain at least 3 characters');
    }
  }

  if (!isUpdate || data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
      errors.push('Module description is required and must contain at least 10 characters');
    }
  }

  if (data.status !== undefined && !VALID_MODULE_STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${VALID_MODULE_STATUSES.join(', ')}`);
  }

  if (data.orderIndex !== undefined && (typeof data.orderIndex !== 'number' || data.orderIndex < 0)) {
    errors.push('Order index cannot be negative');
  }

  return errors;
}

/**
 * Create a new module inside a course
 */
export async function createModule(courseId, data, createdByEmail = 'admin') {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error(`Course "${courseId}" does not exist`);
  }

  const client = getClient();
  const now = new Date().toISOString();

  // Determine next orderIndex
  const existingModules = await getModulesByCourse(courseId, true);
  const maxOrderIndex = existingModules.reduce((max, m) => Math.max(max, m.orderIndex ?? 0), -1);
  const nextOrderIndex = typeof data.orderIndex === 'number' && data.orderIndex >= 0
    ? data.orderIndex
    : maxOrderIndex + 1;

  const moduleId = `mod_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const initialStatus = data.status && VALID_MODULE_STATUSES.includes(data.status) ? data.status : 'draft';

  const moduleItem = {
    moduleId,
    courseId,
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    orderIndex: nextOrderIndex,
    status: initialStatus,
    createdBy: createdByEmail || 'admin',
    createdAt: now,
    updatedAt: now,
    publishedAt: initialStatus === 'published' ? now : null
  };

  await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: moduleItem
  }));

  return moduleItem;
}

/**
 * Get all modules for a given course
 */
export async function getModulesByCourse(courseId, includeAllStatuses = false) {
  const client = getClient();
  const result = await client.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'courseId = :cid',
    ExpressionAttributeValues: { ':cid': courseId }
  }));

  let items = result.Items || [];

  if (!includeAllStatuses) {
    items = items.filter(m => m.status === 'published');
  }

  // Sort ascending by orderIndex
  items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return items;
}

/**
 * Get single module by moduleId
 */
export async function getModuleById(moduleId) {
  const client = getClient();
  const result = await client.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { moduleId }
  }));
  return result.Item || null;
}

/**
 * Update module details
 */
export async function updateModule(moduleId, updates) {
  const client = getClient();
  const existing = await getModuleById(moduleId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const cleanUpdates = { ...updates, updatedAt: now };
  delete cleanUpdates.moduleId;
  delete cleanUpdates.courseId;
  delete cleanUpdates.createdAt;
  delete cleanUpdates.createdBy;

  if (cleanUpdates.title !== undefined) cleanUpdates.title = cleanUpdates.title.trim();
  if (cleanUpdates.description !== undefined) cleanUpdates.description = cleanUpdates.description.trim();

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
    Key: { moduleId },
    UpdateExpression: updateExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW'
  }));

  return result.Attributes || null;
}

/**
 * Update module status (draft, published, unpublished, archived)
 */
export async function updateModuleStatus(moduleId, newStatus) {
  if (!VALID_MODULE_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_MODULE_STATUSES.join(', ')}`);
  }

  const existing = await getModuleById(moduleId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates = { status: newStatus, updatedAt: now };

  if (newStatus === 'published' && (!existing.publishedAt || existing.status !== 'published')) {
    updates.publishedAt = now;
  }

  return await updateModule(moduleId, updates);
}

/**
 * Reorder modules in a course
 * @param {string} courseId
 * @param {string[]} moduleIds - Ordered array of module IDs
 */
export async function reorderModules(courseId, moduleIds) {
  if (!Array.isArray(moduleIds)) {
    throw new Error('moduleIds must be an array');
  }

  const updatedModules = [];
  for (let i = 0; i < moduleIds.length; i++) {
    const moduleId = moduleIds[i];
    const updated = await updateModule(moduleId, { orderIndex: i });
    if (updated) updatedModules.push(updated);
  }

  return updatedModules.sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Delete a single module (and all its child lessons)
 */
export async function deleteModule(moduleId) {
  const client = getClient();
  const existing = await getModuleById(moduleId);
  if (!existing) return null;

  // Delete all lessons belonging to this module in parallel
  const { deleteLessonsByModule } = await import('./lessonService.js');
  await Promise.all([
    deleteLessonsByModule(moduleId),
    client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { moduleId }
    }))
  ]);

  return existing;
}

/**
 * Delete all modules belonging to a specific course (and their lessons)
 */
export async function deleteModulesByCourse(courseId) {
  const client = getClient();
  const modules = await getModulesByCourse(courseId, true);
  if (modules.length === 0) return 0;

  const { deleteLessonsByModule } = await import('./lessonService.js');

  await Promise.all(modules.map(m => Promise.all([
    deleteLessonsByModule(m.moduleId),
    client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { moduleId: m.moduleId }
    }))
  ])));

  return modules.length;
}

/**
 * Delete all modules from the database
 */
export async function deleteAllModules() {
  const client = getClient();
  const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = result.Items || [];
  if (items.length === 0) return 0;
  await Promise.all(items.map(item => client.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { moduleId: item.moduleId }
  }))));
  return items.length;
}

export default {
  VALID_MODULE_STATUSES,
  validateModulePayload,
  createModule,
  getModulesByCourse,
  getModuleById,
  updateModule,
  updateModuleStatus,
  reorderModules,
  deleteModule,
  deleteModulesByCourse,
  deleteAllModules
};
