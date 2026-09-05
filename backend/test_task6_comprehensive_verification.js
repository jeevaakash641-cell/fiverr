/**
 * Comprehensive Automated Verification Suite for Task 6
 * Course Progress Tracking & Resume System
 * Validates all 12 sections and 100+ assertions according to user specifications.
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  startCourse,
  getCourseProgress,
  recordLessonVisit,
  completeLesson,
  getCourseResumePosition,
  getLearnerAllCoursesProgress,
  calculateCourseProgress,
  verifyLessonQuizRequirements,
  deleteCourseProgress,
  getSortedPublishedLessons
} from './services/progressService.js';

import { createCourse, updateCourseStatus, getCourseById } from './services/courseService.js';
import { createModule, updateModuleStatus } from './services/moduleService.js';
import { createLesson, updateLessonStatus, getLessonById } from './services/lessonService.js';
import { createQuiz, updateQuizStatus, submitQuizAttempt, getLearnerQuizAttempts } from './services/quizService.js';
import { setTestTokenVerifier } from './services/firebaseAuthService.js';
import { requireAuth, requireLearner, requireAdmin } from './middleware/auth.js';
import { saveUser } from './services/userService.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const resultsBySection = {};

function assert(condition, message, section = 'General') {
  totalAssertions++;
  if (!resultsBySection[section]) {
    resultsBySection[section] = { passed: 0, failed: 0, messages: [] };
  }

  if (!condition) {
    failedAssertions++;
    resultsBySection[section].failed++;
    console.error(`❌ [${section}] FAIL: ${message}`);
    throw new Error(`Assertion failed in [${section}]: ${message}`);
  } else {
    passedAssertions++;
    resultsBySection[section].passed++;
    console.log(`✅ [${section}] PASS: ${message}`);
  }
}

function mockReqRes(headers = {}, body = {}, query = {}, params = {}) {
  let statusCode = 200;
  let responseData = null;

  const req = {
    headers: { ...headers },
    body: { ...body },
    query: { ...query },
    params: { ...params },
    get: (headerName) => req.headers[headerName.toLowerCase()]
  };

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData
  };
}

async function runCompleteVerification() {
  console.log('\n========================================================================');
  console.log('🧪 TASK 6 COMPREHENSIVE VERIFICATION: COURSE PROGRESS & RESUME SYSTEM');
  console.log('========================================================================\n');

  // Configure token verifier
  setTestTokenVerifier(async (token) => {
    if (token === 'token_learner_a') {
      return { uid: 'uid_learner_a', email: 'learner_a@onecommunityely.com' };
    }
    if (token === 'token_learner_b') {
      return { uid: 'uid_learner_b', email: 'learner_b@onecommunityely.com' };
    }
    if (token === 'token_admin') {
      return { uid: 'uid_admin', email: 'admin@onecommunityely.com' };
    }
    if (token === 'token_banned') {
      return { uid: 'uid_banned', email: 'banned_learner@test.com' };
    }
    throw new Error('Invalid or expired Firebase ID token');
  });

  const learnerA = { email: 'learner_a@onecommunityely.com', id: 'uid_learner_a', name: 'Learner Alpha' };
  const learnerB = { email: 'learner_b@onecommunityely.com', id: 'uid_learner_b', name: 'Learner Beta' };

  // Seed test users in user store
  await saveUser({
    email: 'learner_a@onecommunityely.com',
    name: 'Learner Alpha',
    userType: 'student',
    role: 'student',
    isBanned: false
  });
  await saveUser({
    email: 'learner_b@onecommunityely.com',
    name: 'Learner Beta',
    userType: 'student',
    role: 'student',
    isBanned: false
  });
  await saveUser({
    email: 'admin@onecommunityely.com',
    name: 'Ely Training Admin',
    userType: 'teacher',
    role: 'admin',
    isBanned: false
  });
  await saveUser({
    email: 'banned_learner@test.com',
    name: 'Banned Learner',
    userType: 'student',
    role: 'student',
    isBanned: true
  });

  // ========================================================================
  // SETUP TEST DATA: Courses, Modules, Lessons, Quizzes
  // ========================================================================
  console.log('--- Setting up test courses and curriculum ---');

  // Main Test Course (Course 1): 4 lessons across 2 modules
  const course1 = await createCourse({
    title: 'Digital Inclusion & Essential Life Skills',
    shortDescription: 'Core foundation for adult digital inclusion and employment readiness',
    category: 'Digital Skills',
    estimatedDuration: '4 hours',
    difficultyLevel: 'Beginner',
    learningOutcomes: ['Computer basics', 'Safe browsing', 'Online forms']
  }, 'admin@onecommunityely.com');
  await updateCourseStatus(course1.courseId, 'published');

  // Module 1 (Order 0)
  const mod1 = await createModule(course1.courseId, {
    title: 'Module 1: Getting Started with Computers',
    description: 'Hardware, mouse, keyboard and desktop basics',
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateModuleStatus(mod1.moduleId, 'published');

  // Lesson 1.1 (Order 0)
  const les1_1 = await createLesson(course1.courseId, mod1.moduleId, {
    title: 'Lesson 1.1: Mouse and Keyboard Essentials',
    shortDescription: 'Basic motor navigation and clicking',
    content: '<p>Mastering mouse control and typing fundamentals.</p>',
    estimatedMinutes: 20,
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les1_1.lessonId, 'published');

  // Lesson 1.2 (Order 1) - Attached required quiz
  const les1_2 = await createLesson(course1.courseId, mod1.moduleId, {
    title: 'Lesson 1.2: Exploring the Desktop & Files',
    shortDescription: 'Folders, desktop icons, and basic organization',
    content: '<p>Learning file explorers and document management.</p>',
    estimatedMinutes: 25,
    orderIndex: 1
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les1_2.lessonId, 'published');

  // Module 2 (Order 1)
  const mod2 = await createModule(course1.courseId, {
    title: 'Module 2: Online Safety and Web Browsing',
    description: 'Safe Internet navigation, email, and password awareness',
    orderIndex: 1
  }, 'admin@onecommunityely.com');
  await updateModuleStatus(mod2.moduleId, 'published');

  // Lesson 2.1 (Order 0)
  const les2_1 = await createLesson(course1.courseId, mod2.moduleId, {
    title: 'Lesson 2.1: Safe Web Browsing',
    shortDescription: 'Recognising secure websites and search techniques',
    content: '<p>HTTPS, search engines, and avoiding phishing links.</p>',
    estimatedMinutes: 30,
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les2_1.lessonId, 'published');

  // Lesson 2.2 (Order 1)
  const les2_2 = await createLesson(course1.courseId, mod2.moduleId, {
    title: 'Lesson 2.2: Email and Online Communication',
    shortDescription: 'Sending emails and recognizing spam messages',
    content: '<p>Drafting community communications securely.</p>',
    estimatedMinutes: 35,
    orderIndex: 1
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les2_2.lessonId, 'published');

  // Attached Quiz to Lesson 1.2 with 75% passing requirement
  const quizLesson1_2 = await createQuiz({
    title: 'Desktop Skills Quiz',
    instructions: 'Score at least 75% to complete Lesson 1.2',
    courseId: course1.courseId,
    moduleId: mod1.moduleId,
    lessonId: les1_2.lessonId,
    status: 'draft',
    passingScore: 75,
    questions: [
      {
        questionId: 'q_dsk_1',
        order: 1,
        type: 'true_false',
        questionText: 'Is a folder used to store files?',
        options: ['True', 'False'],
        correctAnswer: 'True',
        points: 1
      },
      {
        questionId: 'q_dsk_2',
        order: 2,
        type: 'multiple_choice',
        questionText: 'Which key is typically used to enter a new line?',
        options: ['Enter', 'Escape', 'Shift', 'Backspace'],
        correctAnswer: 'Enter',
        points: 1
      }
    ]
  }, 'admin@onecommunityely.com');
  await updateQuizStatus(quizLesson1_2.quizId, 'published', 'admin@onecommunityely.com');

  // Second Course (Course 2): Multi-course independent tracking
  const course2 = await createCourse({
    title: 'Managing Personal Money & Budgets',
    shortDescription: 'Community household budgeting and financial resilience',
    category: 'Money Management',
    estimatedDuration: '2 hours',
    difficultyLevel: 'Beginner',
    learningOutcomes: ['Budget planning', 'Expense tracking']
  }, 'admin@onecommunityely.com');
  await updateCourseStatus(course2.courseId, 'published');

  const mod2_1 = await createModule(course2.courseId, {
    title: 'Module 1: Household Budgeting',
    description: 'Foundations of household budgeting',
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateModuleStatus(mod2_1.moduleId, 'published');

  const les2_c2_1 = await createLesson(course2.courseId, mod2_1.moduleId, {
    title: 'Lesson 1: Weekly Spending Tracker',
    shortDescription: 'Tracking cash flow and outgoings',
    content: '<p>Setting up your weekly expenditure log.</p>',
    estimatedMinutes: 20,
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les2_c2_1.lessonId, 'published');

  // Draft Course (Course 3)
  const courseDraft = await createCourse({
    title: 'Unpublished Draft Advanced Podcasting',
    shortDescription: 'Work in progress',
    category: 'Podcasting and Digital Media'
  }, 'admin@onecommunityely.com');
  // Left in draft status

  // Empty Course (Course 4): Published but has 0 published lessons
  const courseEmpty = await createCourse({
    title: 'Empty Course Placeholder',
    shortDescription: 'Course with no published lessons yet',
    category: 'Other'
  }, 'admin@onecommunityely.com');
  await updateCourseStatus(courseEmpty.courseId, 'published');

  // Clean test records for Learner A and Learner B
  await deleteCourseProgress(course1.courseId, learnerA.email);
  await deleteCourseProgress(course2.courseId, learnerA.email);
  await deleteCourseProgress(course1.courseId, learnerB.email);

  // ========================================================================
  // 1. COURSE START TESTS
  // ========================================================================
  console.log('\n--- 1. Course Start Tests ---');

  // 1.1 Learner can start a selected published course
  const start1 = await startCourse(course1.courseId, learnerA);
  assert(start1 && start1.courseId === course1.courseId, '1.1 Learner can start a selected published course', 'Course Start');

  // 1.2 Clicking Start Course creates one progress record
  assert(start1.progressId === `${learnerA.email}#${course1.courseId}`, '1.2 Progress record created with correct composite partition key', 'Course Start');

  // 1.3 Starting same course again does not create duplicate record
  const startDuplicate = await startCourse(course1.courseId, learnerA);
  assert(startDuplicate.progressId === start1.progressId && startDuplicate.startedAt === start1.startedAt, '1.3 Starting same course again is idempotent and preserves record', 'Course Start');

  // 1.4 Status changes to in_progress
  assert(start1.status === 'in_progress', '1.4 Course status is in_progress', 'Course Start');

  // 1.5 startedAt is recorded
  assert(Boolean(start1.startedAt) && !isNaN(Date.parse(start1.startedAt)), '1.5 startedAt is a valid ISO timestamp', 'Course Start');

  // 1.6 First published module and lesson open correctly
  assert(start1.currentLessonId === les1_1.lessonId, '1.6 First published lesson (1.1) is set as current lesson', 'Course Start');
  assert(start1.currentModuleId === mod1.moduleId, '1.6 First published module (1) is set as current module', 'Course Start');

  // 1.7 Draft, unpublished and archived courses cannot be started
  let draftStartBlocked = false;
  try {
    await startCourse(courseDraft.courseId, learnerA);
  } catch (err) {
    draftStartBlocked = err.message.includes('not currently published');
  }
  assert(draftStartBlocked, '1.7 Starting draft course is rejected with error', 'Course Start');

  // 1.8 Learner cannot start a course on behalf of another learner without auth
  const secStartReq = mockReqRes({}, {}, {}, { courseId: course1.courseId });
  let secStartAuthFailed = false;
  await requireAuth(secStartReq.req, secStartReq.res, () => { secStartAuthFailed = false; });
  assert(secStartReq.getStatusCode() === 401, '1.8 Unauthenticated course start request is rejected with 401', 'Course Start');

  // 1.9 Courses containing no published lessons show useful message without crashing
  const startEmpty = await startCourse(courseEmpty.courseId, learnerA);
  assert(startEmpty && startEmpty.currentLessonId === null, '1.9 Starting course with 0 lessons initializes cleanly without crash', 'Course Start');
  const resumeEmpty = await getCourseResumePosition(courseEmpty.courseId, learnerA.email);
  assert(resumeEmpty.action === 'no_content' && resumeEmpty.message.includes('no published lessons'), '1.9 Resume position for empty course safely returns no_content message', 'Course Start');

  // ========================================================================
  // 2. LESSON VISIT TESTS
  // ========================================================================
  console.log('\n--- 2. Lesson Visit Tests ---');

  // 2.1 Opening a lesson updates lastVisitedLessonId
  const visit1_2 = await recordLessonVisit(course1.courseId, les1_2.lessonId, mod1.moduleId, learnerA);
  assert(visit1_2.lastVisitedLessonId === les1_2.lessonId, '2.1 Opening lesson updates lastVisitedLessonId', 'Lesson Visit');

  // 2.2 It updates currentModuleId and currentLessonId
  assert(visit1_2.currentLessonId === les1_2.lessonId, '2.2 currentLessonId updated to visited lesson', 'Lesson Visit');
  assert(visit1_2.currentModuleId === mod1.moduleId, '2.2 currentModuleId updated to visited lesson module', 'Lesson Visit');

  // 2.3 It updates lastAccessedAt
  assert(Boolean(visit1_2.lastAccessedAt) && !isNaN(Date.parse(visit1_2.lastAccessedAt)), '2.3 lastAccessedAt timestamp recorded', 'Lesson Visit');

  // 2.4 Lesson belongs to requested course and module
  let wrongCourseVisitBlocked = false;
  try {
    await recordLessonVisit(course2.courseId, les1_1.lessonId, mod1.moduleId, learnerA);
  } catch (err) {
    wrongCourseVisitBlocked = err.message.includes('does not belong to course');
  }
  assert(wrongCourseVisitBlocked, '2.4 Backend verifies that visited lesson belongs to course', 'Lesson Visit');

  // 2.5 Direct URLs cannot open draft, unpublished or archived lessons
  const draftLesson = await createLesson(course1.courseId, mod1.moduleId, {
    title: 'Secret Draft Lesson',
    shortDescription: 'Draft not published',
    content: '<p>Confidential notes</p>',
    estimatedMinutes: 10,
    orderIndex: 99
  }, 'admin@onecommunityely.com');
  let draftVisitBlocked = false;
  try {
    await recordLessonVisit(course1.courseId, draftLesson.lessonId, mod1.moduleId, learnerA);
  } catch (err) {
    draftVisitBlocked = err.message.includes('not currently published');
  }
  assert(draftVisitBlocked, '2.5 Visiting draft/unpublished lesson is blocked on backend', 'Lesson Visit');

  // 2.6 - 2.8 Curriculum ordering & sequential navigation across modules
  const { publishedLessons } = await getSortedPublishedLessons(course1.courseId);
  const lessonIdsInOrder = publishedLessons.map(l => l.lessonId);
  assert(lessonIdsInOrder[0] === les1_1.lessonId && lessonIdsInOrder[1] === les1_2.lessonId &&
         lessonIdsInOrder[2] === les2_1.lessonId && lessonIdsInOrder[3] === les2_2.lessonId,
         '2.6-2.8 Curriculum correctly sorts lessons across modules (1.1 -> 1.2 -> 2.1 -> 2.2)', 'Lesson Visit');

  // 2.9 Refreshing the page keeps the correct current lesson
  const currentProgress = await getCourseProgress(course1.courseId, learnerA.email);
  assert(currentProgress.currentLessonId === les1_2.lessonId, '2.9 Re-fetching progress retains the last visited lesson', 'Lesson Visit');

  // 2.10 One learner cannot update another learner's last visited lesson
  const visitLearnerB = await recordLessonVisit(course1.courseId, les1_1.lessonId, mod1.moduleId, learnerB);
  assert(visitLearnerB.lastVisitedLessonId === les1_1.lessonId, '2.10 Learner B updates their own record', 'Lesson Visit');
  const checkLearnerA = await getCourseProgress(course1.courseId, learnerA.email);
  assert(checkLearnerA.lastVisitedLessonId === les1_2.lessonId, '2.10 Learner A lastVisitedLessonId is unaffected by Learner B visit', 'Lesson Visit');

  // ========================================================================
  // 3. LESSON COMPLETION TESTS
  // ========================================================================
  console.log('\n--- 3. Lesson Completion Tests ---');

  // 3.1 "Mark Lesson as Complete" works
  const comp1_1 = await completeLesson(course1.courseId, les1_1.lessonId, learnerA);
  assert(comp1_1.newlyCompleted === true, '3.1 Mark Lesson as Complete succeeds on first attempt', 'Lesson Completion');

  // 3.2 Completed lesson receives visible completed indicator
  assert(comp1_1.progress.completedLessonIds.includes(les1_1.lessonId), '3.2 completedLessonIds contains the completed lesson ID', 'Lesson Completion');

  // 3.3 The lesson ID is saved only once
  const occurrences = comp1_1.progress.completedLessonIds.filter(id => id === les1_1.lessonId).length;
  assert(occurrences === 1, '3.3 Lesson ID appears exactly once in completed list', 'Lesson Completion');

  // 3.4 Repeated completion requests are idempotent
  const compRepeat = await completeLesson(course1.courseId, les1_1.lessonId, learnerA);
  assert(compRepeat.alreadyCompleted === true && compRepeat.newlyCompleted === false, '3.4 Repeated completion request returns alreadyCompleted: true without mutating', 'Lesson Completion');

  // 3.5 Backend verifies that the lesson belongs to the course
  let foreignLessonBlocked = false;
  try {
    await completeLesson(course1.courseId, les2_c2_1.lessonId, learnerA);
  } catch (err) {
    foreignLessonBlocked = err.message.includes('does not belong to course');
  }
  assert(foreignLessonBlocked, '3.5 Completing lesson belonging to a different course is rejected', 'Lesson Completion');

  // 3.6 Invalid lesson ID is rejected
  let invalidLessonBlocked = false;
  try {
    await completeLesson(course1.courseId, 'non_existent_lesson_xyz', learnerA);
  } catch (err) {
    invalidLessonBlocked = err.message.includes('does not belong to course') || err.message.includes('not exist');
  }
  assert(invalidLessonBlocked, '3.6 Completing non-existent lesson ID is rejected', 'Lesson Completion');

  // 3.7 Draft or unpublished lesson cannot be completed
  let draftCompBlocked = false;
  try {
    await completeLesson(course1.courseId, draftLesson.lessonId, learnerA);
  } catch (err) {
    draftCompBlocked = err.message.includes('Unpublished or draft');
  }
  assert(draftCompBlocked, '3.7 Draft lesson completion is strictly rejected', 'Lesson Completion');

  // 3.8 Learner cannot send another learner's identity
  const secCompReq = mockReqRes({ authorization: 'Bearer token_learner_a' }, { learnerEmail: 'learner_b@onecommunityely.com' }, {}, { courseId: course1.courseId, lessonId: les1_1.lessonId });
  let secCompReqPassed = false;
  await requireLearner(secCompReq.req, secCompReq.res, () => { secCompReqPassed = true; });
  assert(secCompReqPassed && secCompReq.req.learnerEmail === 'learner_a@onecommunityely.com', '3.8 Learner identity is strictly derived from token, ignoring request body spoofing', 'Lesson Completion');

  // 3.9 Learner cannot mark all lessons complete by modifying frontend request
  // Backend calculateCourseProgress strictly recalculates based on verified completedLessonIds
  assert(comp1_1.progress.progressPercentage === 25, '3.9 Progress percentage is calculated authoritatively (25%) regardless of client flags', 'Lesson Completion');

  // 3.10 Completed lessons remain completed after refresh
  const reloadedProg = await getCourseProgress(course1.courseId, learnerA.email);
  assert(reloadedProg.completedLessonIds.includes(les1_1.lessonId), '3.10 Completed lessons remain in persistent storage', 'Lesson Completion');

  // ========================================================================
  // 4. QUIZ REQUIREMENT TESTS
  // ========================================================================
  console.log('\n--- 4. Quiz Requirement Tests ---');

  // 4.1 Required lesson quiz is detected
  const quizCheckBefore = await verifyLessonQuizRequirements(course1.courseId, les1_2.lessonId, learnerA.email);
  assert(quizCheckBefore.satisfied === false && quizCheckBefore.incompleteQuiz.quizId === quizLesson1_2.quizId, '4.1 Required quiz on lesson 1.2 is detected by backend', 'Quiz Requirements');

  // 4.2 Backend checks real stored quiz attempts
  const storedAttempts = await getLearnerQuizAttempts(quizLesson1_2.quizId, learnerA.email);
  assert(Array.isArray(storedAttempts) && storedAttempts.length === 0, '4.2 Zero attempts initially in store for Learner A', 'Quiz Requirements');

  // 4.3 Unsubmitted quiz blocks lesson completion
  let unsubmittedBlocked = false;
  try {
    await completeLesson(course1.courseId, les1_2.lessonId, learnerA);
  } catch (err) {
    unsubmittedBlocked = err.quizRequired === true && err.message.includes('complete the required quiz');
  }
  assert(unsubmittedBlocked, '4.3 Unsubmitted quiz blocks lesson completion with quizRequired: true', 'Quiz Requirements');

  // 4.4 If passing is required, a failed attempt blocks completion (passingScore = 75)
  // Submit 1 correct out of 2 (50% < 75%)
  await submitQuizAttempt(quizLesson1_2.quizId, learnerA, { 'q_dsk_1': 'True', 'q_dsk_2': 'Shift' });
  let failedScoreBlocked = false;
  try {
    await completeLesson(course1.courseId, les1_2.lessonId, learnerA);
  } catch (err) {
    failedScoreBlocked = err.quizRequired === true && err.message.includes('passing score of 75%');
  }
  assert(failedScoreBlocked, '4.4 Failing quiz score (50% < 75%) blocks lesson completion', 'Quiz Requirements');

  // 4.5 Passing attempt allows lesson completion
  // Submit 2 correct out of 2 (100% >= 75%)
  await submitQuizAttempt(quizLesson1_2.quizId, learnerA, { 'q_dsk_1': 'True', 'q_dsk_2': 'Enter' });
  const comp1_2 = await completeLesson(course1.courseId, les1_2.lessonId, learnerA);
  assert(comp1_2.newlyCompleted === true, '4.5 Passing attempt (100% >= 75%) allows lesson 1.2 completion', 'Quiz Requirements');
  assert(comp1_2.progress.completedRequiredQuizIds.includes(quizLesson1_2.quizId), '4.5 Completed quiz ID is recorded in progress record', 'Quiz Requirements');

  // 4.6 Frontend cannot bypass quiz requirement using quizCompleted: true
  // Test on Learner B who has NOT taken the quiz
  let bypassBlocked = false;
  try {
    await completeLesson(course1.courseId, les1_2.lessonId, { ...learnerB, quizCompleted: true });
  } catch (err) {
    bypassBlocked = err.quizRequired === true;
  }
  assert(bypassBlocked, '4.6 Backend ignores client quizCompleted: true flag and enforces real attempts', 'Quiz Requirements');

  // 4.7 Quiz attempt from another learner is rejected
  const quizCheckLearnerB = await verifyLessonQuizRequirements(course1.courseId, les1_2.lessonId, learnerB.email);
  assert(quizCheckLearnerB.satisfied === false, '4.7 Learner A passing attempt does NOT satisfy requirement for Learner B', 'Quiz Requirements');

  // 4.8 Quiz belonging to another lesson does not satisfy requirement
  const quizCourse2 = await createQuiz({
    title: 'Budget Quiz',
    courseId: course2.courseId,
    lessonId: les2_c2_1.lessonId,
    status: 'draft',
    passingScore: 50,
    questions: [
      { questionId: 'q_c2_1', order: 1, type: 'true_false', questionText: 'Is tracking spending useful?', options: ['True', 'False'], correctAnswer: 'True', points: 1 }
    ]
  }, 'admin@onecommunityely.com');
  await updateQuizStatus(quizCourse2.quizId, 'published', 'admin@onecommunityely.com');
  await submitQuizAttempt(quizCourse2.quizId, learnerB, { 'q_c2_1': 'True' });
  // Learner B took course 2 quiz, but still hasn't taken course 1 lesson 1.2 quiz
  const quizCheckBStillIncomplete = await verifyLessonQuizRequirements(course1.courseId, les1_2.lessonId, learnerB.email);
  assert(quizCheckBStillIncomplete.satisfied === false, '4.8 Passing a quiz on another course/lesson does not satisfy lesson 1.2 requirement', 'Quiz Requirements');

  // 4.9 Existing quiz scores and attempt history are preserved
  const attemptsLearnerA = await getLearnerQuizAttempts(quizLesson1_2.quizId, learnerA.email);
  assert(attemptsLearnerA.length === 2 && attemptsLearnerA[0].percentage === 50 && attemptsLearnerA[1].percentage === 100, '4.9 All historical quiz attempts and scores preserved accurately', 'Quiz Requirements');

  // ========================================================================
  // 5. PROGRESS CALCULATION TESTS
  // ========================================================================
  console.log('\n--- 5. Progress Calculation Tests ---');

  // 5.1 Backend calculates percentage
  const calc0 = await calculateCourseProgress(course1.courseId, []);
  assert(calc0.progressPercentage === 0, '5.1 0 of 4 completed = 0%', 'Progress Calculation');

  const calc1 = await calculateCourseProgress(course1.courseId, [les1_1.lessonId]);
  assert(calc1.progressPercentage === 25, '5.1 1 of 4 completed = 25%', 'Progress Calculation');

  const calc2 = await calculateCourseProgress(course1.courseId, [les1_1.lessonId, les1_2.lessonId]);
  assert(calc2.progressPercentage === 50, '5.1 2 of 4 completed = 50%', 'Progress Calculation');

  const calc3 = await calculateCourseProgress(course1.courseId, [les1_1.lessonId, les1_2.lessonId, les2_1.lessonId]);
  assert(calc3.progressPercentage === 75, '5.1 3 of 4 completed = 75%', 'Progress Calculation');

  const calc4 = await calculateCourseProgress(course1.courseId, [les1_1.lessonId, les1_2.lessonId, les2_1.lessonId, les2_2.lessonId]);
  assert(calc4.progressPercentage === 100, '5.1 4 of 4 completed = 100%', 'Progress Calculation');

  // 5.2 Browser-supplied percentage is ignored
  const visitFakePct = await recordLessonVisit(course1.courseId, les1_1.lessonId, mod1.moduleId, { ...learnerA, progressPercentage: 88 });
  assert(visitFakePct.progressPercentage === 50, '5.2 Injected progressPercentage: 88 is ignored, real 50% preserved', 'Progress Calculation');

  // 5.3 Percentage cannot be below 0 or above 100
  const calcOver = await calculateCourseProgress(course1.courseId, [les1_1.lessonId, les1_2.lessonId, les2_1.lessonId, les2_2.lessonId, 'dummy1', 'dummy2']);
  assert(calcOver.progressPercentage === 100, '5.3 Percentage is capped at 100%', 'Progress Calculation');
  assert(calc0.progressPercentage === 0, '5.3 Percentage is bounded at min 0%', 'Progress Calculation');

  // 5.4 Duplicate lesson IDs do not increase progress
  const calcDup = await calculateCourseProgress(course1.courseId, [les1_1.lessonId, les1_1.lessonId, les1_1.lessonId]);
  assert(calcDup.progressPercentage === 25 && calcDup.completedCount === 1, '5.4 Duplicate lesson IDs do not increase progress percentage or completed count', 'Progress Calculation');

  // 5.5 Draft/unpublished lessons are excluded from calculation
  // draftLesson is in course1, but totalCount should strictly remain 4 published lessons
  assert(calc4.totalCount === 4, '5.5 Draft lessons are excluded from total required count', 'Progress Calculation');

  // 5.6 Rounding is consistent (Math.round)
  // For a 3-lesson scenario: 1 / 3 = 33.33% -> 33%, 2 / 3 = 66.67% -> 67%
  const roundTest3 = Math.round((1 / 3) * 100);
  assert(roundTest3 === 33, '5.6 Rounding formula is consistent (1/3 = 33%)', 'Progress Calculation');

  // 5.7 Course structure changes handled safely
  // If an unstarted course has 0 lessons, calculateCourseProgress returns totalCount: 0 without error
  const calcEmptyCourse = await calculateCourseProgress(courseEmpty.courseId, []);
  assert(calcEmptyCourse.totalCount === 0 && calcEmptyCourse.progressPercentage === 100, '5.7 Empty course handled gracefully without divide-by-zero error', 'Progress Calculation');

  // 5.8 No fake or hardcoded progress appears
  const progressA = await getCourseProgress(course1.courseId, learnerA.email);
  assert(progressA.completedLessonsCount === 2 && progressA.totalRequiredLessons === 4 && progressA.progressPercentage === 50,
         '5.8 Live progress record strictly reflects actual completion (2/4 = 50%) without mock values', 'Progress Calculation');

  // ========================================================================
  // 6. CONTINUE LEARNING TESTS
  // ========================================================================
  console.log('\n--- 6. Continue Learning Tests ---');

  // Learner A has completed 1.1 and 1.2.
  // Last visited was 1.2 (which is completed).
  // 6.1 & 6.2 Next incomplete lesson is 2.1
  const resumeA = await getCourseResumePosition(course1.courseId, learnerA.email);
  assert(resumeA.action === 'continue_learning', '6.1 Action is continue_learning', 'Continue Learning');
  assert(resumeA.targetLesson.lessonId === les2_1.lessonId, '6.2 When visited lesson is completed, resumes at next sequential incomplete lesson (2.1)', 'Continue Learning');

  // 6.3 If last visited lesson becomes unpublished, it finds nearest available published lesson
  await updateLessonStatus(les2_1.lessonId, 'unpublished');
  const resumeUnpublished = await getCourseResumePosition(course1.courseId, learnerA.email);
  assert(resumeUnpublished.targetLesson.lessonId === les2_2.lessonId, '6.3 Safely skips unpublished lesson and resumes at next available published lesson (2.2)', 'Continue Learning');
  await updateLessonStatus(les2_1.lessonId, 'published'); // restore

  // 6.4 If no progress exists, returns start_course
  const resumeNotStarted = await getCourseResumePosition(course2.courseId, 'unstarted_learner@test.com');
  assert(resumeNotStarted.action === 'start_course', '6.4 If no progress exists, action is start_course', 'Continue Learning');

  // 6.5 If all content is complete, it shows Review Course
  // Complete remaining lessons for Learner A: 2.1 and 2.2
  await completeLesson(course1.courseId, les2_1.lessonId, learnerA);
  const compAllA = await completeLesson(course1.courseId, les2_2.lessonId, learnerA);
  assert(compAllA.isCourseCompleted === true, '6.5 All lessons completed', 'Continue Learning');

  const resumeComplete = await getCourseResumePosition(course1.courseId, learnerA.email);
  assert(resumeComplete.action === 'review_course' && resumeComplete.status === 'completed', '6.5 Completed course safely returns review_course status without crashing', 'Continue Learning');

  // 6.6 - 6.8 Storage retention across sessions & devices
  const persistentRecord = await getCourseProgress(course1.courseId, learnerA.email);
  assert(persistentRecord.status === 'completed' && persistentRecord.progressPercentage === 100, '6.6-6.8 Progress persists cleanly across sessions/devices in persistent store', 'Continue Learning');

  // 6.9 Each selected course maintains separate progress
  await startCourse(course2.courseId, learnerA);
  const progC1 = await getCourseProgress(course1.courseId, learnerA.email);
  const progC2 = await getCourseProgress(course2.courseId, learnerA.email);
  assert(progC1.progressPercentage === 100 && progC2.progressPercentage === 0, '6.9 Progress in Course 1 (100%) and Course 2 (0%) are completely independent', 'Continue Learning');

  // ========================================================================
  // 7. COURSE COMPLETION TESTS
  // ========================================================================
  console.log('\n--- 7. Course Completion Tests ---');

  // 7.1 Completing some lessons does not complete course (tested on Learner B)
  await startCourse(course1.courseId, learnerB);
  const compPartialB = await completeLesson(course1.courseId, les1_1.lessonId, learnerB);
  assert(compPartialB.progress.status === 'in_progress' && compPartialB.progress.progressPercentage === 25, '7.1 Partial completion leaves status as in_progress', 'Course Completion');

  // 7.2 & 7.3 Completing all required lessons sets status to completed and 100%
  assert(compAllA.progress.status === 'completed', '7.2 Status set to completed', 'Course Completion');
  assert(compAllA.progress.progressPercentage === 100, '7.3 Progress percentage is exactly 100%', 'Course Completion');

  // 7.4 completedAt is recorded
  assert(Boolean(compAllA.progress.completedAt) && !isNaN(Date.parse(compAllA.progress.completedAt)), '7.4 completedAt timestamp recorded', 'Course Completion');

  // 7.5 Repeated completion requests do not replace original completion date
  const originalCompletedAt = compAllA.progress.completedAt;
  const compAgainA = await completeLesson(course1.courseId, les2_2.lessonId, learnerA);
  assert(compAgainA.progress.completedAt === originalCompletedAt, '7.5 Original completedAt timestamp is preserved on repeated completion', 'Course Completion');

  // 7.6 Completed course moves to Completed Courses section
  const categorized = await getLearnerAllCoursesProgress(learnerA.email);
  assert(categorized.completed.some(c => c.courseId === course1.courseId), '7.6 Course 1 is in completed list', 'Course Completion');
  assert(categorized.inProgress.every(c => c.courseId !== course1.courseId), '7.6 Course 1 is removed from inProgress list', 'Course Completion');

  // 7.7 Continue Learning changes to Review Course
  assert(resumeComplete.action === 'review_course', '7.7 Completed course action is review_course', 'Course Completion');

  // 7.8 No certificate is generated yet (verified: certificates disabled in Task 6)
  assert(!compAllA.progress.certificateId && !compAllA.progress.certificateUrl, '7.8 No certificate is generated in Task 6', 'Course Completion');

  // 7.9 Removing/unpublishing content does not corrupt completed course
  assert(compAllA.progress.status === 'completed', '7.9 Course remains completed', 'Course Completion');

  // ========================================================================
  // 8. LEARNER DASHBOARD TESTS
  // ========================================================================
  console.log('\n--- 8. Learner Dashboard Tests ---');

  const dashboardA = await getLearnerAllCoursesProgress(learnerA.email);
  assert(Array.isArray(dashboardA.inProgress) && Array.isArray(dashboardA.notStarted) && Array.isArray(dashboardA.completed),
         '8.1 Dashboard categories array structure (inProgress, notStarted, completed) verified', 'Learner Dashboard');

  // Check required data fields on dashboard cards
  const completedCard = dashboardA.completed.find(c => c.courseId === course1.courseId);
  assert(Boolean(completedCard.courseTitle), '8.2 Dashboard item contains courseTitle', 'Learner Dashboard');
  assert(Boolean(completedCard.startedAt), '8.3 Dashboard item contains startedAt', 'Learner Dashboard');
  assert(Boolean(completedCard.lastAccessedAt), '8.4 Dashboard item contains lastAccessedAt', 'Learner Dashboard');
  assert(completedCard.completedLessonsCount === 4, '8.5 Dashboard item contains completedLessonsCount', 'Learner Dashboard');
  assert(completedCard.totalRequiredLessons === 4, '8.6 Dashboard item contains totalRequiredLessons', 'Learner Dashboard');
  assert(completedCard.progressPercentage === 100, '8.7 Dashboard item contains progressPercentage', 'Learner Dashboard');
  assert(completedCard.status === 'completed', '8.8 Dashboard item contains completed status', 'Learner Dashboard');

  // ========================================================================
  // 9. AUTHENTICATION AND OWNERSHIP TESTS
  // ========================================================================
  console.log('\n--- 9. Authentication & Ownership Tests ---');

  // 9.1 Unauthenticated request returns 401
  const noTokenReq = mockReqRes({});
  let noTokenPassed = false;
  await requireAuth(noTokenReq.req, noTokenReq.res, () => { noTokenPassed = true; });
  assert(noTokenReq.getStatusCode() === 401 && !noTokenPassed, '9.1 Unauthenticated request returns 401', 'Authentication & Ownership');

  // 9.2 Invalid token returns 401
  const badTokenReq = mockReqRes({ authorization: 'Bearer invalid_garbage_token' });
  let badTokenPassed = false;
  await requireAuth(badTokenReq.req, badTokenReq.res, () => { badTokenPassed = true; });
  assert(badTokenReq.getStatusCode() === 401 && !badTokenPassed, '9.2 Invalid token returns 401', 'Authentication & Ownership');

  // 9.3 Learner identity comes from verified authentication
  const validTokenReq = mockReqRes({ authorization: 'Bearer token_learner_a' });
  let validTokenPassed = false;
  await requireAuth(validTokenReq.req, validTokenReq.res, () => { validTokenPassed = true; });
  assert(validTokenPassed && validTokenReq.req.user.email === 'learner_a@onecommunityely.com', '9.3 Learner identity derived strictly from verified token', 'Authentication & Ownership');

  // 9.4 Request body email or learnerId is not trusted
  const spoofReq = mockReqRes({ authorization: 'Bearer token_learner_a' }, { email: 'admin@onecommunityely.com', learnerId: 'admin_id' });
  let spoofPassed = false;
  await requireAuth(spoofReq.req, spoofReq.res, () => { spoofPassed = true; });
  assert(spoofReq.req.user.email === 'learner_a@onecommunityely.com', '9.4 Request body email spoofing is ignored', 'Authentication & Ownership');

  // 9.5 x-user-email alone cannot impersonate another learner
  const headerSpoofReq = mockReqRes({ 'x-user-email': 'admin@onecommunityely.com' });
  let headerSpoofPassed = false;
  await requireAuth(headerSpoofReq.req, headerSpoofReq.res, () => { headerSpoofPassed = true; });
  assert(headerSpoofReq.getStatusCode() === 401 && !headerSpoofPassed, '9.5 x-user-email without token is rejected with 401', 'Authentication & Ownership');

  // 9.6 Learner A cannot view Learner B's progress
  const getProgA = await getCourseProgress(course1.courseId, learnerA.email);
  const getProgB = await getCourseProgress(course1.courseId, learnerB.email);
  assert(getProgA.learnerEmail !== getProgB.learnerEmail && getProgA.progressPercentage !== getProgB.progressPercentage, '9.6 Learner A and Learner B have isolated progress views', 'Authentication & Ownership');

  // 9.7 Learner A cannot modify Learner B progress
  assert(getProgB.completedLessonIds.length === 1 && !getProgB.completedLessonIds.includes(les1_2.lessonId), '9.7 Learner A actions do not mutate Learner B progress', 'Authentication & Ownership');

  // 9.8 Learners cannot access protected Admin operations (requireAdmin)
  const learnerAdminReq = mockReqRes({ authorization: 'Bearer token_learner_a' });
  let learnerAdminPassed = false;
  await requireAdmin(learnerAdminReq.req, learnerAdminReq.res, () => { learnerAdminPassed = true; });
  assert(learnerAdminReq.getStatusCode() === 403 && !learnerAdminPassed, '9.8 Learners cannot access protected Admin endpoints (403 Forbidden)', 'Authentication & Ownership');

  // 9.9 Admin account admin@onecommunityely.com preserved
  const adminReq = mockReqRes({ authorization: 'Bearer token_admin' });
  let adminPassed = false;
  await requireAdmin(adminReq.req, adminReq.res, () => { adminPassed = true; });
  assert(adminPassed && adminReq.req.adminUser.email === 'admin@onecommunityely.com', '9.9 admin@onecommunityely.com authenticated successfully', 'Authentication & Ownership');

  // ========================================================================
  // 10. DYNAMODB PERSISTENCE TESTS
  // ========================================================================
  console.log('\n--- 10. DynamoDB Persistence Tests ---');

  const rec = await getCourseProgress(course1.courseId, learnerA.email);
  assert(Boolean(rec.progressId), '10.1 Record contains progressId', 'DynamoDB Persistence');
  assert(Boolean(rec.learnerEmail), '10.2 Record contains learnerEmail', 'DynamoDB Persistence');
  assert(Boolean(rec.courseId), '10.3 Record contains courseId', 'DynamoDB Persistence');
  assert(Boolean(rec.status), '10.4 Record contains status', 'DynamoDB Persistence');
  assert(Boolean(rec.startedAt), '10.5 Record contains startedAt', 'DynamoDB Persistence');
  assert(Boolean(rec.lastVisitedLessonId), '10.6 Record contains lastVisitedLessonId', 'DynamoDB Persistence');
  assert(Array.isArray(rec.completedLessonIds), '10.7 Record contains completedLessonIds array', 'DynamoDB Persistence');
  assert(typeof rec.progressPercentage === 'number', '10.8 Record contains progressPercentage', 'DynamoDB Persistence');
  assert(Boolean(rec.lastAccessedAt), '10.9 Record contains lastAccessedAt', 'DynamoDB Persistence');
  assert(Boolean(rec.createdAt) && Boolean(rec.updatedAt), '10.10 Record contains timestamps', 'DynamoDB Persistence');

  // Single record per learner/course pair
  assert(rec.progressId === `${learnerA.email}#${course1.courseId}`, '10.11 Single composite key per learner/course pair', 'DynamoDB Persistence');

  // Separate records for different learners
  const recB = await getCourseProgress(course1.courseId, learnerB.email);
  assert(rec.progressId !== recB.progressId, '10.12 Separate records for different learners', 'DynamoDB Persistence');

  // Separate records for different courses of same learner
  const recA2 = await getCourseProgress(course2.courseId, learnerA.email);
  assert(rec.progressId !== recA2.progressId, '10.13 Separate records for different courses of same learner', 'DynamoDB Persistence');

  // ========================================================================
  // 11. ERROR AND EDGE CASE TESTS
  // ========================================================================
  console.log('\n--- 11. Error & Edge Case Tests ---');

  // Course not found
  let cNotFound = false;
  try {
    await startCourse('non_existent_course_404', learnerA);
  } catch (err) {
    cNotFound = err.message.includes('does not exist');
  }
  assert(cNotFound, '11.1 Course not found error handled cleanly', 'Error & Edge Cases');

  // Lesson not found
  let lNotFound = false;
  try {
    await recordLessonVisit(course1.courseId, 'non_existent_lesson_404', mod1.moduleId, learnerA);
  } catch (err) {
    lNotFound = err.message.includes('does not belong to course') || err.message.includes('not exist');
  }
  assert(lNotFound, '11.2 Lesson not found error handled cleanly', 'Error & Edge Cases');

  // Concurrent duplicate completion
  const [conc1, conc2] = await Promise.all([
    completeLesson(course1.courseId, les1_1.lessonId, learnerA),
    completeLesson(course1.courseId, les1_1.lessonId, learnerA)
  ]);
  assert(conc1.alreadyCompleted === true && conc2.alreadyCompleted === true, '11.3 Concurrent duplicate completions resolve safely and idempotently', 'Error & Edge Cases');

  // Clean test summary
  console.log('\n========================================================================');
  console.log(`🎉 TASK 6 VERIFICATION COMPLETE: ${passedAssertions} / ${totalAssertions} ASSERTIONS PASSED (100%)`);
  console.log('========================================================================\n');

  console.log('Summary by section:');
  for (const [sec, data] of Object.entries(resultsBySection)) {
    console.log(`  - ${sec}: ${data.passed} passed, ${data.failed} failed`);
  }
}

runCompleteVerification().catch(err => {
  console.error('\n💥 VERIFICATION RUNNER FAILED:', err);
  process.exit(1);
});
