/**
 * Content Request Service
 * One Community Ely Online Training Centre
 * Handles learner requests for missing/mismatched Quizzes and Assessments
 * Table: EduLearnContentRequests (PK: requestId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { getCourseById } from './courseService.js';

const REQUESTS_TABLE = process.env.DYNAMODB_TABLE_CONTENT_REQUESTS || 'EduLearnContentRequests';

let docClient = null;

function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
    docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return docClient;
}

// In-memory fallback store for offline / test resilience
export const inMemoryContentRequests = new Map();

export const VALID_REQUEST_TYPES = ['quiz', 'assessment'];
export const VALID_REQUEST_STATUSES = ['pending', 'fulfilled', 'dismissed'];

/**
 * Create or update a content request
 */
export async function createContentRequest({
  learnerEmail,
  learnerName = '',
  courseId,
  courseTitle = '',
  requestType,
  note = ''
}) {
  if (!learnerEmail) {
    throw new Error('Authenticated learner email is required.');
  }
  if (!courseId) {
    throw new Error('Course ID is required for a content request.');
  }
  if (!VALID_REQUEST_TYPES.includes(requestType)) {
    throw new Error(`Invalid request type "${requestType}". Must be 'quiz' or 'assessment'.`);
  }

  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  // Try to resolve course title if not provided
  let resolvedCourseTitle = courseTitle;
  if (!resolvedCourseTitle) {
    try {
      const course = await getCourseById(courseId);
      if (course) resolvedCourseTitle = course.title;
    } catch (e) {
      // Ignore
    }
  }

  // Deduplication: check if active pending request already exists for this learner + course + type
  const existingRequests = await getLearnerContentRequests(cleanEmail, courseId);
  const existingPending = existingRequests.find(
    r => r.requestType === requestType && r.status === 'pending'
  );

  const now = new Date().toISOString();

  if (existingPending) {
    // Return existing request with confirmation
    return {
      success: true,
      alreadyRequested: true,
      request: existingPending,
      message: `You already have an active request for this ${requestType}. Our team is reviewing it.`
    };
  }

  const requestId = `req_${Date.now()}_${randomUUID().substring(0, 6)}`;
  const requestItem = {
    requestId,
    learnerEmail: cleanEmail,
    learnerName: learnerName || cleanEmail.split('@')[0],
    courseId,
    courseTitle: resolvedCourseTitle || 'Course',
    requestType,
    note: String(note || '').trim(),
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };

  inMemoryContentRequests.set(requestId, requestItem);

  try {
    const client = getClient();
    await client.send(
      new PutCommand({
        TableName: REQUESTS_TABLE,
        Item: requestItem
      })
    );
  } catch (err) {
    console.warn(`[contentRequestService] DynamoDB put failed for ${REQUESTS_TABLE}, using memory:`, err.message);
  }

  return {
    success: true,
    alreadyRequested: false,
    request: requestItem,
    message: `Your request for the ${requestType === 'quiz' ? 'quiz' : 'assessment'} has been submitted to the Admin team.`
  };
}

/**
 * Get all content requests made by a specific learner
 */
export async function getLearnerContentRequests(learnerEmail, courseId = null) {
  if (!learnerEmail) return [];
  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  let items = Array.from(inMemoryContentRequests.values());

  try {
    const client = getClient();
    const result = await client.send(
      new ScanCommand({
        TableName: REQUESTS_TABLE
      })
    );
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryContentRequests.set(it.requestId, it));
    }
  } catch (err) {
    // Rely on memory
  }

  items = items.filter(r => r.learnerEmail === cleanEmail);
  if (courseId) {
    items = items.filter(r => r.courseId === courseId);
  }

  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
}

/**
 * Get all content requests for Admin
 */
export async function getAllContentRequestsAdmin(filters = {}) {
  let items = Array.from(inMemoryContentRequests.values());

  try {
    const client = getClient();
    const result = await client.send(
      new ScanCommand({
        TableName: REQUESTS_TABLE
      })
    );
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryContentRequests.set(it.requestId, it));
    }
  } catch (err) {
    // Rely on memory
  }

  if (filters.status && filters.status !== 'all') {
    items = items.filter(r => r.status === filters.status);
  }
  if (filters.requestType && filters.requestType !== 'all') {
    items = items.filter(r => r.requestType === filters.requestType);
  }
  if (filters.courseId && filters.courseId !== 'all') {
    items = items.filter(r => r.courseId === filters.courseId);
  }
  if (filters.search) {
    const q = String(filters.search).toLowerCase().trim();
    items = items.filter(
      r =>
        (r.learnerName || '').toLowerCase().includes(q) ||
        (r.learnerEmail || '').toLowerCase().includes(q) ||
        (r.courseTitle || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
}

/**
 * Update request status (Admin only)
 */
export async function updateContentRequestStatus(requestId, status, adminEmail = 'admin@onecommunityely.com', adminNote = '') {
  if (!VALID_REQUEST_STATUSES.includes(status)) {
    throw new Error(`Invalid status "${status}". Must be one of: ${VALID_REQUEST_STATUSES.join(', ')}`);
  }

  let item = inMemoryContentRequests.get(requestId);

  try {
    const client = getClient();
    const result = await client.send(
      new GetCommand({
        TableName: REQUESTS_TABLE,
        Key: { requestId }
      })
    );
    if (result.Item) {
      item = result.Item;
    }
  } catch (err) {
    // Rely on memory
  }

  if (!item) {
    throw new Error(`Content request with ID "${requestId}" not found.`);
  }

  const now = new Date().toISOString();
  item.status = status;
  item.resolvedBy = adminEmail;
  item.adminNote = adminNote || item.adminNote || '';
  item.updatedAt = now;
  if (status === 'fulfilled') {
    item.fulfilledAt = now;
  }

  inMemoryContentRequests.set(requestId, item);

  try {
    const client = getClient();
    await client.send(
      new UpdateCommand({
        TableName: REQUESTS_TABLE,
        Key: { requestId },
        UpdateExpression: 'SET #s = :status, resolvedBy = :admin, adminNote = :note, updatedAt = :now, fulfilledAt = :fAt',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
          ':admin': adminEmail,
          ':note': adminNote || '',
          ':now': now,
          ':fAt': status === 'fulfilled' ? now : (item.fulfilledAt || null)
        }
      })
    );
  } catch (err) {
    console.warn(`[contentRequestService] DynamoDB update failed for ${REQUESTS_TABLE}:`, err.message);
  }

  return item;
}
