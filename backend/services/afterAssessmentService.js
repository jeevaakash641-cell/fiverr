/**
 * After Assessment & Before-vs-After Outcome Comparison Service
 * One Community Ely Online Training Centre
 * Tables:
 * - EduLearnAfterAssessments (PK: assessmentId)
 * - EduLearnAfterAssessmentResponses (PK: responseId)
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
import { getAssessmentById as getBaselineAssessmentById, getLearnerBaselineResponse } from './baselineAssessmentService.js';
import { getCourseProgress, calculateCourseProgress } from './progressService.js';
import { fulfillPendingRequestsForContent } from './contentRequestService.js';

const AFTER_ASSESSMENTS_TABLE = process.env.DYNAMODB_TABLE_AFTER_ASSESSMENTS || 'EduLearnAfterAssessments';
const AFTER_RESPONSES_TABLE = process.env.DYNAMODB_TABLE_AFTER_RESPONSES || 'EduLearnAfterAssessmentResponses';

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
export const inMemoryAfterAssessments = new Map();
export const inMemoryAfterResponses = new Map();

// Standard 1–5 Confidence Scale Labels
export const CONFIDENCE_RATING_LABELS = {
  1: 'Not confident',
  2: 'Slightly confident',
  3: 'Moderately confident',
  4: 'Confident',
  5: 'Very confident'
};

/**
 * Validation rules for After Assessment payload
 */
export function validateAfterAssessmentPayload(payload, forPublish = false) {
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
 * Create a new After Assessment (Admin only)
 */
export async function createAssessment(payload, createdBy = 'admin@onecommunityely.com') {
  const validationErrors = validateAfterAssessmentPayload(payload, payload.status === 'published');
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
  const assessmentId = payload.assessmentId || `after_${Date.now()}_${randomUUID().substring(0, 8)}`;
  const isPublished = payload.status === 'published';

  const formattedQuestions = (payload.questions || []).map((q, idx) => ({
    questionId: q.questionId || `q_after_${idx + 1}_${randomUUID().substring(0, 4)}`,
    type: q.type || 'confidence_rating',
    questionText: (q.questionText || '').trim(),
    baselineQuestionId: q.baselineQuestionId || null,
    placeholder: q.type === 'short_text' ? (q.placeholder || '').trim() : undefined,
    required: q.required !== false,
    order: q.order ?? idx
  }));

  const assessmentItem = {
    assessmentId,
    courseId: payload.courseId,
    courseTitle: course.title,
    baselineAssessmentId: payload.baselineAssessmentId || null,
    title: payload.title.trim(),
    instructions: payload.instructions?.trim() || 'This short assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test.',
    questions: formattedQuestions,
    status: payload.status || 'draft',
    version: 1,
    createdBy: createdBy || 'admin@onecommunityely.com',
    createdAt: now,
    updatedAt: now,
    publishedAt: isPublished ? now : null,
    archivedAt: payload.status === 'archived' ? now : null
  };

  if (isPublished) {
    await ensureSinglePublishedAfterAssessment(payload.courseId, assessmentId);
  }

  inMemoryAfterAssessments.set(assessmentId, assessmentItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: AFTER_ASSESSMENTS_TABLE,
      Item: assessmentItem
    }));
  } catch (err) {
    console.warn(`[afterAssessmentService] DynamoDB put failed for ${AFTER_ASSESSMENTS_TABLE}, using memory:`, err.message);
  }

  return assessmentItem;
}

/**
 * Auto-create After Assessment Draft from an existing Baseline Assessment
 * Preserves links to baselineQuestionId, updates wording for post-training, saves as draft.
 */
