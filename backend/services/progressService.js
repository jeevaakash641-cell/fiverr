/**
 * Course Progress Service — tracks and manages per-course learner progress in DynamoDB
 * Table: EduLearnCourseProgress (partition key: progressId = learnerEmail#courseId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getCourseById } from './courseService.js';
import { getModulesByCourse } from './moduleService.js';
import { getLessonsByCourse, getLessonById } from './lessonService.js';
import { getPublishedQuizzesForLearner, getLearnerQuizAttempts } from './quizService.js';
import { saveCourseSelection, getLearnerSelections } from './courseSelectionService.js';
import { getPublishedAssessmentForCourse, getLearnerBaselineResponse } from './baselineAssessmentService.js';

const TABLE_NAME = process.env.DYNAMODB_TABLE_COURSE_PROGRESS || 'EduLearnCourseProgress';

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

// In-memory fallback map to guarantee resilience in dev and testing
export const inMemoryProgress = new Map();

/**
 * Generate deterministic partition key for a learner and course
 */
export function getProgressId(learnerEmail, courseId) {
  if (!learnerEmail || !courseId) return null;
  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  const cleanCourseId = String(courseId).trim();
  return `${cleanEmail}#${cleanCourseId}`;
}

/**
 * Retrieve published modules and lessons properly sorted in curriculum sequence
 */
export async function getSortedPublishedLessons(courseId) {
  const publishedModules = await getModulesByCourse(courseId, false);
  const moduleOrderMap = new Map();
  publishedModules.forEach((m, idx) => moduleOrderMap.set(m.moduleId, m.orderIndex ?? idx));

  let publishedLessons = await getLessonsByCourse(courseId, false);
  publishedLessons.sort((a, b) => {
    const modOrderA = moduleOrderMap.get(a.moduleId) ?? 999;
    const modOrderB = moduleOrderMap.get(b.moduleId) ?? 999;
    if (modOrderA !== modOrderB) return modOrderA - modOrderB;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });

  return { publishedModules, publishedLessons };
}

/**
 * Authoritatively calculate course progress percentage based strictly on published lessons
 */
export async function calculateCourseProgress(courseId, completedLessonIds = []) {
  const publishedLessons = await getLessonsByCourse(courseId, false);
  const totalRequired = publishedLessons.length;

  if (totalRequired === 0) {
    return {
      progressPercentage: 100,
      completedCount: 0,
      totalCount: 0,
      publishedLessons
    };
  }

  const publishedLessonIdSet = new Set(publishedLessons.map(l => l.lessonId));
  const uniqueCompleted = Array.from(new Set(completedLessonIds || []));
  const validCompleted = uniqueCompleted.filter(id => publishedLessonIdSet.has(id));
  const completedCount = validCompleted.length;
  const percentage = Math.min(100, Math.max(0, Math.round((completedCount / totalRequired) * 100)));

  return {
    progressPercentage: percentage,
    completedCount,
    totalCount: totalRequired,
    publishedLessons
  };
}

/**
 * Verify whether all required quizzes attached to a lesson have been satisfied
 */
export async function verifyLessonQuizRequirements(courseId, lessonId, learnerEmail) {
  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  const quizzes = await getPublishedQuizzesForLearner({ courseId, lessonId });

  if (!quizzes || quizzes.length === 0) {
    return { satisfied: true, quizzes: [] };
  }

  for (const quiz of quizzes) {
    const attempts = await getLearnerQuizAttempts(quiz.quizId, cleanEmail);
    if (!attempts || attempts.length === 0) {
      return {
        satisfied: false,
        incompleteQuiz: quiz,
        reason: `You must complete the required quiz "${quiz.title}" before marking this lesson as complete.`
      };
    }

    const passingScore = Number(quiz.passingScore ?? 70);
    if (passingScore > 0) {
      const hasPassed = attempts.some(a => a.passed === true || Number(a.percentage) >= passingScore);
      if (!hasPassed) {
        const bestScore = Math.max(...attempts.map(a => Number(a.percentage) || 0));
        return {
          satisfied: false,
          incompleteQuiz: quiz,
          reason: `You scored ${bestScore}%, but a passing score of ${passingScore}% is required on "${quiz.title}" to complete this lesson.`
        };
      }
    }
  }

  return { satisfied: true, quizzes };
}

