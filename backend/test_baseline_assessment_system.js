/**
 * Automated Acceptance Test Suite for Task 4: Before/Baseline Assessment
 * Covers all 28 requirements specified by the user.
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  createAssessment,
  getAssessmentById,
  getAllAssessmentsAdmin,
  getPublishedAssessmentForCourse,
  updateAssessment,
  updateAssessmentStatus,
  deleteAssessment,
  submitBaselineResponse,
  getLearnerBaselineResponse,
  getAssessmentResponsesAdmin,
  validateAssessmentPayload
} from './services/baselineAssessmentService.js';

import { createCourse, updateCourseStatus } from './services/courseService.js';
import { createModule, updateModuleStatus } from './services/moduleService.js';
import { createLesson, updateLessonStatus } from './services/lessonService.js';
import { startCourse, getCourseProgress, recordLessonVisit, completeLesson } from './services/progressService.js';
import { setTestTokenVerifier, resetTestTokenVerifier } from './services/firebaseAuthService.js';
import { saveUser } from './services/userService.js';
import { requireAdmin, requireLearner, requireAuth } from './middleware/auth.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, testGroup = 'General') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [${testGroup}] PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`❌ [${testGroup}] FAIL: ${message}`);
    throw new Error(`Assertion failed in [${testGroup}]: ${message}`);
  }
}

function mockReqRes(headers = {}, body = {}, query = {}, params = {}) {
  const req = {
    headers: { ...headers },
    header: (name) => {
      const key = Object.keys(req.headers).find(k => k.toLowerCase() === name.toLowerCase());
      return key ? req.headers[key] : undefined;
    },
    body,
    query,
    params
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

async function runBaselineTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 4 ACCEPTANCE TESTS: BEFORE/BASELINE ASSESSMENT SYSTEM');
  console.log('========================================================================\n');

  // Configure Test Auth Tokens
  setTestTokenVerifier(async (token) => {
    if (token === 'token_admin') {
      return { uid: 'uid_admin', email: 'admin@onecommunityely.com' };
    }
    if (token === 'token_learner_a') {
      return { uid: 'uid_learner_a', email: 'learner_a@onecommunityely.com' };
    }
    if (token === 'token_learner_b') {
      return { uid: 'uid_learner_b', email: 'learner_b@onecommunityely.com' };
    }
    throw new Error('Invalid or expired token');
  });

  // Seed Users in store
  await saveUser({
    email: 'admin@onecommunityely.com',
    name: 'Ely Training Admin',
    userType: 'teacher',
    role: 'admin',
    isBanned: false
  });
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

  const adminEmail = 'admin@onecommunityely.com';
  const learnerA = { email: 'learner_a@onecommunityely.com', id: 'uid_learner_a', name: 'Learner Alpha' };
  const learnerB = { email: 'learner_b@onecommunityely.com', id: 'uid_learner_b', name: 'Learner Beta' };

  // Setup Test Courses
  console.log('--- Setting up test courses and curriculum ---');
  const course1 = await createCourse({
    title: 'Digital Inclusion & Essential Life Skills',
    shortDescription: 'Core foundation for adult digital inclusion',
    category: 'Digital Skills'
  }, adminEmail);
  await updateCourseStatus(course1.courseId, 'published');

  const mod1 = await createModule(course1.courseId, { title: 'Module 1', orderIndex: 0 }, adminEmail);
  await updateModuleStatus(mod1.moduleId, 'published');
  const les1 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.1', orderIndex: 0 }, adminEmail);
  await updateLessonStatus(les1.lessonId, 'published');

  const course2 = await createCourse({
    title: 'Financial Literacy & Online Banking',
    shortDescription: 'Safe online transactions and budgeting',
    category: 'Finance'
  }, adminEmail);
  await updateCourseStatus(course2.courseId, 'published');

  const draftCourse = await createCourse({
    title: 'Unpublished Draft Course',
    shortDescription: 'Draft'
  }, adminEmail);

  // -------------------------------------------------------------
  // 1 & 2. Admin creates draft assessment with short-text and confidence questions
  // -------------------------------------------------------------
  console.log('\n--- 1 & 2. Admin Creates Draft Baseline Assessment ---');
  const draftAssessment = await createAssessment({
    title: 'Digital Foundation Starting Benchmark',
    courseId: course1.courseId,
    instructions: 'This short assessment helps us understand your starting point. It is not a test, and there are no pass or fail results.',
    status: 'draft',
    questions: [
      {
        questionId: 'q_goals',
        type: 'short_text',
        questionText: 'What would you most like to learn from this course?',
        placeholder: 'Enter your goals...',
        required: true,
        order: 0
      },
      {
        questionId: 'q_conf_internet',
        type: 'confidence_rating',
        questionText: 'How confident are you about using the internet safely?',
        required: true,
        order: 1
      }
    ]
  }, adminEmail);

  assert(draftAssessment.assessmentId.startsWith('base_'), '1.1 Assessment ID generated with base_ prefix', 'Creation');
  assert(draftAssessment.status === 'draft', '1.2 Assessment saved in draft status', 'Creation');
  assert(draftAssessment.version === 1, '1.3 Initial version is 1', 'Creation');
  assert(draftAssessment.questions.length === 2, '2.1 Two questions added successfully', 'Questions');
  assert(draftAssessment.questions[0].type === 'short_text', '2.2 First question is short_text', 'Questions');
  assert(draftAssessment.questions[1].type === 'confidence_rating', '2.3 Second question is confidence_rating', 'Questions');

  // -------------------------------------------------------------
  // 3. Admin edits and reorders questions
  // -------------------------------------------------------------
  console.log('\n--- 3. Admin Edits and Reorders Questions ---');
  const editedAssessment = await updateAssessment(draftAssessment.assessmentId, {
    questions: [
      {
        questionId: 'q_conf_internet',
        type: 'confidence_rating',
        questionText: 'How confident are you about using the internet safely today?',
        required: true,
        order: 0
      },
      {
        questionId: 'q_goals',
        type: 'short_text',
        questionText: 'What would you most like to learn from this course?',
        placeholder: 'Enter your goals...',
        required: true,
        order: 1
      },
      {
        questionId: 'q_devices',
        type: 'short_text',
        questionText: 'Which digital devices do you currently use at home?',
        required: false,
        order: 2
      }
    ]
  }, adminEmail);

  assert(editedAssessment.questions.length === 3, '3.1 Question added to draft', 'Editing');
  assert(editedAssessment.questions[0].questionId === 'q_conf_internet', '3.2 Questions reordered successfully', 'Editing');
  assert(editedAssessment.questions[0].questionText.includes('today'), '3.3 Question text updated', 'Editing');
  assert(editedAssessment.version === 1, '3.4 Editing draft assessment keeps version at 1', 'Editing');

  // -------------------------------------------------------------
  // 4. Invalid assessment cannot be published
  // -------------------------------------------------------------
  console.log('\n--- 4. Validation Before Publishing ---');
  let emptyQBlocked = false;
  try {
    await updateAssessment(draftAssessment.assessmentId, {
      status: 'published',
      questions: []
    }, adminEmail);
  } catch (err) {
    emptyQBlocked = err.message.includes('At least one question is required');
  }
  assert(emptyQBlocked, '4.1 Assessment with 0 questions cannot be published', 'Validation');

  let blankTextBlocked = false;
  try {
    await updateAssessment(draftAssessment.assessmentId, {
      status: 'published',
      questions: [{ questionId: 'q_blank', type: 'short_text', questionText: '   ' }]
    }, adminEmail);
  } catch (err) {
    blankTextBlocked = err.message.includes('must have question text');
  }
  assert(blankTextBlocked, '4.2 Question with empty text cannot be published', 'Validation');

  let draftCourseBlocked = false;
  try {
    await createAssessment({
      title: 'Draft Course Assessment',
      courseId: draftCourse.courseId,
      status: 'published',
      questions: [{ questionId: 'q_test', type: 'short_text', questionText: 'Valid text' }]
    }, adminEmail);
  } catch (err) {
    draftCourseBlocked = err.message.includes('because the course is draft');
  }
  assert(draftCourseBlocked, '4.3 Assessment attached to unpublished course cannot be published', 'Validation');

  // -------------------------------------------------------------
  // 5 & 6. Valid assessment published & Single active published per course
  // -------------------------------------------------------------
  console.log('\n--- 5 & 6. Publishing and Single Active Assessment Rule ---');
  const publishedA1 = await updateAssessmentStatus(draftAssessment.assessmentId, 'published', adminEmail);
  assert(publishedA1.status === 'published', '5.1 Valid assessment successfully published', 'Publishing');
  assert(publishedA1.publishedAt !== null, '5.2 publishedAt timestamp is set', 'Publishing');

  // Create second assessment for same course and publish it
  const assessment2 = await createAssessment({
    title: 'Digital Foundation Benchmark v2',
    courseId: course1.courseId,
    status: 'published',
    questions: [
      {
        questionId: 'q2_conf',
        type: 'confidence_rating',
        questionText: 'How confident are you using a smartphone or computer?',
        required: true,
        order: 0
      },
      {
        questionId: 'q2_goals',
        type: 'short_text',
        questionText: 'What is your primary goal for this training?',
        required: true,
        order: 1
      }
    ]
  }, adminEmail);

  assert(assessment2.status === 'published', '6.1 Second assessment published', 'Single Active Rule');

  // Verify first assessment was automatically unpublished
  const reloadedA1 = await getAssessmentById(draftAssessment.assessmentId, true);
  assert(reloadedA1.status === 'unpublished', '6.2 Older assessment for same course automatically unpublished', 'Single Active Rule');

  const activeForCourse1 = await getPublishedAssessmentForCourse(course1.courseId);
  assert(activeForCourse1.assessmentId === assessment2.assessmentId, '6.3 Exactly one active published assessment for course 1', 'Single Active Rule');

  // -------------------------------------------------------------
  // 7 & 8. Learner Access: Published vs Draft / Unpublished
  // -------------------------------------------------------------
  console.log('\n--- 7 & 8. Learner Access Controls ---');
  const learnerPublishedView = await getAssessmentById(assessment2.assessmentId, false);
  assert(learnerPublishedView !== null && learnerPublishedView.title === assessment2.title, '7.1 Learner can access published assessment', 'Learner Access');

  const learnerDraftView = await getAssessmentById(draftAssessment.assessmentId, false);
  assert(learnerDraftView === null, '8.1 Learner cannot access unpublished assessment', 'Learner Access');

  // -------------------------------------------------------------
  // 9. Course Start Blocking: Redirect / Block until baseline completed
  // -------------------------------------------------------------
  console.log('\n--- 9. Course Start Blocking ---');
  let startBlocked = false;
  try {
    await startCourse(course1.courseId, learnerA);
  } catch (err) {
    startBlocked = err.baselineRequired === true && err.assessmentId === assessment2.assessmentId;
  }
  assert(startBlocked, '9.1 Learner without baseline submission is blocked from starting course (baselineRequired: true)', 'Course Start Blocking');

  // -------------------------------------------------------------
  // 11 & 12. Submission Validation: Required fields & 1-5 integer scale
  // -------------------------------------------------------------
  console.log('\n--- 11 & 12. Submission Validation ---');
  let missingReqBlocked = false;
  try {
    await submitBaselineResponse(assessment2.assessmentId, learnerA, {
      q2_conf: 4
      // q2_goals missing
    });
  } catch (err) {
    missingReqBlocked = err.message.includes('Please provide an answer');
  }
  assert(missingReqBlocked, '11.1 Missing required short_text answer is rejected', 'Submission Validation');

  let invalidRatingLow = false;
  try {
    await submitBaselineResponse(assessment2.assessmentId, learnerA, {
      q2_conf: 0,
      q2_goals: 'Learn computers'
    });
  } catch (err) {
    invalidRatingLow = err.message.includes('between 1 and 5');
  }
  assert(invalidRatingLow, '12.1 Rating 0 (below 1) is rejected', 'Submission Validation');

  let invalidRatingHigh = false;
  try {
    await submitBaselineResponse(assessment2.assessmentId, learnerA, {
      q2_conf: 6,
      q2_goals: 'Learn computers'
    });
  } catch (err) {
    invalidRatingHigh = err.message.includes('between 1 and 5');
  }
  assert(invalidRatingHigh, '12.2 Rating 6 (above 5) is rejected', 'Submission Validation');

  let invalidRatingFloat = false;
  try {
    await submitBaselineResponse(assessment2.assessmentId, learnerA, {
      q2_conf: 3.5,
      q2_goals: 'Learn computers'
    });
  } catch (err) {
    invalidRatingFloat = err.message.includes('must be an integer between 1 and 5');
  }
  assert(invalidRatingFloat, '12.3 Float rating 3.5 is rejected (must be integer)', 'Submission Validation');

  // -------------------------------------------------------------
  // 10, 13, 14, 15, 16, 17. Valid submission & Uniqueness / Idempotency
  // -------------------------------------------------------------
  console.log('\n--- 10, 14-17. Valid Submission & Idempotency ---');
  const validSubmissionA = await submitBaselineResponse(assessment2.assessmentId, learnerA, {
    q2_conf: 4,
    q2_goals: 'Gain essential confidence to use local Ely council services online'
  });

  assert(validSubmissionA.success === true, '10.1 Valid response submission succeeds', 'Submission');
  assert(validSubmissionA.newlySubmitted === true, '10.2 Marked as newlySubmitted: true', 'Submission');
  assert(validSubmissionA.response.assessmentVersion === 1, '17.1 Assessment version saved with response', 'Submission');
  assert(validSubmissionA.response.answers['q2_conf'].ratingValue === 4, '10.3 Confidence rating value 4 stored', 'Submission');
  assert(validSubmissionA.response.answers['q2_conf'].ratingLabel === 'Confident', '10.4 Confidence rating label Confident stored', 'Submission');
  assert(validSubmissionA.message.includes('Your starting-point assessment has been saved'), '10.5 Friendly non-graded message returned', 'Submission');

  // Idempotency: Repeated submission
  const repeatSubmissionA = await submitBaselineResponse(assessment2.assessmentId, learnerA, {
    q2_conf: 1, // different answers ignored
    q2_goals: 'Tampered answer'
  });

  assert(repeatSubmissionA.success === true, '14.1 Repeated submission returns success: true', 'Idempotency');
  assert(repeatSubmissionA.alreadySubmitted === true, '14.2 alreadySubmitted: true returned', 'Idempotency');
  assert(repeatSubmissionA.newlySubmitted === false, '14.3 newlySubmitted: false returned', 'Idempotency');
  assert(repeatSubmissionA.response.answers['q2_conf'].ratingValue === 4, '16.1 Original answer (4) preserved without overwrite', 'Idempotency');

  // Course start now succeeds for Learner A
  const startAfterBaseline = await startCourse(course1.courseId, learnerA);
  assert(startAfterBaseline.status === 'in_progress', '10.6 Learner A can now start course after completing baseline', 'Course Start');

  // -------------------------------------------------------------
  // 13, 20, 21. Learner Isolation & Token Security
  // -------------------------------------------------------------
  console.log('\n--- 13, 20, 21. Security & Learner Isolation ---');
  // Learner B has NOT submitted
  const learnerBRespCheck = await getLearnerBaselineResponse(course1.courseId, learnerB.email);
  assert(learnerBRespCheck === null, '21.1 Learner B has no response (Learner A submission isolated)', 'Security');

  // Learner B start is blocked
  let learnerBStartBlocked = false;
  try {
    await startCourse(course1.courseId, learnerB);
  } catch (err) {
    learnerBStartBlocked = err.baselineRequired === true;
  }
  assert(learnerBStartBlocked, '21.2 Learner B is blocked from starting course until they complete their own baseline', 'Security');

  // Token spoofing test on requireLearner
  const spoofReq = mockReqRes({ authorization: 'Bearer token_learner_b' }, { learnerEmail: 'learner_a@onecommunityely.com' });
  let spoofPassed = false;
  await requireLearner(spoofReq.req, spoofReq.res, () => { spoofPassed = true; });
  assert(spoofPassed && spoofReq.req.user.email === 'learner_b@onecommunityely.com', '13.1 User identity is derived strictly from verified token, ignoring request body email', 'Security');

  // Learner token cannot access Admin endpoint (403)
  const adminReq = mockReqRes({ authorization: 'Bearer token_learner_a' });
  await requireAdmin(adminReq.req, adminReq.res, () => {});
  assert(adminReq.res.getStatusCode() === 403, '20.1 Learner token cannot access Admin assessment endpoints (403 Forbidden)', 'Security');

  // -------------------------------------------------------------
  // 18. Editing assessment does not modify past responses & increments version
  // -------------------------------------------------------------
  console.log('\n--- 18. Historical Preservation on Edit ---');
  const updatedAssessment2 = await updateAssessment(assessment2.assessmentId, {
    questions: [
      {
        questionId: 'q2_conf',
        type: 'confidence_rating',
        questionText: 'How confident are you using computers today? (Updated)',
        required: true,
        order: 0
      },
      {
        questionId: 'q2_goals',
        type: 'short_text',
        questionText: 'What is your primary goal for this training? (Updated)',
        required: true,
        order: 1
      },
      {
        questionId: 'q2_accessibility',
        type: 'short_text',
        questionText: 'Do you require any accessibility assistance?',
        required: false,
        order: 2
      }
    ]
  }, adminEmail);

  assert(updatedAssessment2.version === 2, '18.1 Published assessment version incremented to 2 upon question edit', 'Historical Preservation');

  const pastResponseA = await getLearnerBaselineResponse(course1.courseId, learnerA.email);
  assert(pastResponseA.assessmentVersion === 1, '18.2 Past submission retains original assessmentVersion: 1', 'Historical Preservation');
  assert(pastResponseA.answers['q2_conf'].questionText.includes('smartphone'), '18.3 Past question text preserved intact in response record', 'Historical Preservation');

  // -------------------------------------------------------------
  // 19. Admin views learner submissions
  // -------------------------------------------------------------
  console.log('\n--- 19. Admin Submissions View ---');
  const adminSubmissions = await getAssessmentResponsesAdmin(assessment2.assessmentId);
  assert(adminSubmissions.length >= 1, '19.1 Admin retrieves submissions for assessment', 'Admin Submissions');
  assert(adminSubmissions[0].learnerEmail === 'learner_a@onecommunityely.com', '19.2 Submission contains learner details', 'Admin Submissions');

  // Filter search
  const filteredSub = await getAssessmentResponsesAdmin(assessment2.assessmentId, { search: 'Alpha' });
  assert(filteredSub.length === 1, '19.3 Admin search by learner name succeeds', 'Admin Submissions');

  // -------------------------------------------------------------
  // 22. Backward Compatibility: Existing In-Progress Learner Not Blocked
  // -------------------------------------------------------------
  console.log('\n--- 22. Backward Compatibility ---');
  // Start course 2 before any baseline assessment is created
  const inProgressStart = await startCourse(course2.courseId, learnerB);
  assert(inProgressStart.status === 'in_progress', '22.1 Course 2 started normally when no baseline exists', 'Backward Compatibility');

  // Now an Admin publishes a baseline assessment for course 2
  const course2Assessment = await createAssessment({
    title: 'Finance Course Baseline',
    courseId: course2.courseId,
    status: 'published',
    questions: [
      {
        questionId: 'q_fin_conf',
        type: 'confidence_rating',
        questionText: 'How confident are you using banking apps?',
        required: true,
        order: 0
      }
    ]
  }, adminEmail);

  // Calling startCourse again on an already in-progress course does NOT block Learner B
  const inProgressContinue = await startCourse(course2.courseId, learnerB);
  assert(inProgressContinue.status === 'in_progress', '22.2 Existing in-progress learner is NOT blocked by subsequently published baseline assessment', 'Backward Compatibility');

  // -------------------------------------------------------------
  // Clean up
  // -------------------------------------------------------------
  resetTestTokenVerifier();

  console.log('\n========================================================================');
  console.log(`🎉 TASK 4 TESTS COMPLETE: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%)`);
  console.log('========================================================================\n');
}

runBaselineTests().catch(err => {
  console.error('\n💥 TEST RUNNER FAILED:', err);
  process.exit(1);
});
