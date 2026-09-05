/**
 * Baseline Assessment Service — One Community Ely Online Training Centre
 * Manages Before/Baseline Assessments and learner responses.
 * Tables:
 * - EduLearnBaselineAssessments (PK: assessmentId)
 * - EduLearnBaselineResponses (PK: responseId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { getCourseById } from './courseService.js';

const ASSESSMENTS_TABLE = process.env.DYNAMODB_TABLE_BASELINE_ASSESSMENTS || 'EduLearnBaselineAssessments';
const RESPONSES_TABLE = process.env.DYNAMODB_TABLE_BASELINE_RESPONSES || 'EduLearnBaselineResponses';

let docClient = null;

function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
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

// In-memory fallbacks for resilient offline / test operation
export const inMemoryAssessments = new Map();
export const inMemoryResponses = new Map();

// Standard 1–5 Confidence Scale Labels
export const CONFIDENCE_RATING_LABELS = {
  1: 'Not confident',
  2: 'Slightly confident',
  3: 'Moderately confident',
  4: 'Confident',
  5: 'Very confident'
};

/**
 * Validation rules for Baseline Assessment payload
 */
export function validateAssessmentPayload(payload, forPublish = false) {
  const errors = [];

  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.push('Assessment title is required.');
  }

  if (!payload.courseId || typeof payload.courseId !== 'string' || !payload.courseId.trim()) {
    errors.push('A valid course association is required.');
  }

  const questions = payload.questions || [];

  if (forPublish) {
    if (!Array.isArray(questions) || questions.length === 0) {
      errors.push('At least one question is required before publishing.');
    }
  }

  if (Array.isArray(questions)) {
    const seenIds = new Set();
    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.questionId) {
        errors.push(`Question #${qNum} must have a unique questionId.`);
      } else if (seenIds.has(q.questionId)) {
        errors.push(`Duplicate questionId "${q.questionId}" detected at Question #${qNum}.`);
      } else {
        seenIds.add(q.questionId);
      }

      if (forPublish) {
        if (!q.questionText || typeof q.questionText !== 'string' || !q.questionText.trim()) {
          errors.push(`Question #${qNum} must have question text.`);
        }
        if (!['short_text', 'confidence_rating'].includes(q.type)) {
          errors.push(`Question #${qNum} must have type 'short_text' or 'confidence_rating'.`);
        }
      }
    });
  }

  return errors;
}

/**
 * Create a new baseline assessment (Admin only)
 */