/**
 * Retrieve progress record for a learner on a specific course
 */
export async function getCourseProgress(courseId, learnerEmail) {
  if (!courseId || !learnerEmail) return null;
  const progressId = getProgressId(learnerEmail, courseId);
  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { progressId }
    }));
    if (result.Item) {
      inMemoryProgress.set(progressId, result.Item);
      return result.Item;
    }
  } catch (err) {
    // Fall back to in-memory progress cache
  }

  return inMemoryProgress.get(progressId) || null;
}

/**
 * Start a course: creates initial progress record if not exists
 * Idempotent: Does not duplicate or reset if already started
 */
export async function startCourse(courseId, learnerUser) {
  if (!courseId || !learnerUser || !learnerUser.email) {
    throw new Error('Course ID and authenticated learner identity are required to start a course');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();
  const progressId = getProgressId(cleanEmail, courseId);

  // 1. Verify course exists and is published
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error(`Course "${courseId}" does not exist`);
  }
  if (course.status !== 'published') {
    throw new Error(`Course "${course.title}" is not currently published`);
  }

  // 2. Check for existing progress
  const existing = await getCourseProgress(courseId, cleanEmail);

  // Check if course has an active published baseline assessment and if learner must submit it
  // Backward compatibility: Only learners who have not yet started the course are required to complete it
  if (!existing || existing.status === 'not_started') {
    const baselineAssessment = await getPublishedAssessmentForCourse(courseId);
    if (baselineAssessment) {
      const submittedResponse = await getLearnerBaselineResponse(courseId, cleanEmail);
      if (!submittedResponse) {
        const err = new Error(`A baseline assessment must be completed before starting "${course.title}".`);
        err.baselineRequired = true;
        err.assessmentId = baselineAssessment.assessmentId;
        err.courseId = courseId;
        err.courseTitle = course.title;
        throw err;
      }
    }
  }

  if (existing) {
    // If not started, bump to in_progress
    if (existing.status === 'not_started') {
      const now = new Date().toISOString();
      const updated = {
        ...existing,
        status: 'in_progress',
        startedAt: existing.startedAt || now,
        lastAccessedAt: now,
        updatedAt: now
      };
      await saveProgressRecord(updated);
      return updated;
    }
    return existing;
  }

  // 3. Load published modules and lessons in order
  const { publishedModules, publishedLessons } = await getSortedPublishedLessons(courseId);

  const firstLesson = publishedLessons.length > 0 ? publishedLessons[0] : null;
  const firstModule = firstLesson
    ? (publishedModules.find(m => m.moduleId === firstLesson.moduleId) || null)
    : (publishedModules[0] || null);

  const now = new Date().toISOString();
  const calc = await calculateCourseProgress(courseId, []);

  const newProgress = {
    progressId,
    learnerEmail: cleanEmail,
    learnerId: learnerUser.id || cleanEmail,
    learnerName: learnerUser.name || learnerUser.displayName || cleanEmail.split('@')[0],
    courseId,
    courseTitle: course.title,
    status: 'in_progress',
    startedAt: now,
    currentModuleId: firstModule ? firstModule.moduleId : null,
    currentLessonId: firstLesson ? firstLesson.lessonId : null,
    lastVisitedLessonId: firstLesson ? firstLesson.lessonId : null,
    completedLessonIds: [],
    completedQuizIds: [],
    completedRequiredQuizIds: [],
    progressPercentage: calc.progressPercentage,
    completedLessonsCount: calc.completedCount,
    totalRequiredLessons: calc.totalCount,
    completedAt: null,
    lastAccessedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1
  };

  // 4. Also ensure course selection record is synchronized
  try {
    await saveCourseSelection(cleanEmail, courseId, 'browse', 'Started learning course');
  } catch (selErr) {
    // Non-fatal if already selected
  }

  await saveProgressRecord(newProgress);
  return newProgress;
}