export async function createDraftFromBaseline(baselineAssessmentId, createdBy = 'admin@onecommunityely.com') {
  if (!baselineAssessmentId) {
    throw new Error('Baseline assessment ID is required.');
  }

  const baseline = await getBaselineAssessmentById(baselineAssessmentId, true);
  if (!baseline) {
    throw new Error(`Baseline assessment "${baselineAssessmentId}" not found.`);
  }

  // Adjust question text to represent post-training reflection
  const adaptedQuestions = (baseline.questions || []).map((bq, idx) => {
    let afterText = bq.questionText;

    if (bq.type === 'confidence_rating') {
      if (afterText.toLowerCase().startsWith('how confident are you about')) {
        afterText = afterText.replace(/how confident are you about/i, 'How confident are you now about');
      } else if (afterText.toLowerCase().startsWith('how confident do you feel about')) {
        afterText = afterText.replace(/how confident do you feel about/i, 'How confident do you feel now about');
      } else if (!afterText.toLowerCase().includes('now') && !afterText.toLowerCase().includes('after')) {
        afterText = `${afterText} (after completing course)`;
      }
    } else if (bq.type === 'short_text') {
      if (afterText.toLowerCase().includes('would you most like to learn')) {
        afterText = 'What was the most valuable thing you learned from this course?';
      }
    }

    return {
      questionId: `q_after_${Date.now()}_${idx + 1}`,
      type: bq.type,
      questionText: afterText,
      baselineQuestionId: bq.questionId, // Preserve authoritative link
      placeholder: bq.type === 'short_text' ? 'Reflect on your experience...' : undefined,
      required: bq.required !== false,
      order: idx
    };
  });

  // Also append a helpful final reflection question if not present
  adaptedQuestions.push({
    questionId: `q_after_${Date.now()}_reflection`,
    type: 'short_text',
    questionText: 'How will you apply what you have learned in your daily life or work?',
    baselineQuestionId: null,
    placeholder: 'Share your next steps or goals...',
    required: false,
    order: adaptedQuestions.length
  });

  const payload = {
    title: `${baseline.title.replace('Starting Benchmark', 'Final Outcome').replace('Starting Point', 'Final Outcome')} (After Training)`,
    courseId: baseline.courseId,
    baselineAssessmentId: baseline.assessmentId,
    instructions: 'This short assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test.',
    status: 'draft',
    questions: adaptedQuestions
  };

  return await createAssessment(payload, createdBy);
}

/**
 * Get After Assessment by ID
 */
export async function getAssessmentById(assessmentId, isAdmin = false) {
  if (!assessmentId) return null;

  let item = inMemoryAfterAssessments.get(assessmentId) || null;

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: AFTER_ASSESSMENTS_TABLE,
      Key: { assessmentId }
    }));
    if (result.Item) {
      item = result.Item;
      inMemoryAfterAssessments.set(assessmentId, item);
    }
  } catch (err) {
    // Rely on memory
  }

  if (!item) return null;

  if (!isAdmin && item.status !== 'published') {
    return null;
  }

  return item;
}

/**
 * List all After Assessments for Admin
 */
export async function getAllAssessmentsAdmin(filters = {}) {
  let items = Array.from(inMemoryAfterAssessments.values());

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: AFTER_ASSESSMENTS_TABLE
    }));
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryAfterAssessments.set(it.assessmentId, it));
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
 * Get active published After Assessment for a course
 */
export async function getPublishedAssessmentForCourse(courseId) {
  if (!courseId) return null;

  const course = await getCourseById(courseId);
  if (!course || course.status !== 'published') {
    return null;
  }

  let items = Array.from(inMemoryAfterAssessments.values());

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: AFTER_ASSESSMENTS_TABLE,
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
    // Rely on memory
  }

  const publishedList = items.filter(a => a.courseId === courseId && a.status === 'published');
  if (publishedList.length === 0) return null;

  publishedList.sort((a, b) => (b.version || 1) - (a.version || 1));
  return publishedList[0];
}

/**
 * Update After Assessment configuration (Admin only)
 */
