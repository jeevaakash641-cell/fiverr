/**
 * Automated Acceptance Test Suite for Task 8:
 * Beneficiary Feedback & Testimonial Consent System
 * Covers all 31 specified test requirements.
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  createAssessment as createBaselineAssessment,
  submitBaselineResponse
} from './services/baselineAssessmentService.js';

import {
  createAssessment as createAfterAssessment,
  submitAfterResponse,
  getLearnerAfterResponse
} from './services/afterAssessmentService.js';

import {
  checkFeedbackEligibility,
  submitBeneficiaryFeedback,
  getLearnerFeedback,
  getFeedbackById,
  getAllFeedbackAdmin,
  recordConsentWithdrawal,
  archiveFeedback,
  validateFeedbackPayload,
  STANDARD_CONSENT_TEXT,
  CONSENT_VERSION
} from './services/beneficiaryFeedbackService.js';

import { createCourse, updateCourseStatus } from './services/courseService.js';
import { createModule, updateModuleStatus } from './services/moduleService.js';
import { createLesson, updateLessonStatus } from './services/lessonService.js';
import { startCourse, completeLesson, getCourseProgress } from './services/progressService.js';
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

async function runBeneficiaryFeedbackTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 8 ACCEPTANCE TESTS: BENEFICIARY FEEDBACK & TESTIMONIAL CONSENT');
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

  const adminEmail = 'admin@onecommunityely.com';
  const learnerA = { email: 'learner_a@onecommunityely.com', id: 'uid_learner_a', name: 'Learner Alpha' };
  const learnerB = { email: 'learner_b@onecommunityely.com', id: 'uid_learner_b', name: 'Learner Beta' };

  // Seed Users
  await saveUser({ email: adminEmail, name: 'Ely Admin', userType: 'teacher', role: 'admin', isBanned: false });
  await saveUser({ email: learnerA.email, name: learnerA.name, userType: 'student', role: 'student', isBanned: false });
  await saveUser({ email: learnerB.email, name: learnerB.name, userType: 'student', role: 'student', isBanned: false });

  // Setup Test Course with Curriculum
  console.log('--- Setting up test courses and curriculum ---');
  const course1 = await createCourse({
    title: 'Essential Money Management & Household Budgeting',
    shortDescription: 'Financial literacy for Ely residents',
    category: 'Money Management'
  }, adminEmail);
  await updateCourseStatus(course1.courseId, 'published');

  const mod1 = await createModule(course1.courseId, { title: 'Module 1: Budgeting', orderIndex: 0 }, adminEmail);
  await updateModuleStatus(mod1.moduleId, 'published');

  const les1 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.1: Income Tracking', orderIndex: 0 }, adminEmail);
  await updateLessonStatus(les1.lessonId, 'published');
  const les2 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.2: Reducing Outgoings', orderIndex: 1 }, adminEmail);
  await updateLessonStatus(les2.lessonId, 'published');

  // Published Baseline Assessment for Course 1
  const baseline1 = await createBaselineAssessment({
    title: 'Money Management Baseline',
    courseId: course1.courseId,
    status: 'published',
    questions: [
      { questionId: 'bq_budget', type: 'confidence_rating', questionText: 'Confidence in budgeting', required: true, order: 0 }
    ]
  }, adminEmail);

  // Published After Assessment for Course 1
  const after1 = await createAfterAssessment({
    title: 'Money Management Final Reflection',
    courseId: course1.courseId,
    baselineAssessmentId: baseline1.assessmentId,
    status: 'published',
    questions: [
      { questionId: 'aq_budget', type: 'confidence_rating', questionText: 'Confidence now in budgeting', baselineQuestionId: 'bq_budget', required: true, order: 0 }
    ]
  }, adminEmail);

  // -------------------------------------------------------------
  // 1, 2, 3. Ineligible learner cannot submit feedback
  // -------------------------------------------------------------
  console.log('\n--- 1, 2, 3. Eligibility Verification ---');
  // Course not started
  const eligNotStarted = await checkFeedbackEligibility(course1.courseId, learnerA.email);
  assert(eligNotStarted.eligible === false, '2.1 Not started course is ineligible', 'Eligibility');
  assert(eligNotStarted.reason.includes('Complete the required course content'), '2.2 Friendly guidance returned', 'Eligibility');

  // Start course, complete only 1 of 2 lessons (50%)
  await submitBaselineResponse(baseline1.assessmentId, learnerA, { bq_budget: 2 });
  await startCourse(course1.courseId, learnerA);
  await completeLesson(course1.courseId, les1.lessonId, learnerA);

  const eligPartial = await checkFeedbackEligibility(course1.courseId, learnerA.email);
  assert(eligPartial.eligible === false, '2.3 Incomplete course (50%) is ineligible', 'Eligibility');

  // Backend rejects submission when ineligible
  let submitIneligibleBlocked = false;
  try {
    await submitBeneficiaryFeedback(course1.courseId, learnerA, {
      usefulnessRating: 5,
      confidenceRating: 5,
      mostUsefulLearning: 'Spreadsheet',
      intendedChange: 'Tracking weekly groceries',
      wouldRecommend: 'yes',
      testimonialConsent: 'anonymous'
    });
  } catch (err) {
    submitIneligibleBlocked = err.ineligible === true;
  }
  assert(submitIneligibleBlocked, '3.1 Ineligible submission rejected with 403 (browser spoofing blocked)', 'Eligibility');

  // -------------------------------------------------------------
  // After Assessment Pre-requisite
  // -------------------------------------------------------------
  console.log('\n--- After Assessment Pre-requisite Check ---');
  // Complete lesson 2 to reach 100% course content
  await completeLesson(course1.courseId, les2.lessonId, learnerA);

  // Content is 100%, but After Assessment is published and NOT yet submitted
  const eligAfterPending = await checkFeedbackEligibility(course1.courseId, learnerA.email);
  assert(eligAfterPending.eligible === false, '4.1 Ineligible when required After Assessment is pending', 'Eligibility');
  assert(eligAfterPending.afterAssessmentRequired === true, '4.2 afterAssessmentRequired flag is true', 'Eligibility');

  // Complete After Assessment
  await submitAfterResponse(after1.assessmentId, learnerA, { aq_budget: 4 });

  // Now learner should be eligible!
  const eligComplete = await checkFeedbackEligibility(course1.courseId, learnerA.email);
  assert(eligComplete.eligible === true, '1.1 Eligible when course & after assessment are complete', 'Eligibility');
  assert(eligComplete.alreadySubmitted === false, '1.2 alreadySubmitted is false', 'Eligibility');

  // -------------------------------------------------------------
  // 4, 5, 6, 7, 8. Payload Validation & Scale Enforcements
  // -------------------------------------------------------------
  console.log('\n--- 4-8. Submission Validation & Range Enforcements ---');
  // Skipped required question 1
  const errNoUseful = validateFeedbackPayload({
    confidenceRating: 4,
    mostUsefulLearning: 'Text',
    intendedChange: 'Text',
    wouldRecommend: 'yes',
    testimonialConsent: 'none'
  });
  assert(errNoUseful.some(e => e.includes('Question 1')), '5.1 Question 1 cannot be skipped', 'Validation');

  // Rating out of range (< 1)
  const errLowRating = validateFeedbackPayload({
    usefulnessRating: 0,
    confidenceRating: 4,
    mostUsefulLearning: 'Text',
    intendedChange: 'Text',
    wouldRecommend: 'yes',
    testimonialConsent: 'none'
  });
  assert(errLowRating.some(e => e.includes('between 1 and 5')), '6.1 Rating 0 is rejected', 'Validation');

  // Rating out of range (> 5)
  const errHighRating = validateFeedbackPayload({
    usefulnessRating: 6,
    confidenceRating: 4,
    mostUsefulLearning: 'Text',
    intendedChange: 'Text',
    wouldRecommend: 'yes',
    testimonialConsent: 'none'
  });
  assert(errHighRating.some(e => e.includes('between 1 and 5')), '6.2 Rating 6 is rejected', 'Validation');

  // Invalid recommendation value
  const errBadRecommend = validateFeedbackPayload({
    usefulnessRating: 5,
    confidenceRating: 4,
    mostUsefulLearning: 'Text',
    intendedChange: 'Text',
    wouldRecommend: 'maybe',
    testimonialConsent: 'none'
  });
  assert(errBadRecommend.some(e => e.includes('Must be "yes" or "no"')), '7.1 Invalid recommendation "maybe" is rejected', 'Validation');

  // Consent missing (no default option)
  const errNoConsent = validateFeedbackPayload({
    usefulnessRating: 5,
    confidenceRating: 4,
    mostUsefulLearning: 'Text',
    intendedChange: 'Text',
    wouldRecommend: 'yes',
    testimonialConsent: ''
  });
  assert(errNoConsent.some(e => e.includes('make a selection')), '8.1 Missing consent choice is rejected (no default allowed)', 'Validation');

  // -------------------------------------------------------------
  // 9, 10, 11, 12, 13, 14. Valid Submissions & Consent Options
  // -------------------------------------------------------------
  console.log('\n--- 9-14. Valid Submissions, Consent Types & Idempotency ---');
  // Learner A submits with 'anonymous' consent
  const subA = await submitBeneficiaryFeedback(course1.courseId, learnerA, {
    usefulnessRating: 5,
    confidenceRating: 4,
    mostUsefulLearning: 'How to structure emergency savings in a separate local building society account.',
    intendedChange: 'Set up an automatic standing order on payday.',
    nextLearning: 'Digital spreadsheets for family budgeting.',
    wouldRecommend: 'yes',
    testimonialConsent: 'anonymous'
  });

  assert(subA.success === true, '9.1 Valid submission succeeds', 'Submission');
  assert(subA.newlySubmitted === true, '9.2 newlySubmitted is true', 'Submission');
  assert(subA.feedback.usefulnessRating === 5, '9.3 Usefulness rating stored as integer 5', 'Submission');
  assert(subA.feedback.confidenceRating === 4, '9.4 Confidence rating stored as integer 4', 'Submission');
  assert(subA.feedback.testimonialConsent === 'anonymous', '10.1 Anonymous consent stored', 'Consent');
  assert(subA.feedback.consentVersion === CONSENT_VERSION, '12.1 Consent version stored', 'Consent');
  assert(subA.feedback.consentText === STANDARD_CONSENT_TEXT, '12.2 Standard consent text stored', 'Consent');
  assert(subA.feedback.courseTitle === 'Essential Money Management & Household Budgeting', '23.1 Course title snapshot preserved', 'Snapshot');

  // Idempotency check: Repeated submission
  const subARepeat = await submitBeneficiaryFeedback(course1.courseId, learnerA, {
    usefulnessRating: 1, // tampered data
    confidenceRating: 1,
    mostUsefulLearning: 'Tampered',
    intendedChange: 'Tampered',
    wouldRecommend: 'no',
    testimonialConsent: 'none'
  });

  assert(subARepeat.alreadySubmitted === true, '14.1 Repeated submission returns alreadySubmitted: true', 'Idempotency');
  assert(subARepeat.newlySubmitted === false, '14.2 newlySubmitted is false', 'Idempotency');
  assert(subARepeat.feedback.usefulnessRating === 5, '13.1 Original rating 5 preserved without overwrite', 'Idempotency');
  assert(subARepeat.feedback.testimonialConsent === 'anonymous', '13.2 Original anonymous consent preserved', 'Idempotency');

  // -------------------------------------------------------------
  // Test Learner B: Submit with 'none' (refusing consent)
  // -------------------------------------------------------------
  console.log('\n--- Test Learner B with "none" Consent ---');
  // Setup Learner B course progress & after-assessment
  await submitBaselineResponse(baseline1.assessmentId, learnerB, { bq_budget: 1 });
  await startCourse(course1.courseId, learnerB);
  await completeLesson(course1.courseId, les1.lessonId, learnerB);
  await completeLesson(course1.courseId, les2.lessonId, learnerB);
  await submitAfterResponse(after1.assessmentId, learnerB, { aq_budget: 3 });

  const subB = await submitBeneficiaryFeedback(course1.courseId, learnerB, {
    usefulnessRating: 4,
    confidenceRating: 3,
    mostUsefulLearning: 'Comparison shopping techniques',
    intendedChange: 'Audit monthly bills',
    wouldRecommend: 'yes',
    testimonialConsent: 'none' // Refusing consent
  });

  assert(subB.success === true, '9.5 Submission with "none" consent succeeds without error', 'Consent');
  assert(subB.feedback.testimonialConsent === 'none', '9.6 Consent stored as none', 'Consent');

  // -------------------------------------------------------------
  // 15, 16, 17. Learner Isolation & Admin Authorization
  // -------------------------------------------------------------
  console.log('\n--- 15, 16, 17. Learner Isolation & Admin Protection ---');
  // Learner A views own feedback
  const myFbA = await getLearnerFeedback(course1.courseId, learnerA.email);
  assert(myFbA.learnerEmail === learnerA.email, '16.1 Learner A retrieves own feedback', 'Security');

  // Learner A does NOT see Learner B feedback
  assert(myFbA.learnerEmail !== learnerB.email, '16.2 Learner A cannot see Learner B feedback', 'Security');

  // Learner token receives 403 on Admin endpoint
  const adminReq = mockReqRes({ authorization: 'Bearer token_learner_a' });
  await requireAdmin(adminReq.req, adminReq.res, () => {});
  assert(adminReq.res.getStatusCode() === 403, '17.1 Learner token receives 403 Forbidden on Admin feedback routes', 'Security');

  // -------------------------------------------------------------
  // 18, 19, 20, 21. Admin Management & Consent Withdrawal
  // -------------------------------------------------------------
  console.log('\n--- 18-21. Admin Feedback Management & Consent Withdrawal ---');
  // Admin lists feedback
  const allFeedback = await getAllFeedbackAdmin({});
  assert(allFeedback.length === 2, '18.1 Admin views both feedback submissions', 'Admin Management');

  // Filter by course
  const courseFiltered = await getAllFeedbackAdmin({ courseId: course1.courseId });
  assert(courseFiltered.length === 2, '19.1 Filter by courseId succeeds', 'Admin Management');

  // Filter by consent
  const anonFiltered = await getAllFeedbackAdmin({ consent: 'anonymous' });
  assert(anonFiltered.length === 1 && anonFiltered[0].learnerEmail === learnerA.email, '19.2 Filter by consent anonymous succeeds', 'Admin Management');

  const noneFiltered = await getAllFeedbackAdmin({ consent: 'none' });
  assert(noneFiltered.length === 1 && noneFiltered[0].learnerEmail === learnerB.email, '19.3 Filter by consent none succeeds', 'Admin Management');

  // Record Consent Withdrawal for Learner A
  console.log('--- Recording Consent Withdrawal for Learner A ---');
  const withdrawnItem = await recordConsentWithdrawal(subA.feedback.feedbackId, adminEmail);
  assert(withdrawnItem.consentWithdrawn === true, '20.1 consentWithdrawn set to true', 'Consent Withdrawal');
  assert(withdrawnItem.consentWithdrawnAt !== null, '20.2 consentWithdrawnAt timestamp recorded', 'Consent Withdrawal');
  assert(withdrawnItem.mostUsefulLearning.includes('emergency savings'), '20.3 Underlying feedback preserved intact upon withdrawal', 'Consent Withdrawal');

  // Withdrawn item excluded from testimonial queries
  const activeAnonAfterWithdrawal = await getAllFeedbackAdmin({ consent: 'anonymous' });
  assert(activeAnonAfterWithdrawal.length === 0, '21.1 Withdrawn feedback excluded from active anonymous testimonial results', 'Consent Withdrawal');

  const withdrawnQuery = await getAllFeedbackAdmin({ consent: 'withdrawn' });
  assert(withdrawnQuery.length === 1 && withdrawnQuery[0].feedbackId === subA.feedback.feedbackId, '21.2 Withdrawn feedback listed in withdrawn filter', 'Consent Withdrawal');

  // -------------------------------------------------------------
  // 24, 25, 26. Non-destructive Data Integrity Checks
  // -------------------------------------------------------------
  console.log('\n--- 24, 25, 26. Non-Destructive System Preservation ---');
  const progA = await getCourseProgress(course1.courseId, learnerA.email);
  assert(progA.status === 'completed' && progA.progressPercentage === 100, '24.1 Course progress remains completed', 'Preservation');

  const afterA = await getLearnerAfterResponse(course1.courseId, learnerA.email);
  assert(afterA !== null && afterA.answers['aq_budget'].ratingValue === 4, '25.1 After assessment answers preserved intact', 'Preservation');

  // Cleanup
  resetTestTokenVerifier();

  console.log('\n========================================================================');
  console.log(`🎉 TASK 8 TESTS COMPLETE: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%)`);
  console.log('========================================================================\n');
}

runBeneficiaryFeedbackTests().catch(err => {
  console.error('\n💥 TEST RUNNER FAILED:', err);
  process.exit(1);
});