/**
 * Record lesson visit: updates last visited and last accessed timestamp
 */
export async function recordLessonVisit(courseId, lessonId, moduleId = null, learnerUser) {
  if (!courseId || !lessonId || !learnerUser || !learnerUser.email) {
    throw new Error('Course ID, lesson ID, and authenticated learner identity are required');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();

  // Validate lesson exists, belongs to course, and is published
  const lesson = await getLessonById(lessonId);
  if (!lesson || lesson.courseId !== courseId) {
    throw new Error(`Lesson "${lessonId}" does not belong to course "${courseId}"`);
  }
  if (lesson.status !== 'published') {
    throw new Error('This lesson is not currently published and cannot be accessed');
  }

  let progress = await getCourseProgress(courseId, cleanEmail);
  const now = new Date().toISOString();

  if (!progress) {
    // Initialize on first visit
    progress = await startCourse(courseId, learnerUser);
  }

  const actualModuleId = moduleId || lesson.moduleId || progress.currentModuleId;

  const updatedProgress = {
    ...progress,
    currentModuleId: actualModuleId,
    currentLessonId: lessonId,
    lastVisitedLessonId: lessonId,
    lastAccessedAt: now,
    updatedAt: now,
    status: progress.status === 'not_started' ? 'in_progress' : progress.status
  };

  await saveProgressRecord(updatedProgress);
  return updatedProgress;
}

/**
 * Mark a lesson complete: validates quizzes, prevents duplicates, recalculates percentage authoritatively
 */
export async function completeLesson(courseId, lessonId, learnerUser) {
  if (!courseId || !lessonId || !learnerUser || !learnerUser.email) {
    throw new Error('Course ID, lesson ID, and authenticated learner identity are required');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();

  // 1. Validate lesson exists, is published, and belongs to course
  const lesson = await getLessonById(lessonId);
  if (!lesson || lesson.courseId !== courseId) {
    throw new Error(`Lesson "${lessonId}" does not belong to course "${courseId}"`);
  }
  if (lesson.status !== 'published') {
    throw new Error('Unpublished or draft lessons cannot be completed');
  }

  // 2. Validate required quiz completion on backend
  const quizCheck = await verifyLessonQuizRequirements(courseId, lessonId, cleanEmail);
  if (!quizCheck.satisfied) {
    const err = new Error(quizCheck.reason);
    err.quizRequired = true;
    err.incompleteQuiz = quizCheck.incompleteQuiz;
    throw err;
  }

  // 3. Load or initialize progress
  let progress = await getCourseProgress(courseId, cleanEmail);
  if (!progress) {
    progress = await startCourse(courseId, learnerUser);
  }

  const existingCompletedSet = new Set(progress.completedLessonIds || []);
  const wasAlreadyCompleted = existingCompletedSet.has(lessonId);

  // Idempotency: If already completed, ensure calculation is synchronized and return
  if (wasAlreadyCompleted) {
    return {
      progress,
      alreadyCompleted: true,
      newlyCompleted: false
    };
  }

  existingCompletedSet.add(lessonId);
  const updatedCompletedList = Array.from(existingCompletedSet);

  // Recalculate progress authoritatively
  const calc = await calculateCourseProgress(courseId, updatedCompletedList);
  const now = new Date().toISOString();

  const isAllCompleted = calc.totalCount > 0 && calc.completedCount >= calc.totalCount;

  const existingCompletedQuizzes = new Set(progress.completedRequiredQuizIds || progress.completedQuizIds || []);
  if (quizCheck.quizzes && Array.isArray(quizCheck.quizzes)) {
    quizCheck.quizzes.forEach(q => existingCompletedQuizzes.add(q.quizId));
  }
  const updatedQuizList = Array.from(existingCompletedQuizzes);

  const updatedProgress = {
    ...progress,
    completedLessonIds: updatedCompletedList,
    completedQuizIds: updatedQuizList,
    completedRequiredQuizIds: updatedQuizList,
    progressPercentage: calc.progressPercentage,
    completedLessonsCount: calc.completedCount,
    totalRequiredLessons: calc.totalCount,
    lastVisitedLessonId: lessonId,
    lastAccessedAt: now,
    updatedAt: now,
    status: isAllCompleted ? 'completed' : 'in_progress',
    completedAt: isAllCompleted ? (progress.completedAt || now) : progress.completedAt
  };

  await saveProgressRecord(updatedProgress);

  return {
    progress: updatedProgress,
    alreadyCompleted: false,
    newlyCompleted: true,
    isCourseCompleted: isAllCompleted
  };
}

/**
 * Determine exact resume position for "Continue Learning"
 */
export async function getCourseResumePosition(courseId, learnerEmail) {
  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  const progress = await getCourseProgress(courseId, cleanEmail);
  const { publishedModules, publishedLessons } = await getSortedPublishedLessons(courseId);

  if (!publishedLessons || publishedLessons.length === 0) {
    return {
      action: 'no_content',
      message: 'This course has no published lessons available at this time.',
      targetLesson: null,
      progress
    };
  }

  // Not started yet
  if (!progress || progress.status === 'not_started') {
    const firstLesson = publishedLessons[0];
    const firstModule = publishedModules.find(m => m.moduleId === firstLesson.moduleId) || null;
    return {
      action: 'start_course',
      targetLesson: firstLesson,
      targetModule: firstModule,
      progress: progress || null
    };
  }

  // Completed course
  if (progress.status === 'completed' || progress.progressPercentage === 100) {
    const firstLesson = publishedLessons[0];
    return {
      action: 'review_course',
      status: 'completed',
      targetLesson: firstLesson,
      progress
    };
  }

  const completedSet = new Set(progress.completedLessonIds || []);
  const incompleteLessons = publishedLessons.filter(l => !completedSet.has(l.lessonId));

  if (incompleteLessons.length === 0) {
    return {
      action: 'review_course',
      status: 'completed',
      targetLesson: publishedLessons[0],
      progress
    };
  }

  // 1. Check last visited lesson: is it published and incomplete?
  if (progress.lastVisitedLessonId) {
    const lastVisitedIncomplete = incompleteLessons.find(l => l.lessonId === progress.lastVisitedLessonId);
    if (lastVisitedIncomplete) {
      const mod = publishedModules.find(m => m.moduleId === lastVisitedIncomplete.moduleId) || null;
      return {
        action: 'continue_learning',
        targetLesson: lastVisitedIncomplete,
        targetModule: mod,
        progress
      };
    }
  }

  // 2. If last visited was completed or unpublished, resume at the first incomplete lesson in course sequence
  const nextIncomplete = incompleteLessons[0];
  const nextMod = publishedModules.find(m => m.moduleId === nextIncomplete.moduleId) || null;
  return {
    action: 'continue_learning',
    targetLesson: nextIncomplete,
    targetModule: nextMod,
    progress
  };
}

/**
 * Get all course progress records for a learner, enriched with course details
 * Categorized into: inProgress, notStarted, completed
 */
export async function getLearnerAllCoursesProgress(learnerEmail) {
  if (!learnerEmail) {
    return { inProgress: [], notStarted: [], completed: [], all: [] };
  }

  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  const client = getClient();

  // 1. Load all selections for this learner
  const selections = await getLearnerSelections(cleanEmail);

  // 2. Scan progress table for this learner
  let progressItems = [];
  try {
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'learnerEmail = :em',
      ExpressionAttributeValues: { ':em': cleanEmail }
    }));
    progressItems = result.Items || [];
  } catch (err) {
    // Use in-memory progress items
    progressItems = Array.from(inMemoryProgress.values()).filter(p => p.learnerEmail === cleanEmail);
  }

  const progressByCourse = new Map();
  progressItems.forEach(p => progressByCourse.set(p.courseId, p));

  // 3. Merge selections and progress
  const enrichedList = await Promise.all(selections.map(async (sel) => {
    const courseId = sel.courseId;
    const course = sel.course || (await getCourseById(courseId));
    let progress = progressByCourse.get(courseId);

    if (!progress) {
      // Create lightweight not_started summary
      const calc = await calculateCourseProgress(courseId, []);
      progress = {
        progressId: getProgressId(cleanEmail, courseId),
        learnerEmail: cleanEmail,
        courseId,
        courseTitle: course?.title || 'Selected Course',
        status: 'not_started',
        startedAt: null,
        completedLessonIds: [],
        progressPercentage: 0,
        completedLessonsCount: 0,
        totalRequiredLessons: calc.totalCount,
        lastAccessedAt: sel.selectedAt || null,
        completedAt: null
      };
    } else {
      // Recalculate to ensure accuracy with current published content
      const calc = await calculateCourseProgress(courseId, progress.completedLessonIds || []);
      progress = {
        ...progress,
        progressPercentage: calc.progressPercentage,
        completedLessonsCount: calc.completedCount,
        totalRequiredLessons: calc.totalCount
      };
    }

    return {
      courseId,
      course,
      progress,
      selection: sel,
      courseTitle: course?.title || progress?.courseTitle || 'Selected Course',
      status: progress.status,
      startedAt: progress.startedAt,
      lastAccessedAt: progress.lastAccessedAt,
      completedLessonsCount: progress.completedLessonsCount,
      totalRequiredLessons: progress.totalRequiredLessons,
      progressPercentage: progress.progressPercentage,
      completedAt: progress.completedAt
    };
  }));

  const inProgress = enrichedList.filter(item => item.progress.status === 'in_progress');
  const notStarted = enrichedList.filter(item => item.progress.status === 'not_started');
  const completed = enrichedList.filter(item => item.progress.status === 'completed');

  return {
    inProgress,
    notStarted,
    completed,
    all: enrichedList
  };
}