export async function updateAssessment(assessmentId, payload, updatedBy = 'admin@onecommunityely.com') {
  const existing = await getAssessmentById(assessmentId, true);
  if (!existing) {
    throw new Error(`After assessment "${assessmentId}" not found.`);
  }

  const validationErrors = validateAfterAssessmentPayload(
    { ...existing, ...payload },
    payload.status === 'published' || existing.status === 'published'
  );
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(' ')}`);
  }

  const now = new Date().toISOString();

  let version = existing.version || 1;
  const questionsChanged = JSON.stringify(existing.questions) !== JSON.stringify(payload.questions || existing.questions);
  if (existing.status === 'published' && questionsChanged) {
    version += 1;
  }

  const formattedQuestions = (payload.questions || existing.questions || []).map((q, idx) => ({
    questionId: q.questionId || `q_after_${idx + 1}_${randomUUID().substring(0, 4)}`,
    type: q.type || 'confidence_rating',
    questionText: (q.questionText || '').trim(),
    baselineQuestionId: q.baselineQuestionId || null,
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

  if (payload.status === 'published' && existing.status !== 'published') {
    await ensureSinglePublishedAfterAssessment(updatedItem.courseId, assessmentId);
    updatedItem.publishedAt = now;
  }

  inMemoryAfterAssessments.set(assessmentId, updatedItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: AFTER_ASSESSMENTS_TABLE,
      Item: updatedItem
    }));
  } catch (err) {
    console.warn('[afterAssessmentService] DynamoDB update failed, using memory:', err.message);
  }

  // Automatic Request Fulfillment when after assessment is published
  if (updatedItem.status === 'published' && updatedItem.courseId) {
    fulfillPendingRequestsForContent({
      courseId: updatedItem.courseId,
      requestType: 'after_assessment',
      contentId: updatedItem.assessmentId,
      contentTitle: updatedItem.title,
      adminUser: { email: updatedBy }
    }).catch(err => console.warn('Automatic request fulfillment error for after assessment:', err.message));
  }

  return updatedItem;
}

/**
 * Update After Assessment status
 */
export async function updateAssessmentStatus(assessmentId, targetStatus, updatedBy = 'admin@onecommunityely.com') {
  const existing = await getAssessmentById(assessmentId, true);
  if (!existing) {
    throw new Error(`After assessment "${assessmentId}" not found.`);
  }

  if (!['draft', 'published', 'unpublished', 'archived'].includes(targetStatus)) {
    throw new Error(`Invalid status "${targetStatus}". Must be draft, published, unpublished, or archived.`);
  }

  if (targetStatus === 'published') {
    const errors = validateAfterAssessmentPayload(existing, true);
    if (errors.length > 0) {
      throw new Error(`Cannot publish assessment: ${errors.join(' ')}`);
    }

    const course = await getCourseById(existing.courseId);
    if (!course || course.status !== 'published') {
      throw new Error(`Cannot publish assessment because course "${course?.title || existing.courseId}" is not published.`);
    }

    await ensureSinglePublishedAfterAssessment(existing.courseId, assessmentId);
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

  inMemoryAfterAssessments.set(assessmentId, updatedItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: AFTER_ASSESSMENTS_TABLE,
      Item: updatedItem
    }));
  } catch (err) {
    console.warn('[afterAssessmentService] DynamoDB status update failed, using memory:', err.message);
  }

  // Automatic Request Fulfillment when status is changed to published
  if (targetStatus === 'published' && updatedItem.courseId) {
    fulfillPendingRequestsForContent({
      courseId: updatedItem.courseId,
      requestType: 'after_assessment',
      contentId: updatedItem.assessmentId,
      contentTitle: updatedItem.title,
      adminUser: { email: updatedBy }
    }).catch(err => console.warn('Automatic request fulfillment error for after assessment status change:', err.message));
  }

  return updatedItem;
}

/**
 * Ensure only one active published After Assessment per course
 */
async function ensureSinglePublishedAfterAssessment(courseId, currentAssessmentId) {
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
      inMemoryAfterAssessments.set(other.assessmentId, unpublished);
      try {
        await client.send(new PutCommand({
          TableName: AFTER_ASSESSMENTS_TABLE,
          Item: unpublished
        }));
      } catch (e) {}
    }
  }
}

/**
 * Soft archive After Assessment
 */
export async function deleteAssessment(assessmentId, deletedBy = 'admin@onecommunityely.com') {
  const existing = await getAssessmentById(assessmentId, true);
  if (!existing) {
    throw new Error(`After assessment "${assessmentId}" not found.`);
  }
  return await updateAssessmentStatus(assessmentId, 'archived', deletedBy);
}

// -------------------------------------------------------------
// LEARNER ELIGIBILITY & SUBMISSION
// -------------------------------------------------------------

/**
 * Authoritative Backend Check: Learner Eligibility for After Assessment
 * Must satisfy:
 * 1. Progress record exists.
 * 2. status === 'completed' OR progressPercentage === 100%.
 * 3. All required published lessons completed.
 */
export async function checkLearnerEligibility(courseId, learnerEmail) {
  if (!courseId || !learnerEmail) {
    return { eligible: false, reason: 'Course ID and learner identity required.' };
  }

  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  const progress = await getCourseProgress(courseId, cleanEmail);

  if (!progress) {
    return {
      eligible: false,
      reason: 'Course not yet started. Complete the required course content before taking the final assessment.'
    };
  }

  // Recalculate authoritatively to eliminate browser spoofing
  const calc = await calculateCourseProgress(courseId, progress.completedLessonIds || []);

  const isCompleted = progress.status === 'completed' || (calc.totalCount > 0 && calc.completedCount >= calc.totalCount);

  if (!isCompleted) {
    return {
      eligible: false,
      reason: 'Complete the required course content before taking the final assessment.',
      progressPercentage: calc.progressPercentage,
      completedCount: calc.completedCount,
      totalCount: calc.totalCount
    };
  }

  return {
    eligible: true,
    progressPercentage: 100,
    completedCount: calc.completedCount,
    totalCount: calc.totalCount
  };
}

/**
 * Deterministic unique response ID for After Assessment
 */
export function getAfterResponseId(cleanEmail, courseId, assessmentId) {
  return `after_resp_${cleanEmail}#${courseId}#${assessmentId}`;
}

