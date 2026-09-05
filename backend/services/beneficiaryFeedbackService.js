/**
 * Beneficiary Feedback & Testimonial Consent Service
 * One Community Ely Online Training Centre
 * Table: EduLearnBeneficiaryFeedback (PK: feedbackId)
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
import { getCourseById } from './courseService.js';
import { getCourseProgress, calculateCourseProgress } from './progressService.js';
import { getPublishedAssessmentForCourse as getPublishedAfterAssessment, getLearnerAfterResponse } from './afterAssessmentService.js';

const FEEDBACK_TABLE = process.env.DYNAMODB_TABLE_BENEFICIARY_FEEDBACK || 'EduLearnBeneficiaryFeedback';

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

// In-memory store for offline / test resilience
export const inMemoryFeedback = new Map();

// 1–5 Scale Labels
export const RATING_SCALE_LABELS = {
  1: '1 — Not at all',
  2: '2 — Slightly',
  3: '3 — Moderately',
  4: '4 — Very',
  5: '5 — Extremely'
};

// Testimonial Consent Values
export const TESTIMONIAL_CONSENT_OPTIONS = {
  none: 'No, I do not give permission',
  anonymous: 'Yes, but only anonymously',
  named: 'Yes, my name may be used'
};

export const STANDARD_CONSENT_TEXT =
  'Do you give One Community Ely CIC permission to use your feedback as a testimonial or as part of an anonymised case study?';

export const CONSENT_VERSION = 1;

/**
 * Deterministic unique feedback key
 */
export function getFeedbackId(cleanEmail, courseId) {
  return `fb_${cleanEmail}#${courseId}`;
}

/**
 * Authoritative Backend Check: Learner Feedback Eligibility
 * Must satisfy:
 * 1. Progress record exists and course is 100% completed.
 * 2. If a published After Assessment exists, the learner must have submitted it.
 * 3. Whether feedback is already submitted.
 */
export async function checkFeedbackEligibility(courseId, learnerEmail) {
  if (!courseId || !learnerEmail) {
    return { eligible: false, reason: 'Course ID and learner identity required.' };
  }

  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  // 1. Authoritative progress check
  const progress = await getCourseProgress(courseId, cleanEmail);
  if (!progress) {
    return {
      eligible: false,
      reason: 'Course not yet started. Complete the required course content before providing feedback.',
      completed: false
    };
  }

  const calc = await calculateCourseProgress(courseId, progress.completedLessonIds || []);
  const isContentCompleted = progress.status === 'completed' || (calc.totalCount > 0 && calc.completedCount >= calc.totalCount);

  if (!isContentCompleted) {
    return {
      eligible: false,
      reason: 'Complete the required course content before providing feedback.',
      completed: false,
      progressPercentage: calc.progressPercentage
    };
  }

  // 2. After Assessment check (if one is published)
  const afterAssessment = await getPublishedAfterAssessment(courseId);
  let afterResponse = null;
  if (afterAssessment) {
    afterResponse = await getLearnerAfterResponse(courseId, cleanEmail);
    if (!afterResponse) {
      return {
        eligible: false,
        afterAssessmentRequired: true,
        afterAssessmentId: afterAssessment.assessmentId,
        reason: 'Please complete your final course reflection assessment before providing feedback.',
        completed: false
      };
    }
  }

  // 3. Check if feedback was already submitted
  const existingFeedback = await getLearnerFeedback(courseId, cleanEmail);
  if (existingFeedback) {
    return {
      eligible: false,
      alreadySubmitted: true,
      completed: true,
      feedback: existingFeedback,
      message: 'Feedback has already been submitted for this course.'
    };
  }

  return {
    eligible: true,
    alreadySubmitted: false,
    completed: false,
    afterAssessmentResponseId: afterResponse?.responseId || null
  };
}

/**
 * Validate feedback submission payload
 */