/**
 * Save progress record to DynamoDB and memory cache
 */
async function saveProgressRecord(item) {
  inMemoryProgress.set(item.progressId, item);
  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));
  } catch (err) {
    console.warn(`[progressService] DynamoDB put failed for ${item.progressId}, saved in memory:`, err.message);
  }
  return item;
}

/**
 * Delete progress for a course (used in tests or cleanup)
 */
export async function deleteCourseProgress(courseId, learnerEmail) {
  const progressId = getProgressId(learnerEmail, courseId);
  if (!progressId) return false;

  inMemoryProgress.delete(progressId);
  try {
    const client = getClient();
    await client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { progressId }
    }));
    return true;
  } catch {
    return false;
  }
}

export const getCourseResume = getCourseResumePosition;

/**
 * Get all progress records across learners and courses (Admin only)
 */
export async function getAllProgressRecordsAdmin() {
  const map = new Map();
  // Add in-memory items first
  for (const [id, item] of inMemoryProgress.entries()) {
    map.set(id, item);
  }

  try {
    const client = getClient();
    const res = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    const dbItems = res.Items || [];
    for (const item of dbItems) {
      if (!map.has(item.progressId)) {
        map.set(item.progressId, item);
      }
    }
  } catch (err) {
    console.warn('[progressService] DynamoDB scan failed in getAllProgressRecordsAdmin, using memory:', err.message);
  }

  return Array.from(map.values());
}

export default {
  startCourse,
  getCourseProgress,
  recordLessonVisit,
  completeLesson,
  getCourseResumePosition,
  getLearnerAllCoursesProgress,
  calculateCourseProgress,
  verifyLessonQuizRequirements,
  deleteCourseProgress,
  getAllProgressRecordsAdmin
};