/**
 * Compare linked baseline and final confidence ratings
 */
export function calculateBeforeAfterComparison(afterQuestions, afterAnswers, baselineResponse) {
  const baselineAnswers = baselineResponse?.answers || {};
  const questionComparisons = [];

  let sumBaseline = 0;
  let sumFinal = 0;
  let pairedCount = 0;

  let improvedCount = 0;
  let maintainedCount = 0;
  let reducedCount = 0;
  let unavailableCount = 0;

  for (const q of afterQuestions) {
    const finalAns = afterAnswers[q.questionId];

    if (q.type === 'confidence_rating') {
      const finalRating = finalAns?.ratingValue ?? null;
      let baselineRating = null;
      let outcome = null;
      let change = null;
      let status = 'unavailable';

      if (q.baselineQuestionId && baselineAnswers[q.baselineQuestionId]) {
        const baseAns = baselineAnswers[q.baselineQuestionId];
        if (baseAns.type === 'confidence_rating' && Number.isInteger(baseAns.ratingValue)) {
          baselineRating = baseAns.ratingValue;
          status = 'compared';
        }
      }

      if (status === 'compared' && Number.isInteger(finalRating) && Number.isInteger(baselineRating)) {
        change = finalRating - baselineRating;
        sumBaseline += baselineRating;
        sumFinal += finalRating;
        pairedCount += 1;

        if (change > 0) {
          outcome = 'improved';
          improvedCount += 1;
        } else if (change === 0) {
          outcome = 'maintained';
          maintainedCount += 1;
        } else {
          outcome = 'reduced';
          reducedCount += 1;
        }
      } else {
        unavailableCount += 1;
      }

      questionComparisons.push({
        questionId: q.questionId,
        baselineQuestionId: q.baselineQuestionId || null,
        questionText: q.questionText,
        type: 'confidence_rating',
        baselineRating,
        baselineLabel: baselineRating ? CONFIDENCE_RATING_LABELS[baselineRating] : null,
        finalRating,
        finalLabel: finalRating ? CONFIDENCE_RATING_LABELS[finalRating] : null,
        change,
        outcome,
        status
      });
    } else {
      // Short-text answers saved cleanly without false numeric comparison
      questionComparisons.push({
        questionId: q.questionId,
        baselineQuestionId: q.baselineQuestionId || null,
        questionText: q.questionText,
        type: 'short_text',
        answerText: finalAns?.answerText || '',
        status: 'text_response'
      });
    }
  }

  const averageBaseline = pairedCount > 0 ? Number((sumBaseline / pairedCount).toFixed(1)) : null;
  const averageFinal = pairedCount > 0 ? Number((sumFinal / pairedCount).toFixed(1)) : null;
  const averageChange = (averageFinal !== null && averageBaseline !== null)
    ? Number((averageFinal - averageBaseline).toFixed(1))
    : null;

  return {
    questionComparisons,
    averageBaseline,
    averageFinal,
    averageChange,
    improvedCount,
    maintainedCount,
    reducedCount,
    unavailableCount,
    pairedCount,
    baselineResponseFound: !!baselineResponse,
    hasValidComparison: pairedCount > 0
  };
}

/**
 * Submit learner answers for After Assessment
 */
