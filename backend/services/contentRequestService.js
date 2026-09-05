/**
 * Content Request Service — One Community Ely Online Training Centre
 * Handles learner requests for missing/mismatched Quizzes and Assessments,
 * automatic fulfillment upon publishing, and Admin linking workflows.
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
import { createNotification } from './notificationService.js';
import { recordAdminAction, AuditCategories } from './adminAuditService.js';

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

export const VALID_REQUEST_TYPES = ['quiz', 'baseline_assessment', 'after_assessment', 'assessment'];
export const VALID_REQUEST_STATUSES = ['pending', 'in_progress', 'fulfilled', 'rejected', 'cancelled', 'dismissed'];

/**
 * Normalize request type for consistent handling
 */
export function normalizeRequestType(type) {
  if (!type) return 'quiz';
  const t = String(type).toLowerCase().trim();
  if (t === 'baseline' || t === 'baseline_assessment') return 'baseline_assessment';
  if (t === 'after' || t === 'after_assessment' || t === 'final' || t === 'final_assessment') return 'after_assessment';
  if (t === 'assessment') return 'assessment';
  return 'quiz';
}

/**
 * Create or check a content request
 */
export async function createContentRequest({
  learnerEmail,
  learnerName = '',
  courseId,
  courseTitle = '',
  requestType = 'quiz',
  moduleId = null,
  moduleTitle = null,
  lessonId = null,
  lessonTitle = null,
  note = ''
}) {
  if (!learnerEmail) {
    throw new Error('Authenticated learner email is required.');
  }
  if (!courseId) {
    throw new Error('Course ID is required for a content request.');
  }

  const normalizedType = normalizeRequestType(requestType);
  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  // Resolve course title if missing
  let resolvedCourseTitle = courseTitle;
  if (!resolvedCourseTitle) {
    try {
      const course = await getCourseById(courseId);
      if (course) resolvedCourseTitle = course.title;
    } catch (e) {
      // Ignore
    }
  }

  // Deduplication check: check if active pending or in_progress request already exists
  const existingRequests = await getLearnerContentRequests(cleanEmail, courseId);
  const existingPending = existingRequests.find(
    r => (r.requestType === normalizedType || (normalizedType === 'assessment' && (r.requestType === 'baseline_assessment' || r.requestType === 'after_assessment' || r.requestType === 'assessment'))) &&
         (r.status === 'pending' || r.status === 'in_progress') &&
         (!lessonId || r.lessonId === lessonId)
  );

  const now = new Date().toISOString();

  if (existingPending) {
    return {
      success: true,
      alreadyRequested: true,
      request: existingPending,
      message: 'Your request has already been sent. Our training team is reviewing it.'
    };
  }

  const requestId = `req_${Date.now()}_${randomUUID().substring(0, 8)}`;
  const requestItem = {
    requestId,
    requesterId: cleanEmail,
    requesterName: learnerName || cleanEmail.split('@')[0],
    learnerEmail: cleanEmail, // for backwards compatibility
    learnerName: learnerName || cleanEmail.split('@')[0],
    requestType: normalizedType,
    courseId,
    courseTitleSnapshot: resolvedCourseTitle || 'Course',
    courseTitle: resolvedCourseTitle || 'Course', // backwards compatibility
    moduleId: moduleId || null,
    moduleTitleSnapshot: moduleTitle || null,
    lessonId: lessonId || null,
    lessonTitleSnapshot: lessonTitle || null,
    note: String(note || '').trim(),
    status: 'pending',
    fulfilledContentId: null,
    fulfilledContentType: null,
    requestedAt: now,
    acknowledgedAt: null,
    fulfilledAt: null,
    fulfilledBy: null,
    rejectionReason: null,
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
    message: `Your request for the ${normalizedType.replace('_', ' ')} has been submitted to the Admin team.`
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

  items = items.filter(r => (r.requesterId === cleanEmail || r.learnerEmail === cleanEmail));
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
    const norm = normalizeRequestType(filters.requestType);
    items = items.filter(r => r.requestType === norm || (norm === 'assessment' && (r.requestType === 'baseline_assessment' || r.requestType === 'after_assessment')));
  }
  if (filters.courseId && filters.courseId !== 'all') {
    items = items.filter(r => r.courseId === filters.courseId);
  }
  if (filters.search) {
    const q = String(filters.search).toLowerCase().trim();
    items = items.filter(
      r =>
        (r.requesterName || r.learnerName || '').toLowerCase().includes(q) ||
        (r.requesterId || r.learnerEmail || '').toLowerCase().includes(q) ||
        (r.courseTitleSnapshot || r.courseTitle || '').toLowerCase().includes(q) ||
        (r.courseId || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
}

/**
 * Automatic Request Fulfillment Trigger
 * Called automatically when a Quiz, Baseline Assessment, or After Assessment is published
 */
export async function fulfillPendingRequestsForContent({
  courseId,
  requestType, // 'quiz' | 'baseline_assessment' | 'after_assessment'
  contentType, // alias
  contentId,
  contentTitle = '',
  adminUser = null,
  adminEmail = null,
  adminName = null,
  req = null
}) {
  const effectiveType = requestType || contentType;
  if (!courseId || !effectiveType || !contentId) return [];

  const normType = normalizeRequestType(effectiveType);
  const allRequests = await getAllContentRequestsAdmin({ courseId });

  // Match pending or in_progress requests for this course and type
  const matchingRequests = allRequests.filter(r => 
    (r.status === 'pending' || r.status === 'in_progress') &&
    (r.requestType === normType || (r.requestType === 'assessment' && (normType === 'baseline_assessment' || normType === 'after_assessment')))
  );

  const fulfilledResults = [];
  const effectiveAdminEmail = adminEmail || adminUser?.email || 'admin@onecommunityely.com';
  const now = new Date().toISOString();

  for (const r of matchingRequests) {
    r.status = 'fulfilled';
    r.fulfilledContentId = contentId;
    r.fulfilledContentType = normType;
    r.fulfilledAt = now;
    r.fulfilledBy = effectiveAdminEmail;
    r.updatedAt = now;

    inMemoryContentRequests.set(r.requestId, r);

    try {
      const client = getClient();
      await client.send(
        new UpdateCommand({
          TableName: REQUESTS_TABLE,
          Key: { requestId: r.requestId },
          UpdateExpression: 'SET #s = :status, fulfilledContentId = :fcid, fulfilledContentType = :fct, fulfilledAt = :fAt, fulfilledBy = :fBy, updatedAt = :now',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: {
            ':status': 'fulfilled',
            ':fcid': contentId,
            ':fct': normType,
            ':fAt': now,
            ':fBy': adminEmail,
            ':now': now
          }
        })
      );
    } catch (err) {
      console.warn(`[contentRequestService] DynamoDB update failed for requestId ${r.requestId}:`, err.message);
    }

    // Determine target URL for learner action
    let actionUrl = `/courses/${courseId}/learn`;
    let typeLabel = 'quiz';
    if (normType === 'quiz') {
      actionUrl = `/take-quiz/${contentId}`;
      typeLabel = 'quiz';
    } else if (normType === 'baseline_assessment') {
      actionUrl = `/courses/${courseId}/baseline-assessment`;
      typeLabel = 'baseline assessment';
    } else if (normType === 'after_assessment') {
      actionUrl = `/courses/${courseId}/after-assessment`;
      typeLabel = 'final assessment';
    }

    const courseTitle = r.courseTitleSnapshot || r.courseTitle || 'your selected course';

    // Dispatch in-app notification to the learner
    const learnerEmail = r.requesterId || r.learnerEmail;
    if (learnerEmail) {
      await createNotification({
        recipientId: learnerEmail,
        type: 'requested_content_available',
        requestId: r.requestId,
        contentType: normType,
        contentId,
        courseId,
        title: `Requested ${typeLabel} is now available`,
        message: `Your requested ${typeLabel} for "${courseTitle}" is now ready and available to take.`,
        actionUrl
      }).catch(err => console.warn('Failed to dispatch notification:', err.message));
    }

    // Record action in Admin Activity History
    await recordAdminAction({
      admin: adminUser || { email: adminEmail, name: 'Admin' },
      action: 'Fulfilled Content Request',
      category: AuditCategories.LEARNER_MANAGEMENT,
      targetType: 'ContentRequest',
      targetId: r.requestId,
      targetName: `${typeLabel} for ${courseTitle}`,
      result: 'Success',
      description: `Fulfilled ${typeLabel} request from ${r.requesterName || learnerEmail} for course "${courseTitle}" with ${normType} ID ${contentId}`,
      metadata: { requestId: r.requestId, learnerEmail, courseId, contentId, contentType: normType },
      req
    }).catch(() => {});

    fulfilledResults.push(r);
  }

  return fulfilledResults;
}

/**
 * Link existing content to a request (Admin manual workflow)
 */
export async function linkExistingContentToRequest({
  requestId,
  contentId,
  contentType,
  adminUser = null,
  req = null
}) {
  if (!requestId || !contentId || !contentType) {
    throw new Error('requestId, contentId, and contentType are required.');
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
  const adminEmail = adminUser?.email || 'admin@onecommunityely.com';
  const normType = normalizeRequestType(contentType);

  item.status = 'fulfilled';
  item.fulfilledContentId = contentId;
  item.fulfilledContentType = normType;
  item.fulfilledAt = now;
  item.fulfilledBy = adminEmail;
  item.updatedAt = now;

  inMemoryContentRequests.set(requestId, item);

  try {
    const client = getClient();
    await client.send(
      new UpdateCommand({
        TableName: REQUESTS_TABLE,
        Key: { requestId },
        UpdateExpression: 'SET #s = :status, fulfilledContentId = :fcid, fulfilledContentType = :fct, fulfilledAt = :fAt, fulfilledBy = :fBy, updatedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':status': 'fulfilled',
          ':fcid': contentId,
          ':fct': normType,
          ':fAt': now,
          ':fBy': adminEmail,
          ':now': now
        }
      })
    );
  } catch (err) {
    console.warn(`[contentRequestService] DynamoDB update failed for requestId ${requestId}:`, err.message);
  }

  // Determine target action URL
  let actionUrl = `/courses/${item.courseId}/learn`;
  let typeLabel = 'quiz';
  if (normType === 'quiz') {
    actionUrl = `/take-quiz/${contentId}`;
    typeLabel = 'quiz';
  } else if (normType === 'baseline_assessment') {
    actionUrl = `/courses/${item.courseId}/baseline-assessment`;
    typeLabel = 'baseline assessment';
  } else if (normType === 'after_assessment') {
    actionUrl = `/courses/${item.courseId}/after-assessment`;
    typeLabel = 'final assessment';
  }

  const courseTitle = item.courseTitleSnapshot || item.courseTitle || 'your course';
  const learnerEmail = item.requesterId || item.learnerEmail;

  if (learnerEmail) {
    await createNotification({
      recipientId: learnerEmail,
      type: 'requested_content_available',
      requestId: item.requestId,
      contentType: normType,
      contentId,
      courseId: item.courseId,
      title: `Requested ${typeLabel} is now available`,
      message: `Your requested ${typeLabel} for "${courseTitle}" is now linked and ready to take.`,
      actionUrl
    }).catch(() => {});
  }

  await recordAdminAction({
    admin: adminUser || { email: adminEmail, name: 'Admin' },
    action: 'Linked Content to Request',
    category: AuditCategories.LEARNER_MANAGEMENT,
    targetType: 'ContentRequest',
    targetId: item.requestId,
    targetName: `${typeLabel} for ${courseTitle}`,
    result: 'Success',
    description: `Linked ${typeLabel} (${contentId}) to request ${item.requestId} for learner ${learnerEmail}`,
    metadata: { requestId: item.requestId, contentId, contentType: normType },
    req
  }).catch(() => {});

  return item;
}

/**
 * Reject a content request with reason (Admin only)
 */
export async function rejectContentRequest({
  requestId,
  rejectionReason = '',
  adminUser = null,
  req = null
}) {
  if (!requestId) {
    throw new Error('requestId is required.');
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
  const adminEmail = adminUser?.email || 'admin@onecommunityely.com';

  item.status = 'rejected';
  item.rejectionReason = String(rejectionReason || 'Content request could not be fulfilled at this time.').trim();
  item.resolvedBy = adminEmail;
  item.updatedAt = now;

  inMemoryContentRequests.set(requestId, item);

  try {
    const client = getClient();
    await client.send(
      new UpdateCommand({
        TableName: REQUESTS_TABLE,
        Key: { requestId },
        UpdateExpression: 'SET #s = :status, rejectionReason = :rReason, resolvedBy = :admin, updatedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':status': 'rejected',
          ':rReason': item.rejectionReason,
          ':admin': adminEmail,
          ':now': now
        }
      })
    );
  } catch (err) {
    console.warn(`[contentRequestService] DynamoDB update failed for requestId ${requestId}:`, err.message);
  }

  await recordAdminAction({
    admin: adminUser || { email: adminEmail, name: 'Admin' },
    action: 'Rejected Content Request',
    category: AuditCategories.LEARNER_MANAGEMENT,
    targetType: 'ContentRequest',
    targetId: item.requestId,
    targetName: item.courseTitleSnapshot || item.courseTitle || item.requestId,
    result: 'Success',
    description: `Rejected content request (${item.requestId}). Reason: ${item.rejectionReason}`,
    metadata: { requestId: item.requestId, rejectionReason: item.rejectionReason },
    req
  }).catch(() => {});

  return item;
}

/**
 * Update request status (Admin only - backwards compatibility)
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