export async function createAssessment(payload, createdBy = 'admin@onecommunityely.com') {
  const validationErrors = validateAssessmentPayload(payload, payload.status === 'published');
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(' ')}`);
  }

  // Verify course exists
  const course = await getCourseById(payload.courseId);
  if (!course) {
    throw new Error(`Associated course "${payload.courseId}" does not exist.`);
  }

  if (payload.status === 'published' && course.status !== 'published') {
    throw new Error(`Cannot publish an assessment for course "${course.title}" because the course is ${course.status}.`);
  }

  const now = new Date().toISOString();
  const assessmentId = payload.assessmentId || `base_${Date.now()}_${randomUUID().substring(0, 8)}`;
  const isPublished = payload.status === 'published';

  // Format questions
  const formattedQuestions = (payload.questions || []).map((q, idx) => ({
    questionId: q.questionId || `q_base_${idx + 1}_${randomUUID().substring(0, 4)}`,
    type: q.type || 'short_text',
    questionText: (q.questionText || '').trim(),
    placeholder: q.type === 'short_text' ? (q.placeholder || '').trim() : undefined,
    required: q.required !== false,
    order: q.order ?? idx
  }));

  const assessmentItem = {
    assessmentId,
    courseId: payload.courseId,
    courseTitle: course.title,
    title: payload.title.trim(),
    instructions: payload.instructions?.trim() || 'This short assessment helps us understand your starting point. It is not a test, and there are no pass or fail results.',
    questions: formattedQuestions,
    status: payload.status || 'draft',
    version: 1,
    createdBy: createdBy || 'admin@onecommunityely.com',
    createdAt: now,
    updatedAt: now,
    publishedAt: isPublished ? now : null,
    archivedAt: payload.status === 'archived' ? now : null
  };

  // If publishing, ensure only one active published assessment for this course
  if (isPublished) {
    await ensureSinglePublishedAssessment(payload.courseId, assessmentId);
  }

  inMemoryAssessments.set(assessmentId, assessmentItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: ASSESSMENTS_TABLE,
      Item: assessmentItem
    }));
  } catch (err) {
    console.warn(`[baselineService] DynamoDB put failed for ${ASSESSMENTS_TABLE}, using memory:`, err.message);
  }

  return assessmentItem;
}

/**
 * Get assessment by ID
 */
export async function getAssessmentById(assessmentId, isAdmin = false) {
  if (!assessmentId) return null;

  let item = inMemoryAssessments.get(assessmentId) || null;

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: ASSESSMENTS_TABLE,
      Key: { assessmentId }
    }));
    if (result.Item) {
      item = result.Item;
      inMemoryAssessments.set(assessmentId, item);
    }
  } catch (err) {
    // Rely on memory
  }

  if (!item) return null;

  // Non-admins can only access published assessments
  if (!isAdmin && item.status !== 'published') {
    return null;
  }

  return item;
}

/**
 * List all assessments for Admin (supports filtering by course & status)
 */
export async function getAllAssessmentsAdmin(filters = {}) {
  let items = Array.from(inMemoryAssessments.values());

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: ASSESSMENTS_TABLE
    }));
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryAssessments.set(it.assessmentId, it));
    }
  } catch (err) {
    // Rely on memory
  }

  if (filters.courseId && filters.courseId !== 'all') {
    items = items.filter(a => a.courseId === filters.courseId);
  }
  if (filters.status && filters.status !== 'all') {
    items = items.filter(a => a.status === filters.status);
  }

  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
}

/**
 * Get the active published baseline assessment for a course
 */
export async function getPublishedAssessmentForCourse(courseId) {
  if (!courseId) return null;

  // Check if course exists and is published
  const course = await getCourseById(courseId);
  if (!course || course.status !== 'published') {
    return null;
  }

  let items = Array.from(inMemoryAssessments.values());

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: ASSESSMENTS_TABLE,
      FilterExpression: 'courseId = :cid AND #st = :pub',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':cid': courseId,
        ':pub': 'published'
      }
    }));
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
    }
  } catch (err) {
    // Rely on memory filter
  }

  const publishedList = items.filter(a => a.courseId === courseId && a.status === 'published');
  if (publishedList.length === 0) return null;

  // Return the latest version
  publishedList.sort((a, b) => (b.version || 1) - (a.version || 1));
  return publishedList[0];
}

/**
 * Update baseline assessment configuration (Admin only)
 */
export async function updateAssessment(assessmentId, payload, updatedBy = 'admin@onecommunityely.com') {
  const existing = await getAssessmentById(assessmentId, true);
  if (!existing) {
    throw new Error(`Baseline assessment "${assessmentId}" not found.`);
  }

  const validationErrors = validateAssessmentPayload({ ...existing, ...payload }, payload.status === 'published' || existing.status === 'published');
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(' ')}`);
  }

  const now = new Date().toISOString();

  // If questions changed on an already published assessment, increment version to preserve history
  let version = existing.version || 1;
  const questionsChanged = JSON.stringify(existing.questions) !== JSON.stringify(payload.questions || existing.questions);
  if (existing.status === 'published' && questionsChanged) {
    version += 1;
  }

  const formattedQuestions = (payload.questions || existing.questions || []).map((q, idx) => ({
    questionId: q.questionId || `q_base_${idx + 1}_${randomUUID().substring(0, 4)}`,
    type: q.type || 'short_text',
    questionText: (q.questionText || '').trim(),
    placeholder: q.type === 'short_text' ? (q.placeholder || '').trim() : undefined,
    required: q.required !== false,
    order: q.order ?? idx
  }));

  const updatedItem = {
    ...existing,
    ...payload,
    questions: formattedQuestions,
    version,
    updatedAt: now,
    updatedBy
  };

  // If changing status to published, ensure single active published assessment
  if (payload.status === 'published' && existing.status !== 'published') {
    await ensureSinglePublishedAssessment(updatedItem.courseId, assessmentId);
    updatedItem.publishedAt = now;
  }

  inMemoryAssessments.set(assessmentId, updatedItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: ASSESSMENTS_TABLE,
      Item: updatedItem
    }));
  } catch (err) {
    console.warn('[baselineService] DynamoDB update failed, using memory:', err.message);
  }

  return updatedItem;
}