export function validateFeedbackPayload(payload) {
  const errors = [];

  // 1. Usefulness Rating (1-5)
  const useRating = Number(payload.usefulnessRating);
  if (!Number.isInteger(useRating) || useRating < 1 || useRating > 5) {
    errors.push('Question 1 ("How useful was this training?"): Rating must be an integer between 1 and 5.');
  }

  // 2. Confidence Rating (1-5)
  const confRating = Number(payload.confidenceRating);
  if (!Number.isInteger(confRating) || confRating < 1 || confRating > 5) {
    errors.push('Question 2 ("Do you feel more confident?"): Rating must be an integer between 1 and 5.');
  }

  // 3. Most useful learning (Long-text, required)
  const usefulText = (payload.mostUsefulLearning || '').trim();
  if (!usefulText) {
    errors.push('Question 3 ("What was the most useful thing you learned?"): A response is required.');
  } else if (usefulText.length > 2000) {
    errors.push('Question 3 exceeds maximum length of 2000 characters.');
  }

  // 4. Intended change (Long-text, required)
  const changeText = (payload.intendedChange || '').trim();
  if (!changeText) {
    errors.push('Question 4 ("What will you do differently?"): A response is required.');
  } else if (changeText.length > 2000) {
    errors.push('Question 4 exceeds maximum length of 2000 characters.');
  }

  // 5. Next learning (Long-text, optional)
  const nextText = (payload.nextLearning || '').trim();
  if (nextText.length > 2000) {
    errors.push('Question 5 ("What would you like to learn next?"): Exceeds maximum length of 2000 characters.');
  }

  // 6. Would recommend ('yes' | 'no')
  const recommend = String(payload.wouldRecommend || '').toLowerCase().trim();
  if (recommend !== 'yes' && recommend !== 'no') {
    errors.push('Question 6 ("Would you recommend this training?"): Must be "yes" or "no".');
  }

  // 7. Testimonial Consent ('none' | 'anonymous' | 'named', required choice, no default)
  const consent = String(payload.testimonialConsent || '').toLowerCase().trim();
  if (!['none', 'anonymous', 'named'].includes(consent)) {
    errors.push('Question 7 (Testimonial Consent): Please make a selection ("none", "anonymous", or "named").');
  }

  return errors;
}

/**
 * Submit Beneficiary Feedback
 */
