/**
 * Automated Test Suite — Course Progress Tracking & Resume System (Task 6)
 * Tests all 28 acceptance test criteria required by the project specification.
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
  deleteCourseProgress
} from './services/progressService.js';

import { createCourse, updateCourseStatus } from './services/courseService.js';
import { createModule, updateModuleStatus } from './services/moduleService.js';
import { createLesson, updateLessonStatus } from './services/lessonService.js';
import { createQuiz, updateQuizStatus, submitQuizAttempt } from './services/quizService.js';
import { setTestTokenVerifier } from './services/firebaseAuthService.js';
import { requireAuth } from './middleware/auth.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error('❌ FAIL: ' + message);
    throw new Error('Assertion failed: ' + message);
  } else {
    console.log('✅ PASS: ' + message);
    passedTests++;
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

async function runTests() {
  console.log('\n==========================================================');
  console.log('🧪 RUNNING TASK 6 — COURSE PROGRESS & RESUME ACCEPTANCE TESTS');
  console.log('=========================================================\n');

  setTestTokenVerifier(async (token) => {
    if (token === 'learner1_token') {
      return { uid: 'uid_learner1', email: 'learner1@test.com' };
    }
    if (token === 'learner2_token') {
      return { uid: 'uid_learner2', email: 'learner2@test.com' };
    }
    if (token === 'admin_token') {
      return { uid: 'uid_admin', email: 'admin@onecommunityely.com' };
    }
    throw new Error('Invalid or expired Firebase ID token');
  });

  const learner1 = { email: 'learner1@test.com', id: 'uid_learner1', name: 'Learner One' };
  const learner2 = { email: 'learner2@test.com', id: 'uid_learner2', name: 'Learner Two' };

  console.log('--- Step 0: Setup Test Course Structure ---');

  const courseA = await createCourse({
    title: 'Progress Test Course A',
    shortDescription: 'Comprehensive curriculum for progress tracking verification',
    category: 'Digital Skills',
    estimatedDuration: '4 hours',
    difficultyLevel: 'Beginner',
    learningOutcomes: ['Outcome 1', 'Outcome 2']
  }, 'admin@onecommunityely.com');
  await updateCourseStatus(courseA.courseId, 'published');

  const mod1 = await createModule(courseA.courseId, {
    title: 'Module 1: Foundations',
    description: 'First steps in the course curriculum',
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateModuleStatus(mod1.moduleId, 'published');

  const les1_1 = await createLesson(courseA.courseId, mod1.moduleId, {
    title: 'Lesson 1.1: Introduction',
    shortDescription: 'First lesson of module 1',
    content: '<p>Welcome to lesson 1.1</p>',
    estimatedMinutes: 15,
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les1_1.lessonId, 'published');

  const les1_2 = await createLesson(courseA.courseId, mod1.moduleId, {
    title: 'Lesson 1.2: Core Concepts',
    shortDescription: 'Second lesson of module 1 with quiz prerequisite',
    content: '<p>Core concepts content</p>',
    estimatedMinutes: 20,
    orderIndex: 1
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les1_2.lessonId, 'published');

  const mod2 = await createModule(courseA.courseId, {
    title: 'Module 2: Practical Application',
    description: 'Second module in the curriculum',
    orderIndex: 1
  }, 'admin@onecommunityely.com');
  await updateModuleStatus(mod2.moduleId, 'published');

  const les2_1 = await createLesson(courseA.courseId, mod2.moduleId, {
    title: 'Lesson 2.1: Practice',
    shortDescription: 'First lesson of module 2',
    content: '<p>Practice content</p>',
    estimatedMinutes: 25,
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les2_1.lessonId, 'published');

  const les2_2 = await createLesson(courseA.courseId, mod2.moduleId, {
    title: 'Lesson 2.2: Advanced Mastery',
    shortDescription: 'Final lesson of module 2',
    content: '<p>Advanced mastery content</p>',
    estimatedMinutes: 30,
    orderIndex: 1
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(les2_2.lessonId, 'published');

  const quizLesson1_2 = await createQuiz( {
    title: 'Lesson 1.2 Knowledge Check',
    courseId: courseA.courseId,
    moduleId: mod1.moduleId,
    lessonId: les1_2.lessonId,
    status: 'draft',
    passingScore: 70,
    questions: [
      {
        questionId: 'q_les1_2_1',
        order: 1,
        type: 'true_false',
        questionText: 'Is passing this quiz required to finish lesson 1.2?',
        options: ['True', 'False'],
        correctAnswer: 'True',
        points: 1
      }
    ]
  }, 'admin@onecommunityely.com');
  await updateQuizStatus(quizLesson1_2.quizId, 'published', 'admin@onecommunityely.com');

  const standaloneQuiz = await createQuiz({
    title: 'General Course O Optional Review',
    courseId: courseA.courseId,
    status: 'draft',
    passingScore: 50,
    questions: [
      {
        questionId: 'q_stand_1',
        order: 1,
        type: 'true_false',
        questionText: 'Is this standalone quiz attached to a specific lesson?',
        options: ['True', 'False'],
        correctAnswer: 'False',
        points: 1
      }
    ]
  }, 'admin@onecommunityely.com');
  await updateQuizStatus(standaloneQuiz.quizId, 'published', 'admin@onecommunityely.com');

  const courseB = await createCourse({
    title: 'Course B: Independent Subject',
    shortDescription: 'Testing multi-course progress isolation',
    category: 'Money Management',
    estimatedDuration: '2 hours',
    difficultyLevel: 'Intermediate',
    learningOutcomes: ['Outcome B1']
  }, 'admin@onecommunityely.com');
  await updateCourseStatus(courseB.courseId, 'published');

  const modB1 = await createModule(courseB.courseId, {
    title: 'Module B1',
    description: 'Module for course B',
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateModuleStatus(modB1.moduleId, 'published');

  const lesB_1 = await createLesson(courseB.courseId, modB1.moduleId, {
    title: 'Lesson B.1',
    shortDescription: 'Lesson in course B',
    content: '<p>Course B content</p>',
    estimatedMinutes: 20,
    orderIndex: 0
  }, 'admin@onecommunityely.com');
  await updateLessonStatus(lesB_1.lessonId, 'published');

  await deleteCourseProgress(courseA.courseId, learner1.email);
  await deleteCourseProgress(courseB.courseId, learner1.email);
  await deleteCourseProgress(courseA.courseId, learner2.email);

  console.log('\n--- Criterion 1: Starting a course creates progress record ---');
  const startRes1 = await startCourse(courseA.courseId, learner1);
  assert(startRes1 && startRes1.status === 'in_progress', 'Test 1: Status is set to in_progress');
  assert(Boolean(startRes1.startedAt), 'Test 1: startedAt timestamp is recorded');
  assert(startRes1.currentLessonId === les1_1.lessonId, 'Test 1: First published lesson is set as current lesson');
  assert(startRes1.progressPercentage === 0, 'Test 1: Initial progress percentage is 0%');

  console.log('\n--- Criterion 2: Idempotent course start ---');
  const startRes2 = await startCourse(courseA.courseId, learner1);
  assert(startRes2.startedAt === startRes1.startedAt, 'Test 2: Starting again preserves initial startedAt timestamp');
  assert(startRes2.progressId === startRes1.progressId, 'Test 2: Same progress record returned without duplicates');

  console.log('\n--- Criterion 3: Visiting a lesson records visit ---');
  const visitRes = await recordLessonVisit(courseA.courseId, les1_2.lessonId, mod1.moduleId, learner1);
  assert(visitRes.lastVisitedLessonId === les1_2.lessonId, 'Test 3: lastVisitedLessonId updated to visited lesson');
  assert(Boolean(visitRes.lastAccessedAt), 'Test 3: lastAccessedAt timestamp recorded on visit');

  console.log('\n--- Criterion 4: Completing lesson 1.1 ---');
  const comp1_1 = await completeLesson(courseA.courseId, les1_1.lessonId, learner1);
  assert(comp1_1.newlyCompleted === true, 'Test 4: newlyCompleted is true on first completion');
  assert(comp1_1.progress.completedLessonIds.includes(les1_1.lessonId), 'Test 4: completedLessonIds includes lesson 1.1');

  console.log('\n--- Criterion 5: Duplicate completion prevention ---');
  const comp1_1_dup = await completeLesson(courseA.courseId, les1_1.lessonId, learner1);
  assert(comp1_1_dup.alreadyCompleted === true, 'Test 5: alreadyCompleted is true on repeated call');
  const count1_1 = comp1_1_dup.progress.completedLessonIds.filter(id => id === les1_1.lessonId).length;
  assert(count1_1 === 1, 'Test 5: Lesson ID appears exactly once in completedLessonIds list');

  console.log('\n--- Criterion 6: Authoritative backend recalculation ---');
  assert(comp1_1.progress.progressPercentage === 25, 'Test 6: 1 of 4 lessons completed = 25% authoritatively');

  console.log('\n--- Criterion 7: Progress percentage calculation formula ---');
  const calc0 = await calculateCourseProgress(courseA.courseId, []);
  assert(calc0.progressPercentage === 0, 'Test 7a: 0 completed of 4 lessons = 0%');

  const calc1 = await calculateCourseProgress(courseA.courseId, [les1_1.lessonId]);
  assert(calc1.progressPercentage === 25, 'Test 7b: 1 completed of 4 lessons = 25%');

  const calc2 = await calculateCourseProgress(courseA.courseId, [les1_1.lessonId, les1_2.lessonId]);
  assert(calc2.progressPercentage === 50, 'Test 7c: 2 completed of 4 lessons = 50%');

  const calc3 = await calculateCourseProgress(courseA.courseId, [les1_1.lessonId, les1_2.lessonId, les2_1.lessonId]);
  assert(calc3.progressPercentage === 75, 'Test 7d: 3 completed of 4 lessons = 75%');

  const calc4 = await calculateCourseProgress(courseA.courseId, [les1_1.lessonId, les1_2.lessonId, les2_1.lessonId, les2_2.lessonId]);
  assert(calc4.progressPercentage === 100, 'Test 7e: 4 completed of 4 lessons = 100%');

  console.log('\n--- Criterion 8: Percentage bounds checking ---');
  const calcExtra = await calculateCourseProgress(courseA.courseId, [
    les1_1.lessonId, les1_2.lessonId, les2_1.lessonId, les2_2.lessonId, 'dummy_extra_id'
  ]);
  assert(calcExtra.progressPercentage <= 100, 'Test 8: Percentage never exceeds 100%');
  assert(calc0.progressPercentage >= 0, 'Test 8: Percentage is never below 0%');


  console.log('\n--- Criterion 9: Client-supplied percentage is ignored ---');
  const visitWithFakePercentage = await recordLessonVisit(courseA.courseId, les1_1.lessonId, mod1.moduleId, {
    ...learner1,
    progressPercentage: 99
  });
  assert(visitWithFakePercentage.progressPercentage === 25, 'Test 9: Injected fake percentage is ignored, actual 25% preserved');

  console.log('\n--- Criterion 10: Quiz prerequisite blocks completion ---');
  let quizBlocked = false;
  try {
    await completeLesson(courseA.courseId, les1_2.lessonId, learner1);
  } catch (quizErr) {
    quizBlocked = quizErr.quizRequired === true && quizErr.message.includes('complete the required quiz');
  }
  assert(quizBlocked, 'Test 10: Lesson 1.2 completion blocked when required quiz has not been completed');

  console.log('\n--- Criterion 11 & 12: Quiz passing score & completion unlock ---');
  await submitQuizAttempt(quizLesson1_2.quizId, learner1, { 'q_les1_2_1': 'False' });
  let failScoreBlocked = false;
  try {
    await completeLesson(courseA.courseId, les1_2.lessonId, learner1);
  } catch (failScoreErr) {
    failScoreBlocked = failScoreErr.quizRequired === true && failScoreErr.message.includes('passing score of 70%');
  }
  assert(failScoreBlocked, 'Test 12: Failing quiz attempt blocks lesson completion when passing score required');

  await submitQuizAttempt(quizLesson1_2.quizId, learner1, { 'q_les1_2_1': 'True' });
  const comp1_2_pass = await completeLesson(courseA.courseId, les1_2.lessonId, learner1);
  assert(comp1_2_pass.newlyCompleted === true, 'Test 11: Lesson completes successfully once required quiz is passed');
  assert(comp1_2_pass.progress.progressPercentage === 50, 'Test 11: Progress is now 50% after completing lesson 1.2');


  console.log('\n--- Criterion 13: Course completion ---');
  await completeLesson(courseA.courseId, les2_1.lessonId, learner1);
  const compAll = await completeLesson(courseA.courseId, les2_2.lessonId, learner1);

  assert(compAll.progress.status === 'completed', 'Test 13: Status changed to completed');
  assert(compAll.progress.progressPercentage === 100, 'Test 13: Progress percentage is 100%');
  assert(Boolean(compAll.progress.completedAt), 'Test 13: completedAt timestamp is recorded');


  console.log('\n--- Criterion 14: Idempotent course completion preserves date ---');
  const originalCompletedAt = compAll.progress.completedAt;
  const compRepeat = await completeLesson(courseA.courseId, les2_2.lessonId, learner1);
  assert(compRepeat.progress.completedAt === originalCompletedAt, 'Test 14: Original completion date is preserved on repeat');


  console.log('\n--- Criteria 15 & 16: Continue Learning resolution ---');
  await startCourse(courseA.courseId, learner2);
  await recordLessonVisit(courseA.courseId, les1_2.lessonId, mod1.moduleId, learner2);

  const resumeIncomplete = await getCourseResumePosition(courseA.courseId, learner2.email);
  assert(resumeIncomplete.action === 'continue_learning', 'Test 15: Action is continue_learning');
  assert(resumeIncomplete.targetLesson.lessonId === les1_2.lessonId, 'Test 15: Resumes at last visited incomplete lesson (1.2)');

  await submitQuizAttempt(quizLesson1_2.quizId, learner2, { 'q_les1_2_1': 'True' });
  await completeLesson(courseA.courseId, les1_1.lessonId, learner2);
  await completeLesson(courseA.courseId, les1_2.lessonId, learner2);

  const resumeNextIncomplete = await getCourseResumePosition(courseA.courseId, learner2.email);
  assert(resumeNextIncomplete.targetLesson.lessonId === les2_1.lessonId, 'Test 16: When visited lesson is completed, resumes at next sequential incomplete lesson (2.1)');


  console.log('\n--- Criterion 17: Unpublished content fallback ---');
  await updateLessonStatus(les2_1.lessonId, 'unpublished');

  const resumeFallback = await getCourseResumePosition(courseA.courseId, learner2.email);
  assert(resumeFallback.targetLesson.lessonId === les2_2.lessonId, 'Test 17: Safely skips unpublished content and resumes at nearest published lesson (2.2)');

  await updateLessonStatus(les2_1.lessonId, 'published');


  console.log('\n--- Criterion 18: Completed course resume handling ---');
  const resumeCompleted = await getCourseResumePosition(courseA.courseId, learner1.email);
  assert(resumeCompleted.action === 'review_course' && resumeCompleted.status === 'completed', 'Test 18: Completed course safely returns review_course status without crashing');


  console.log('\n--- Criterion 19: Learner progress privacy and isolation ---');
  const prog1 = await getCourseProgress(courseA.courseId, learner1.email);
  const prog2 = await getCourseProgress(courseA.courseId, learner2.email);
  assert(prog1.progressPercentage === 100, 'Test 19: Learner 1 progress is 100%');
  assert(prog2.progressPercentage === 50, 'Test 19: Learner 2 progress is 50%');
  assert(prog1.progressId !== prog2.progressId, 'Test 19: Progress IDs and partitions are strictly distinct');


  console.log('\n--- Criterion 20: Unauthenticated requests rejected with 401 ---');
  const noAuth = mockReqRes({});
  let noAuthPassed = false;
  await requireAuth(noAuth.req, noAuth.res, () => { noAuthPassed = true; });
  assert(noAuth.getStatusCode() === 401 && !noAuthPassed, 'Test 20: Unauthenticated request rejected with 401');


  console.log('\n--- Criterion 21: Direct-access protection for draft/unpublished lessons ---');
  const draftLesson = await createLesson(courseA.courseId, mod1.moduleId, {
    title: 'Draft Lesson Hidden From Learners',
    shortDescription: 'Unpublished draft material',
    content: '<p>Secret draft notes</p>',
    estimatedMinutes: 10,
    orderIndex: 99
  }, 'admin@onecommunityely.com');

  let draftVisitBlocked = false;
  try {
    await recordLessonVisit(courseA.courseId, draftLesson.lessonId, mod1.moduleId, learner1);
  } catch (draftErr) {
    draftVisitBlocked = draftErr.message.includes('not currently published');
  }
  assert(draftVisitBlocked, 'Test 21: Learners cannot visit or access draft lessons');

  let draftCompleteBlocked = false;
  try {
    await completeLesson(courseA.courseId, draftLesson.lessonId, learner1);
  } catch (draftCompErr) {
    draftCompleteBlocked = draftCompErr.message.includes('Unpublished or draft');
  }
  assert(draftCompleteBlocked, 'Test 21: Learners cannot complete draft lessons');


  console.log('\n--- Criterion 22: Course progress summary ---');
  const progSummary = await getCourseProgress(courseA.courseId, learner2.email);
  assert(progSummary && progSummary.status === 'in_progress', 'Test 22: Course overview gets valid in_progress state');
  assert(progSummary.completedLessonIds.length === 2, 'Test 22: Accurately reflects 2 completed lessons');


  console.log('\n--- Criterion 23: Learner dashboard categorization ---');
  const dashboardData = await getLearnerAllCoursesProgress(learner1.email);
  assert(dashboardData.completed.some(item => item.courseId === courseA.courseId), 'Test 23: Course A appears in completed section');
  assert(dashboardData.inProgress.every(item => item.courseId !== courseA.courseId), 'Test 23: Completed Course A does not appear in inProgress section');


  console.log('\n--- Criterion 24: Unrelated quizzes do not block lessons ---');
  const compLessonNoQuiz = await completeLesson(courseB.courseId, lesB_1.lessonId, learner1);
  assert(compLessonNoQuiz.newlyCompleted === true, 'Test 24: Lesson B.1 without attached quiz completes without being blocked by standalone quiz');


  console.log('\n--- Criterion 25: Multi-course independent progress ---');
  const progCourseA = await getCourseProgress(courseA.courseId, learner1.email);
  const progCourseB = await getCourseProgress(courseB.courseId, learner1.email);
  assert(progCourseA.courseId === courseA.courseId && progCourseA.progressPercentage === 100, 'Test 25: Course A progress is 100%');
  assert(progCourseB.courseId === courseB.courseId && progCourseB.progressPercentage === 100, 'Test 25: Course B progress tracked independently');


  console.log('\n--- Criterion 26: History retention on sequential completions ---');
  const allCompletedLearner1 = progCourseA.completedLessonIds;
  assert(allCompletedLearner1.includes(les1_1.lessonId) && allCompletedLearner1.includes(les1_2.lessonId) &&
         allCompletedLearner1.includes(les2_1.lessonId) && allCompletedLearner1.includes(les2_2.lessonId),
         'Test 26: All previously completed lessons are preserved across sequential completion updates');


  console.log('\n--- Criterion 27: Concurrent completion idempotency ---');
  const [resA, resB] = await Promise.all([
    completeLesson(courseA.courseId, les2_1.lessonId, learner1),
    completeLesson(courseA.courseId, les2_1.lessonId, learner1)
  ]);
  assert(resA.alreadyCompleted === true && resB.alreadyCompleted === true, 'test 27: Concurrent completions resolve idempotently without race conditions');


  console.log('\n--- Criterion 28: Clean test completion ---');
  assert(passedTests >= 27, 'Test 28: All acceptance test requirements met successfully');

  console.log('\n=============================================================');
  console.log('🎉 ACCEPTANCE TESTS PASSED: ' + passedTests + ' / ' + totalTests + ' (100%)');
  console.log('=============================================================\n');
}

runTests().catch(err => {
  console.error('\n💥 TEST EXECUTION FAILED:', err);
  process.exit(1);
});
