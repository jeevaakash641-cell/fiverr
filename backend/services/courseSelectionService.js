import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { getCourseById } from './courseService.js';

dotenv.config();

let docClient = null;

function getClient() {
  if (docClient) return docClient;

  const rawClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
    }
  });

  docClient = DynamoDBDocumentClient.from(rawClient);
  return docClient;
}

const TABLE_NAME = process.env.DYNAMODB_TABLE_COURSE_SELECTIONS || 'EduLearnCourseSelections';

// In-memory fallback map to guarantee resilience in development and testing
export const inMemorySelections = new Map();

/**
 * Save a course selection for an authenticated learner
 * @param {string} learnerEmail 
 * @param {string} courseId 
 * @param {string} source - "recommendation" | "browse"
 * @param {string} recommendationReason 
 */
export async function saveCourseSelection(learnerEmail, courseId, source = 'recommendation', recommendationReason = '') {
  if (!learnerEmail || typeof learnerEmail !== 'string') {
    throw new Error('Learner email is required for course selection');
  }
  if (!courseId || typeof courseId !== 'string') {
    throw new Error('Course ID is required for course selection');
  }

  const cleanEmail = learnerEmail.trim().toLowerCase();

  // 1. Verify course exists and is currently published
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error(`Course "${courseId}" does not exist`);
  }
  if (course.status !== 'published') {
    throw new Error(`Course "${course.title}" is not currently published and cannot be selected`);
  }

  // 2. Check in-memory first or scan DynamoDB for existing active selection
  let existing = Array.from(inMemorySelections.values()).find(
    s => s.learnerId === cleanEmail && s.courseId === courseId && s.status === 'selected'
  );

  try {
    const client = getClient();
    const existingCheck = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'learnerId = :lid AND courseId = :cid AND #st = :st',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':lid': cleanEmail,
        ':cid': courseId,
        ':st': 'selected'
      }
    }));

    if (existingCheck.Items && existingCheck.Items.length > 0) {
      existing = existingCheck.Items[0];
    }
  } catch (err) {
    // Fall back to in-memory check
  }

  if (existing) {
    return {
      ...existing,
      course,
      alreadySelected: true
    };
  }

  // 3. Create new selection item
  const selectionId = `sel_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const selectionItem = {
    selectionId,
    learnerId: cleanEmail,
    courseId,
    selectedAt: now,
    source: source === 'browse' ? 'browse' : 'recommendation',
    recommendationReason: recommendationReason || '',
    status: 'selected'
  };

  inMemorySelections.set(selectionId, selectionItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: selectionItem
    }));
  } catch (err) {
    console.warn(`[courseSelectionService] DynamoDB put failed, saved in memory: ${err.message}`);
  }

  return {
    ...selectionItem,
    course,
    alreadySelected: false
  };
}

/**
 * Get all active selections for a learner, enriched with course details
 * @param {string} learnerEmail 
 */
export async function getLearnerSelections(learnerEmail) {
  if (!learnerEmail) return [];
  const cleanEmail = learnerEmail.trim().toLowerCase();

  let items = [];
  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'learnerId = :lid',
      ExpressionAttributeValues: { ':lid': cleanEmail }
    }));
    items = result.Items || [];
  } catch (err) {
    // Fall back to in-memory store
    items = Array.from(inMemorySelections.values()).filter(s => s.learnerId === cleanEmail);
  }

  if (items.length === 0) {
    items = Array.from(inMemorySelections.values()).filter(s => s.learnerId === cleanEmail);
  }

  // Sort descending by selectedAt
  items.sort((a, b) => new Date(b.selectedAt || 0).getTime() - new Date(a.selectedAt || 0).getTime());

  // Enrich with current course metadata
  const enriched = await Promise.all(items.map(async (sel) => {
    try {
      const course = await getCourseById(sel.courseId);
      return {
        ...sel,
        course: course || null
      };
    } catch {
      return { ...sel, course: null };
    }
  }));

  return enriched;
}

/**
 * Check if learner has selected a specific course
 * @param {string} learnerEmail 
 * @param {string} courseId 
 */
export async function checkLearnerCourseSelection(learnerEmail, courseId) {
  if (!learnerEmail || !courseId) return { isSelected: false };
  const cleanEmail = learnerEmail.trim().toLowerCase();

  let match = Array.from(inMemorySelections.values()).find(
    s => s.learnerId === cleanEmail && s.courseId === courseId && s.status === 'selected'
  );

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'learnerId = :lid AND courseId = :cid AND #st = :st',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':lid': cleanEmail,
        ':cid': courseId,
        ':st': 'selected'
      }
    }));

    const items = result.Items || [];
    if (items.length > 0) {
      match = items[0];
    }
  } catch (err) {
    // Fall back to in-memory check
  }

  if (match) {
    return { isSelected: true, selection: match };
  }
  return { isSelected: false };
}

/**
 * Delete all learner selections for a given course
 */
export async function deleteSelectionsByCourse(courseId) {
  if (!courseId) return 0;
  for (const [id, item] of inMemorySelections.entries()) {
    if (item.courseId === courseId) inMemorySelections.delete(id);
  }

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'courseId = :cid',
      ExpressionAttributeValues: { ':cid': courseId }
    }));

    const items = result.Items || [];
    if (items.length > 0) {
      await Promise.all(items.map(item => client.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { selectionId: item.selectionId }
      }))));
    }
    return items.length;
  } catch (err) {
    return 0;
  }
}

/**
 * Delete all learner course selections
 */
export async function deleteAllSelections() {
  inMemorySelections.clear();
  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = result.Items || [];
    if (items.length > 0) {
      await Promise.all(items.map(item => client.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { selectionId: item.selectionId }
      }))));
    }
    return items.length;
  } catch (err) {
    return 0;
  }
}

/**
 * Get all course selections for admin reporting
 */
export async function getAllCourseSelectionsAdmin() {
  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    const dbItems = result.Items || [];
    const map = new Map();
    Array.from(inMemorySelections.values()).forEach(s => map.set(s.selectionId, s));
    dbItems.forEach(s => map.set(s.selectionId, s));
    return Array.from(map.values());
  } catch (err) {
    console.warn('[courseSelectionService] DynamoDB scan failed in getAllCourseSelectionsAdmin, using in-memory:', err.message);
    return Array.from(inMemorySelections.values());
  }
}

export default {
  saveCourseSelection,
  getLearnerSelections,
  checkLearnerCourseSelection,
  deleteSelectionsByCourse,
  deleteAllSelections,
  getAllCourseSelectionsAdmin
};