/**
 * Update assessment status (draft, published, unpublished, archived)
 */
export async function updateAssessmentStatus(assessmentId, targetStatus, updatedBy = 'admin@onecommunityely.com') {
  const existing = await getAssessmentById(assessmentId, true);
  if (!existing) {
    throw new Error(`Baseline assessment "${assessmentId}" not found.`);
  }

  if (!['draft', 'published', 'unpublished', 'archived'].includes(targetStatus)) {
    throw new Error(`Invalid status "${targetStatus}". Must be draft, published, unpublished, or archived.`);
  }

  if (targetStatus === 'published') {
    const errors = validateAssessmentPayload(existing, true);
    if (errors.length > 0) {
      throw new Error(`Cannot publish assessment: ${errors.join(' ')}`);
    }

    const course = await getCourseById(existing.courseId);
    if (!course || course.status !== 'published') {
      throw new Error(`Cannot publish assessment because course "${course?.title || existing.courseId}" is not published.`);
    }

    await ensureSinglePublishedAssessment(existing.courseId, assessmentId);
  }

  const now = new Date().toISOString();
  const updatedItem = {
    ...existing,
    status: targetStatus,
    updatedAt: now,
    updatedBy,
    publishedAt: targetStatus === 'published' ? (existing.publishedAt || now) : existing.publishedAt,
    archivedAt: targetStatus === 'archived' ? now : existing.archivedAt
  };

  inMemoryAssessments.set(assessmentId, updatedItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: ASSESSMENTS_TABLE,
      Item: updatedItem
    }));
  } catch (err) {
    console.warn('[baselineService] DynamoDB status update failed, using memory:', err.message);
  }

  return updatedItem;
}

/**
 * Ensure only one active published baseline assessment exists per course
 */
async function ensureSinglePublishedAssessment(courseId, currentAssessmentId) {
  const allAssessments = await getAllAssessmentsAdmin({ courseId });
  const client = getClient();
  const now = new Date().toISOString();

  for (const other of allAssessments) {
    if (other.assessmentId !== currentAssessmentId && other.status === 'published') {
      const unpublished = {
        ...other,
        status: 'unpublished',
        updatedAt: now
      };
      inMemoryAssessments.set(other.assessmentId, unpublished);
      try {
        await client.send(new PutCommand({
          TableName: ASSESSMENTS_TABLE,
          Item: unpublished
        }));
      } catch (e) {}
    }
  }
}

/**
 * Soft delete / archive assessment
 */
export async function deleteAssessment(assessmentId, deletedBy = 'admin@onecommunityely.com') {
  const existing = await getAssessmentById(assessmentId, true);
  if (!existing) {
    throw new Error(`Baseline assessment "${assessmentId}" not found.`);
  }

  // Soft archive to protect learner historical submissions
  return await updateAssessmentStatus(assessmentId, 'archived', deletedBy);
}

// -------------------------------------------------------------
// LEARNER SUBMISSION & RESPONSE HANDLING
// -------------------------------------------------------------

/**
 * Deterministic unique response ID generator
 */
export function getResponseId(cleanEmail, courseId, assessmentId) {
  return `resp_${cleanEmail}#${courseId}#${assessmentId}`;
}

/**
 * Submit learner answers for a baseline assessment
 */