export async function submitBeneficiaryFeedback(courseId, learnerUser, payload = {}) {
  if (!courseId || !learnerUser || !learnerUser.email) {
    throw new Error('Course ID and authenticated learner identity are required.');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();

  // 1. Authoritative Backend Eligibility Check
  const eligibility = await checkFeedbackEligibility(courseId, cleanEmail);
  if (!eligibility.eligible) {
    if (eligibility.alreadySubmitted) {
      return {
        success: true,
        alreadySubmitted: true,
        newlySubmitted: false,
        feedback: eligibility.feedback,
        message: 'Your feedback has already been saved.'
      };
    }
    const err = new Error(eligibility.reason || 'Not eligible to submit feedback.');
    err.ineligible = true;
    throw err;
  }

  // 2. Validate payload
  const validationErrors = validateFeedbackPayload(payload);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(' ')}`);
  }

  // 3. Course info snapshot
  const course = await getCourseById(courseId);
  const courseTitleSnapshot = course?.title || 'One Community Ely Course';

  const feedbackId = getFeedbackId(cleanEmail, courseId);
  const now = new Date().toISOString();

  const useRating = Number(payload.usefulnessRating);
  const confRating = Number(payload.confidenceRating);
  const recommend = String(payload.wouldRecommend).toLowerCase().trim();
  const consent = String(payload.testimonialConsent).toLowerCase().trim();

  const feedbackItem = {
    feedbackId,
    learnerEmail: cleanEmail,
    learnerId: learnerUser.id || cleanEmail,
    learnerName: learnerUser.name || learnerUser.displayName || cleanEmail.split('@')[0],
    courseId,
    courseTitle: courseTitleSnapshot,
    afterAssessmentResponseId: eligibility.afterAssessmentResponseId || null,
    usefulnessRating: useRating,
    usefulnessLabel: RATING_SCALE_LABELS[useRating],
    confidenceRating: confRating,
    confidenceLabel: RATING_SCALE_LABELS[confRating],
    mostUsefulLearning: (payload.mostUsefulLearning || '').trim(),
    intendedChange: (payload.intendedChange || '').trim(),
    nextLearning: (payload.nextLearning || '').trim() || null,
    wouldRecommend: recommend,
    testimonialConsent: consent,
    consentText: STANDARD_CONSENT_TEXT,
    consentVersion: CONSENT_VERSION,
    consentGivenAt: now,
    consentWithdrawn: false,
    consentWithdrawnAt: null,
    status: 'active',
    version: 1,
    submittedAt: now,
    createdAt: now,
    updatedAt: now
  };

  inMemoryFeedback.set(feedbackId, feedbackItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: FEEDBACK_TABLE,
      Item: feedbackItem
    }));
  } catch (err) {
    console.warn(`[beneficiaryFeedbackService] DynamoDB put failed for ${FEEDBACK_TABLE}, using memory:`, err.message);
  }

  return {
    success: true,
    alreadySubmitted: false,
    newlySubmitted: true,
    feedback: feedbackItem,
    message: 'Thank you for sharing your experience. Your feedback will help One Community Ely improve future training.'
  };
}

/**
 * Get learner's own feedback for a course
 */
export async function getLearnerFeedback(courseId, learnerEmail) {
  if (!courseId || !learnerEmail) return null;

  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  const feedbackId = getFeedbackId(cleanEmail, courseId);

  let item = inMemoryFeedback.get(feedbackId) || null;

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: FEEDBACK_TABLE,
      Key: { feedbackId }
    }));
    if (result.Item) {
      item = result.Item;
      inMemoryFeedback.set(feedbackId, item);
    }
  } catch (err) {
    // Rely on memory
  }

  return item;
}

/**
 * Get single feedback item by ID (Admin only)
 */
export async function getFeedbackById(feedbackId) {
  if (!feedbackId) return null;

  let item = inMemoryFeedback.get(feedbackId) || null;

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: FEEDBACK_TABLE,
      Key: { feedbackId }
    }));
    if (result.Item) {
      item = result.Item;
      inMemoryFeedback.set(feedbackId, item);
    }
  } catch (err) {
    // Rely on memory
  }

  return item;
}

/**
 * List all feedback for Admin with filters
 */
export async function getAllFeedbackAdmin(filters = {}) {
  let items = Array.from(inMemoryFeedback.values());

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: FEEDBACK_TABLE
    }));
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryFeedback.set(it.feedbackId, it));
    }
  } catch (err) {
    // Rely on memory
  }

  if (filters.courseId && filters.courseId !== 'all') {
    items = items.filter(f => f.courseId === filters.courseId);
  }

  if (filters.recommendation && filters.recommendation !== 'all') {
    items = items.filter(f => f.wouldRecommend === filters.recommendation);
  }

  if (filters.consent && filters.consent !== 'all') {
    if (filters.consent === 'withdrawn') {
      items = items.filter(f => f.consentWithdrawn === true);
    } else {
      items = items.filter(f => f.testimonialConsent === filters.consent && !f.consentWithdrawn);
    }
  }

  if (filters.status && filters.status !== 'all') {
    items = items.filter(f => f.status === filters.status);
  } else {
    items = items.filter(f => f.status !== 'archived');
  }

  if (filters.search) {
    const q = String(filters.search).toLowerCase().trim();
    items = items.filter(f =>
      (f.learnerName || '').toLowerCase().includes(q) ||
      (f.learnerEmail || '').toLowerCase().includes(q) ||
      (f.courseTitle || '').toLowerCase().includes(q) ||
      (f.mostUsefulLearning || '').toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  return items;
}

/**
 * Record Testimonial Consent Withdrawal (Admin only)
 * Sets consentWithdrawn: true without deleting underlying feedback.
 */
export async function recordConsentWithdrawal(feedbackId, adminEmail = 'admin@onecommunityely.com') {
  const existing = await getFeedbackById(feedbackId);
  if (!existing) {
    throw new Error(`Feedback record "${feedbackId}" not found.`);
  }

  const now = new Date().toISOString();
  const updatedItem = {
    ...existing,
    consentWithdrawn: true,
    consentWithdrawnAt: now,
    updatedAt: now,
    updatedBy: adminEmail
  };

  inMemoryFeedback.set(feedbackId, updatedItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: FEEDBACK_TABLE,
      Item: updatedItem
    }));
  } catch (err) {
    console.warn('[beneficiaryFeedbackService] DynamoDB update failed, using memory:', err.message);
  }

  return updatedItem;
}

/**
 * Soft Archive Feedback (Admin only)
 */
export async function archiveFeedback(feedbackId, adminEmail = 'admin@onecommunityely.com') {
  const existing = await getFeedbackById(feedbackId);
  if (!existing) {
    throw new Error(`Feedback record "${feedbackId}" not found.`);
  }

  const now = new Date().toISOString();
  const updatedItem = {
    ...existing,
    status: 'archived',
    archivedAt: now,
    updatedAt: now,
    updatedBy: adminEmail
  };

  inMemoryFeedback.set(feedbackId, updatedItem);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: FEEDBACK_TABLE,
      Item: updatedItem
    }));
  } catch (err) {
    console.warn('[beneficiaryFeedbackService] DynamoDB archive failed, using memory:', err.message);
  }

  return updatedItem;
}

export const getAllFeedbackSubmissions = getAllFeedbackAdmin;