export async function submitAfterResponse(assessmentId, learnerUser, answers = {}) {
  if (!assessmentId || !learnerUser || !learnerUser.email) {
    throw new Error('Assessment ID and authenticated learner identity are required.');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();

  // 1. Get published assessment
  const assessment = await getAssessmentById(assessmentId, false);
  if (!assessment) {
    throw new Error('Published after-assessment not found.');
  }

  // 2. Authoritatively verify course completion eligibility
  const eligibility = await checkLearnerEligibility(assessment.courseId, cleanEmail);
  if (!eligibility.eligible) {
    const err = new Error(eligibility.reason || 'Complete the required course content before taking the final assessment.');
    err.ineligible = true;
    throw err;
  }

  const responseId = getAfterResponseId(cleanEmail, assessment.courseId, assessmentId);

  // 3. Idempotency check: Return existing response without duplicate or overwrite
  const existingResponse = await getLearnerAfterResponse(assessment.courseId, cleanEmail);
  if (existingResponse && existingResponse.assessmentId === assessmentId) {
    return {
      success: true,
      alreadySubmitted: true,
      newlySubmitted: false,
      response: existingResponse,
      message: 'Your final assessment has already been submitted.'
    };
  }

  // 4. Validate inputs
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
        throw new Error(`Answer for "${q.questionText}" exceeds 1000 characters.`);
      }

      sanitizedAnswers[q.questionId] = {
        questionId: q.questionId,
        type: 'short_text',
        questionText: q.questionText,
        answerText: textVal
      };
    }
  }

  // 5. Load learner's Baseline response (if exists) for comparison
  const baselineResponse = await getLearnerBaselineResponse(assessment.courseId, cleanEmail);

  // 6. Compute comparison metrics
  const comparison = calculateBeforeAfterComparison(
    assessment.questions,
    sanitizedAnswers,
    baselineResponse
  );

  const now = new Date().toISOString();
  const responseItem = {
    responseId,
    assessmentId,
    assessmentVersion: assessment.version || 1,
    baselineAssessmentId: assessment.baselineAssessmentId || baselineResponse?.assessmentId || null,
    baselineAssessmentVersion: baselineResponse?.assessmentVersion || null,
    baselineResponseId: baselineResponse?.responseId || null,
    courseId: assessment.courseId,
    courseTitle: assessment.courseTitle || 'Course',
    learnerEmail: cleanEmail,
    learnerId: learnerUser.id || cleanEmail,
    learnerName: learnerUser.name || learnerUser.displayName || cleanEmail.split('@')[0],
    answers: sanitizedAnswers,
    comparison,
    submittedAt: now,
    createdAt: now
  };

  inMemoryAfterResponses.set(responseId, responseItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: AFTER_RESPONSES_TABLE,
      Item: responseItem
    }));
  } catch (err) {
    console.warn(`[afterAssessmentService] DynamoDB put failed for ${AFTER_RESPONSES_TABLE}, using memory:`, err.message);
  }

  return {
    success: true,
    alreadySubmitted: false,
    newlySubmitted: true,
    response: responseItem,
    message: 'Thank you. Your final course reflections and outcome comparison have been saved.'
  };
}

/**
 * Get learner's After Assessment response for a course
 */
export async function getLearnerAfterResponse(courseId, learnerEmail) {
  if (!courseId || !learnerEmail) return null;

  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  for (const resp of inMemoryAfterResponses.values()) {
    if (resp.courseId === courseId && resp.learnerEmail === cleanEmail) {
      return resp;
    }
  }

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: AFTER_RESPONSES_TABLE,
      FilterExpression: 'courseId = :cid AND learnerEmail = :em',
      ExpressionAttributeValues: {
        ':cid': courseId,
        ':em': cleanEmail
      }
    }));
    if (result.Items && result.Items.length > 0) {
      const item = result.Items[0];
      inMemoryAfterResponses.set(item.responseId, item);
      return item;
    }
  } catch (err) {
    // Rely on memory
  }

  return null;
}

/**
 * Retrieve all responses and outcome comparisons for an assessment (Admin only)
 */
export async function getAssessmentResponsesAdmin(assessmentId, filters = {}) {
  let items = Array.from(inMemoryAfterResponses.values()).filter(r => r.assessmentId === assessmentId);

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: AFTER_RESPONSES_TABLE,
      FilterExpression: 'assessmentId = :aid',
      ExpressionAttributeValues: { ':aid': assessmentId }
    }));
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryAfterResponses.set(it.responseId, it));
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
 * Get all after assessment responses across all assessments for admin reporting
 */
export async function getAllAfterAssessmentResponsesAdmin() {
  const map = new Map();
  for (const [id, item] of inMemoryAfterResponses.entries()) {
    map.set(id, item);
  }

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: AFTER_RESPONSES_TABLE
    }));
    const dbItems = result.Items || [];
    for (const item of dbItems) {
      if (!map.has(item.responseId)) {
        map.set(item.responseId, item);
      }
    }
  } catch (err) {
    console.warn('[afterAssessmentService] DynamoDB scan failed in getAllAfterAssessmentResponsesAdmin:', err.message);
  }

  return Array.from(map.values());
}