export async function submitBaselineResponse(assessmentId, learnerUser, answers = {}) {
  if (!assessmentId || !learnerUser || !learnerUser.email) {
    throw new Error('Assessment ID and authenticated learner identity are required.');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();
  const assessment = await getAssessmentById(assessmentId, false);
  if (!assessment) {
    throw new Error('Published baseline assessment not found.');
  }

  const responseId = getResponseId(cleanEmail, assessment.courseId, assessmentId);

  // Idempotency check: If response already exists, return it without duplicate or overwrite
  const existingResponse = await getLearnerBaselineResponse(assessment.courseId, cleanEmail);
  if (existingResponse && existingResponse.assessmentId === assessmentId) {
    return {
      success: true,
      alreadySubmitted: true,
      newlySubmitted: false,
      response: existingResponse,
      message: 'Your baseline assessment has already been submitted.'
    };
  }

  // Validate required questions and confidence ratings
  const sanitizedAnswers = {};

  for (const q of assessment.questions) {
    const rawVal = answers[q.questionId];

    if (q.type === 'confidence_rating') {
      if (q.required && (rawVal === undefined || rawVal === null || rawVal === '')) {
        throw new Error(`Please provide a rating for: "${q.questionText}"`);
      }

      if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
        const rating = Number(rawVal);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          throw new Error(`Confidence rating for "${q.questionText}" must be an integer between 1 and 5.`);
        }
        sanitizedAnswers[q.questionId] = {
          questionId: q.questionId,
          type: 'confidence_rating',
          questionText: q.questionText,
          ratingValue: rating,
          ratingLabel: CONFIDENCE_RATING_LABELS[rating]
        };
      }
    } else if (q.type === 'short_text') {
      const textVal = typeof rawVal === 'string' ? rawVal.trim() : '';

      if (q.required && !textVal) {
        throw new Error(`Please provide an answer for: "${q.questionText}"`);
      }

      if (textVal.length > 1000) {
        throw new Error(`Answer for "${q.questionText}" exceeds maximum 1000 characters limit.`);
      }

      sanitizedAnswers[q.questionId] = {
        questionId: q.questionId,
        type: 'short_text',
        questionText: q.questionText,
        answerText: textVal
      };
    }
  }

  const now = new Date().toISOString();
  const responseItem = {
    responseId,
    assessmentId,
    assessmentVersion: assessment.version || 1,
    courseId: assessment.courseId,
    courseTitle: assessment.courseTitle || 'Course',
    learnerEmail: cleanEmail,
    learnerId: learnerUser.id || cleanEmail,
    learnerName: learnerUser.name || learnerUser.displayName || cleanEmail.split('@')[0],
    answers: sanitizedAnswers,
    submittedAt: now,
    createdAt: now
  };

  inMemoryResponses.set(responseId, responseItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: RESPONSES_TABLE,
      Item: responseItem
    }));
  } catch (err) {
    console.warn(`[baselineService] DynamoDB put failed for ${RESPONSES_TABLE}, using memory:`, err.message);
  }

  return {
    success: true,
    alreadySubmitted: false,
    newlySubmitted: true,
    response: responseItem,
    message: 'Thank you. Your starting-point assessment has been saved. You can now begin your course.'
  };
}

/**
 * Get learner's submitted baseline response for a specific course
 */
export async function getLearnerBaselineResponse(courseId, learnerEmail) {
  if (!courseId || !learnerEmail) return null;

  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  // 1. Check memory cache first
  for (const resp of inMemoryResponses.values()) {
    if (resp.courseId === courseId && resp.learnerEmail === cleanEmail) {
      return resp;
    }
  }

  // 2. Check DynamoDB
  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: RESPONSES_TABLE,
      FilterExpression: 'courseId = :cid AND learnerEmail = :em',
      ExpressionAttributeValues: {
        ':cid': courseId,
        ':em': cleanEmail
      }
    }));
    if (result.Items && result.Items.length > 0) {
      const item = result.Items[0];
      inMemoryResponses.set(item.responseId, item);
      return item;
    }
  } catch (err) {
    // Rely on memory
  }

  return null;
}

/**
 * Retrieve all responses for an assessment (Admin only)
 */
export async function getAssessmentResponsesAdmin(assessmentId, filters = {}) {
  let items = Array.from(inMemoryResponses.values()).filter(r => r.assessmentId === assessmentId);

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: RESPONSES_TABLE,
      FilterExpression: 'assessmentId = :aid',
      ExpressionAttributeValues: { ':aid': assessmentId }
    }));
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryResponses.set(it.responseId, it));
    }
  } catch (err) {
    // Rely on memory
  }

  if (filters.search) {
    const q = String(filters.search).toLowerCase().trim();
    items = items.filter(r =>
      (r.learnerName || '').toLowerCase().includes(q) ||
      (r.learnerEmail || '').toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  return items;
}

/**
 * Get all baseline responses across all assessments for admin reporting
 */
export async function getAllBaselineResponsesAdmin() {
  const map = new Map();
  for (const [id, item] of inMemoryResponses.entries()) {
    map.set(id, item);
  }

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: RESPONSES_TABLE
    }));
    const dbItems = result.Items || [];
    for (const item of dbItems) {
      if (!map.has(item.responseId)) {
        map.set(item.responseId, item);
      }
    }
  } catch (err) {
    console.warn('[baselineService] DynamoDB scan failed in getAllBaselineResponsesAdmin:', err.message);
  }

  return Array.from(map.values());
}

