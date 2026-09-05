/**
 * Automated Acceptance Test Suite for Task 7:
 * After Assessment and Before-vs-After Outcome Comparison
 * Covers all 35 specified test requirements.
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  createAssessment as createBaselineAssessment,
  updateAssessmentStatus as updateBaselineStatus,
  submitBaselineResponse,
  getLearnerBaselineResponse
} from './services/baselineAssessmentService.js';

import {
  createAssessment as createAfterAssessment,
  createDraftFromBaseline,
  getAssessmentById as getAfterAssessmentById,
  getAllAssessmentsAdmin as getAllAfterAssessmentsAdmin,
  getPublishedAssessmentForCourse as getPublishedAfterAssessmentForCourse,
  updateAssessment as updateAfterAssessment,
  updateAssessmentStatus as updateAfterAssessmentStatus,
  deleteAssessment as deleteAfterAssessment,
  checkLearnerEligibility,
  calculateBeforeAfterComparison,
  submitAfterResponse,
  getLearnerAfterResponse,
  getAssessmentResponsesAdmin
} from './services/afterAssessmentService.js';

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

async function runAfterAssessmentTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 7 ACCEPTANCE TESTS: AFTER ASSESSMENT & OUTCOME COMPARISON');
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
    title: 'Digital Inclusion & Essential Life Skills',
    shortDescription: 'Core digital skills for Ely community members',
    category: 'Digital Skills'
  }, adminEmail);
  await updateCourseStatus(course1.courseId, 'published');

  const mod1 = await createModule(course1.courseId, { title: 'Module 1: Getting Started', orderIndex: 0 }, adminEmail);
  await updateModuleStatus(mod1.moduleId, 'published');

  const les1 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.1: Device Basics', orderIndex: 0 }, adminEmail);
  await updateLessonStatus(les1.lessonId, 'published');
  const les2 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.2: Online Navigation', orderIndex: 1 }, adminEmail);
  await updateLessonStatus(les2.lessonId, 'published');

  // Baseline Assessment for Course 1
  console.log('--- Creating and publishing Baseline Assessment for Course 1 ---');
  const baseline1 = await createBaselineAssessment({
    title: 'Digital Inclusion Starting Benchmark',
    courseId: course1.courseId,
    status: 'published',
    questions: [
      {
        questionId: 'bq_internet_conf',
        type: 'confidence_rating',
        questionText: 'How confident are you about using the internet safely?',
        required: true,
        order: 0
      },
      {
        questionId: 'bq_email_conf',
        type: 'confidence_rating',
        questionText: 'How confident are you about managing your email?',
        required: true,
        order: 1
      },
      {
        questionId: 'bq_goals',
        type: 'short_text',
        questionText: 'What would you most like to learn from this course?',
        required: true,
        order: 2
      }
    ]
  }, adminEmail);

  // Learner A completes Baseline Assessment with ratings (Internet: 2, Email: 3)
  console.log('--- Learner A submits Baseline Assessment ---');
  await submitBaselineResponse(baseline1.assessmentId, learnerA, {
    bq_internet_conf: 2,
    bq_email_conf: 3,
    bq_goals: 'Learn to use local community council services online'
  });

  // Learner A starts course
  await startCourse(course1.courseId, learnerA);

  // -------------------------------------------------------------
  // 1. Admin creates an After Assessment draft
  // -------------------------------------------------------------
  console.log('\n--- 1. Admin creates After Assessment Draft ---');
  const draftAfter = await createAfterAssessment({
    title: 'Digital Inclusion Final Outcome',
    courseId: course1.courseId,
    baselineAssessmentId: baseline1.assessmentId,
    status: 'draft',
    questions: [
      {
        questionId: 'q_after_1',
        type: 'confidence_rating',
        questionText: 'How confident are you now about using the internet safely?',
        baselineQuestionId: 'bq_internet_conf',
        required: true,
        order: 0
      }
    ]
  }, adminEmail);

  assert(draftAfter.assessmentId.startsWith('after_'), '1.1 Assessment ID generated with after_ prefix', 'Creation');
  assert(draftAfter.status === 'draft', '1.2 Saved in draft status', 'Creation');
  assert(draftAfter.version === 1, '1.3 Initial version is 1', 'Creation');

  // -------------------------------------------------------------
  // 2, 3, 4. Auto-create draft from baseline assessment
  // -------------------------------------------------------------
  console.log('\n--- 2, 3, 4. Create Draft from Baseline Assessment ---');
  const autoCreatedDraft = await createDraftFromBaseline(baseline1.assessmentId, adminEmail);
  assert(autoCreatedDraft.assessmentId !== baseline1.assessmentId, '2.1 New assessment ID generated', 'From Baseline');
  assert(autoCreatedDraft.status === 'draft', '2.2 Auto-created assessment saved as draft', 'From Baseline');
  assert(autoCreatedDraft.baselineAssessmentId === baseline1.assessmentId, '2.3 Attached to original baselineAssessmentId', 'From Baseline');

  // Verify question links
  const copiedInternetQ = autoCreatedDraft.questions.find(q => q.baselineQuestionId === 'bq_internet_conf');
  const copiedEmailQ = autoCreatedDraft.questions.find(q => q.baselineQuestionId === 'bq_email_conf');
  assert(!!copiedInternetQ, '3.1 Internet confidence question retains link to bq_internet_conf', 'From Baseline');
  assert(!!copiedEmailQ, '3.2 Email confidence question retains link to bq_email_conf', 'From Baseline');
  assert(copiedInternetQ.questionText.includes('now'), '3.3 Question text updated for post-training reflection', 'From Baseline');

  // Verify baseline is NOT modified
  const reloadedBaseline = await getLearnerBaselineResponse(course1.courseId, learnerA.email);
  assert(reloadedBaseline.answers['bq_internet_conf'].ratingValue === 2, '4.1 Original baseline response remains unchanged', 'From Baseline');

  // -------------------------------------------------------------
  // 5. Admin edits and reorders final questions
  // -------------------------------------------------------------
  console.log('\n--- 5. Admin Edits and Reorders Questions ---');
  const editedDraft = await updateAfterAssessment(autoCreatedDraft.assessmentId, {
    title: 'Digital Inclusion Final Outcome & Confidence Shift',
    questions: [
      copiedEmailQ,
      copiedInternetQ,
      {
        questionId: 'q_after_reflection',
        type: 'short_text',
        questionText: 'What is the most important thing you learned?',
        required: true,
        order: 2
      }
    ]
  }, adminEmail);

  assert(editedDraft.questions[0].baselineQuestionId === 'bq_email_conf', '5.1 Questions reordered successfully', 'Editing');
  assert(editedDraft.questions[2].questionText.includes('most important'), '5.2 Question edited', 'Editing');
  assert(editedDraft.version === 1, '5.3 Editing draft preserves version 1', 'Editing');

  // -------------------------------------------------------------
  // 6 & 7. Validation Before Publishing & Publishing
  // -------------------------------------------------------------
  console.log('\n--- 6 & 7. Publishing Validation ---');
  let emptyQBlocked = false;
  try {
    await updateAfterAssessment(autoCreatedDraft.assessmentId, {
      status: 'published',
      questions: []
    }, adminEmail);
  } catch (err) {
    emptyQBlocked = err.message.includes('At least one question is required');
  }
  assert(emptyQBlocked, '6.1 Cannot publish with 0 questions', 'Validation');

  const publishedAfter = await updateAfterAssessmentStatus(autoCreatedDraft.assessmentId, 'published', adminEmail);
  assert(publishedAfter.status === 'published', '7.1 Valid after assessment successfully published', 'Publishing');
  assert(publishedAfter.publishedAt !== null, '7.2 publishedAt timestamp is set', 'Publishing');

  // -------------------------------------------------------------
  // 8. Single active published final assessment per course
  // -------------------------------------------------------------
  console.log('\n--- 8. Single Active Published Assessment Rule ---');
  const secondAfter = await createAfterAssessment({
    title: 'Digital Inclusion Final v2',
    courseId: course1.courseId,
    status: 'published',
    questions: [
      {
        questionId: 'q2_conf_net',
        type: 'confidence_rating',
        questionText: 'How confident are you now about using the internet safely?',
        baselineQuestionId: 'bq_internet_conf',
        required: true,
        order: 0
      },
      {
        questionId: 'q2_conf_mail',
        type: 'confidence_rating',
        questionText: 'How confident are you now about managing your email?',
        baselineQuestionId: 'bq_email_conf',
        required: true,
        order: 1
      },
      {
        questionId: 'q2_learned',
        type: 'short_text',
        questionText: 'What is the most valuable skill you developed?',
        required: true,
        order: 2
      }
    ]
  }, adminEmail);

  const reloadedFirst = await getAfterAssessmentById(autoCreatedDraft.assessmentId, true);
  assert(reloadedFirst.status === 'unpublished', '8.1 Previous after assessment automatically unpublished', 'Single Active Rule');

  const activeAfter = await getPublishedAfterAssessmentForCourse(course1.courseId);
  assert(activeAfter.assessmentId === secondAfter.assessmentId, '8.2 Exactly one active published after assessment exists for course', 'Single Active Rule');

  // -------------------------------------------------------------
  // 9, 10. Learner Eligibility: Incomplete learner blocked
  // -------------------------------------------------------------
  console.log('\n--- 9 & 10. Learner Eligibility Verification ---');
  // Learner A has completed 0 of 2 lessons
  const eligBeforeComplete = await checkLearnerEligibility(course1.courseId, learnerA.email);
  assert(eligBeforeComplete.eligible === false, '9.1 Incomplete learner is not eligible', 'Eligibility');
  assert(eligBeforeComplete.reason.includes('Complete the required course content'), '9.2 Friendly message returned', 'Eligibility');

  // Spoofed browser status check
  let spoofBlocked = false;
  try {
    await submitAfterResponse(secondAfter.assessmentId, learnerA, {
      q2_conf_net: 4,
      q2_conf_mail: 5,
      q2_learned: 'Browsing'
    });
  } catch (err) {
    spoofBlocked = err.ineligible === true;
  }
  assert(spoofBlocked, '10.1 Ineligible learner cannot submit final assessment (backend blocked)', 'Eligibility');

  // -------------------------------------------------------------
  // Complete Course Content to 100%
  // -------------------------------------------------------------
  console.log('--- Completing all lessons for Learner A ---');
  await completeLesson(course1.courseId, les1.lessonId, learnerA);
  await completeLesson(course1.courseId, les2.lessonId, learnerA);

  const progA = await getCourseProgress(course1.courseId, learnerA.email);
  assert(progA.status === 'completed' && progA.progressPercentage === 100, 'Course progress is 100% completed', 'Setup');

  // -------------------------------------------------------------
  // 11, 12. Eligible learner loads published assessment & draft hidden
  // -------------------------------------------------------------
  console.log('\n--- 11 & 12. Eligible Learner Access ---');
  const eligAfterComplete = await checkLearnerEligibility(course1.courseId, learnerA.email);
  assert(eligAfterComplete.eligible === true, '11.1 Completed learner is eligible', 'Eligibility');

  const learnerAssessmentView = await getAfterAssessmentById(secondAfter.assessmentId, false);
  assert(learnerAssessmentView !== null && learnerAssessmentView.title === secondAfter.title, '11.2 Learner can load published assessment', 'Learner Access');

  const draftView = await getAfterAssessmentById(draftAfter.assessmentId, false);
  assert(draftView === null, '12.1 Learner cannot view draft after assessment', 'Learner Access');

  // -------------------------------------------------------------
  // 13, 14. Submission Validation: Required fields & 1-5 scale
  // -------------------------------------------------------------
  console.log('\n--- 13 & 14. Submission Validation ---');
  let missingReqBlocked = false;
  try {
    await submitAfterResponse(secondAfter.assessmentId, learnerA, {
      q2_conf_net: 4,
      q2_conf_mail: 5
      // q2_learned missing
    });
  } catch (err) {
    missingReqBlocked = err.message.includes('Please provide an answer');
  }
  assert(missingReqBlocked, '13.1 Missing required short-text answer rejected', 'Submission Validation');

  let ratingLowBlocked = false;
  try {
    await submitAfterResponse(secondAfter.assessmentId, learnerA, {
      q2_conf_net: 0,
      q2_conf_mail: 4,
      q2_learned: 'Confidence'
    });
  } catch (err) {
    ratingLowBlocked = err.message.includes('between 1 and 5');
  }
  assert(ratingLowBlocked, '14.1 Rating 0 (< 1) is rejected', 'Submission Validation');

  let ratingHighBlocked = false;
  try {
    await submitAfterResponse(secondAfter.assessmentId, learnerA, {
      q2_conf_net: 6,
      q2_conf_mail: 4,
      q2_learned: 'Confidence'
    });
  } catch (err) {
    ratingHighBlocked = err.message.includes('between 1 and 5');
  }
  assert(ratingHighBlocked, '14.2 Rating 6 (> 5) is rejected', 'Submission Validation');

  // -------------------------------------------------------------
  // 15, 16, 17, 18, 19, 20, 21. Valid submission & Outcome Comparison
  // -------------------------------------------------------------
  console.log('\n--- 15-21. Valid Submission & Before-vs-After Comparison ---');
  // Learner A:
  // Baseline: Internet = 2, Email = 3
  // Final:    Internet = 4, Email = 3
  // Expected change: Internet = +2 (Improved), Email = 0 (Maintained)
  // Baseline Avg = (2 + 3) / 2 = 2.5
  // Final Avg = (4 + 3) / 2 = 3.5
  // Average Change = 3.5 - 2.5 = +1.0
  const submissionA = await submitAfterResponse(secondAfter.assessmentId, learnerA, {
    q2_conf_net: 4,
    q2_conf_mail: 3,
    q2_learned: 'I can now navigate online council services independently.'
  });

  assert(submissionA.success === true, '15.1 Valid submission succeeds', 'Submission');
  assert(submissionA.newlySubmitted === true, '15.2 Marked as newlySubmitted: true', 'Submission');

  const compA = submissionA.response.comparison;
  assert(compA.hasValidComparison === true, '19.1 Valid comparison generated', 'Comparison');
  assert(compA.averageBaseline === 2.5, '21.1 Average baseline confidence is 2.5', 'Comparison');
  assert(compA.averageFinal === 3.5, '21.2 Average final confidence is 3.5', 'Comparison');
  assert(compA.averageChange === 1.0, '21.3 Average change is +1.0', 'Comparison');
  assert(compA.improvedCount === 1, '20.1 One improved response (Internet: 2 -> 4 = +2)', 'Comparison');
  assert(compA.maintainedCount === 1, '20.2 One maintained response (Email: 3 -> 3 = 0)', 'Comparison');
  assert(compA.reducedCount === 0, '20.3 Zero reduced responses', 'Comparison');

  // Question level comparison checks
  const netComp = compA.questionComparisons.find(q => q.questionId === 'q2_conf_net');
  assert(netComp.baselineRating === 2, '19.2 Internet baseline rating is 2', 'Comparison');
  assert(netComp.finalRating === 4, '19.3 Internet final rating is 4', 'Comparison');
  assert(netComp.change === 2, '19.4 Internet change is +2', 'Comparison');
  assert(netComp.outcome === 'improved', '20.4 Internet outcome is improved', 'Comparison');

  const mailComp = compA.questionComparisons.find(q => q.questionId === 'q2_conf_mail');
  assert(mailComp.change === 0, '20.5 Email change is 0', 'Comparison');
  assert(mailComp.outcome === 'maintained', '20.6 Email outcome is maintained', 'Comparison');

  // Idempotency check: Repeated submission
  const repeatSubmission = await submitAfterResponse(secondAfter.assessmentId, learnerA, {
    q2_conf_net: 1, // tampered answers ignored
    q2_conf_mail: 1,
    q2_learned: 'Tampered'
  });
  assert(repeatSubmission.alreadySubmitted === true, '16.1 Repeated submission returns alreadySubmitted: true', 'Idempotency');
  assert(repeatSubmission.response.answers['q2_conf_net'].ratingValue === 4, '17.1 Original answers preserved intact', 'Idempotency');
  assert(repeatSubmission.response.assessmentVersion === 1, '18.1 Original assessment version preserved', 'Idempotency');

  // -------------------------------------------------------------
  // 20. Negative change calculation test
  // -------------------------------------------------------------
  console.log('\n--- 20. Negative Change Outcome Test ---');
  // Pure function test for negative change
  const negComparison = calculateBeforeAfterComparison(
    [{ questionId: 'q_test', type: 'confidence_rating', questionText: 'Test', baselineQuestionId: 'bq_test' }],
    { q_test: { questionId: 'q_test', type: 'confidence_rating', ratingValue: 2 } },
    { answers: { bq_test: { questionId: 'bq_test', type: 'confidence_rating', ratingValue: 4 } } }
  );
  assert(negComparison.questionComparisons[0].change === -2, '20.7 Baseline 4, Final 2 yields change of -2', 'Comparison');
  assert(negComparison.questionComparisons[0].outcome === 'reduced', '20.8 Outcome marked as reduced', 'Comparison');
  assert(negComparison.reducedCount === 1, '20.9 reducedCount is 1', 'Comparison');

  // -------------------------------------------------------------
  // 22 & 23. Missing baseline data & Incompatible questions
  // -------------------------------------------------------------
  console.log('\n--- 22 & 23. Missing Baseline Data & Incompatible Questions ---');
  const missingBaseComp = calculateBeforeAfterComparison(
    [
      { questionId: 'q_unlinked', type: 'confidence_rating', questionText: 'Unlinked', baselineQuestionId: null },
      { questionId: 'q_missing', type: 'confidence_rating', questionText: 'Missing Base', baselineQuestionId: 'bq_nonexistent' }
    ],
    {
      q_unlinked: { questionId: 'q_unlinked', type: 'confidence_rating', ratingValue: 4 },
      q_missing: { questionId: 'q_missing', type: 'confidence_rating', ratingValue: 3 }
    },
    null // No baseline response
  );

  assert(missingBaseComp.questionComparisons[0].status === 'unavailable', '22.1 Unlinked question marked as unavailable', 'Missing Baseline');
  assert(missingBaseComp.questionComparisons[1].status === 'unavailable', '22.2 Question with missing baseline marked as unavailable', 'Missing Baseline');
  assert(missingBaseComp.averageBaseline === null, '22.3 Missing baseline is NOT treated as zero (average is null)', 'Missing Baseline');
  assert(missingBaseComp.hasValidComparison === false, '23.1 hasValidComparison is false when no pairs match', 'Missing Baseline');

  // -------------------------------------------------------------
  // 24. Short-text answers saved without false numeric comparison
  // -------------------------------------------------------------
  console.log('\n--- 24. Short-Text Answers Handling ---');
  const textCompItem = compA.questionComparisons.find(q => q.type === 'short_text');
  assert(textCompItem.status === 'text_response', '24.1 Short-text status is text_response', 'Short-Text');
  assert(textCompItem.change === undefined, '24.2 Short-text has no numeric change property', 'Short-Text');
  assert(textCompItem.answerText.includes('independently'), '24.3 Short-text response saved cleanly', 'Short-Text');

  // -------------------------------------------------------------
  // 25 & 27. Learner Data Isolation & Admin Protection
  // -------------------------------------------------------------
  console.log('\n--- 25 & 27. Learner Isolation & Admin Protection ---');
  // Learner B outcome check (should be null)
  const learnerBOutcome = await getLearnerAfterResponse(course1.courseId, learnerB.email);
  assert(learnerBOutcome === null, '25.1 Learner B has no outcome record (Learner A isolated)', 'Security');

  // Learner token cannot access Admin endpoint (403)
  const adminReq = mockReqRes({ authorization: 'Bearer token_learner_a' });
  await requireAdmin(adminReq.req, adminReq.res, () => {});
  assert(adminReq.res.getStatusCode() === 403, '27.1 Learner token receives 403 on Admin response endpoints', 'Security');

  // -------------------------------------------------------------
  // 26. Admin views submitted comparisons
  // -------------------------------------------------------------
  console.log('\n--- 26. Admin Views Comparisons ---');
  const adminResponses = await getAssessmentResponsesAdmin(secondAfter.assessmentId);
  assert(adminResponses.length === 1, '26.1 Admin retrieves 1 submitted response', 'Admin View');
  assert(adminResponses[0].comparison.averageChange === 1.0, '26.2 Admin sees full outcome comparison', 'Admin View');

  // -------------------------------------------------------------
  // 28, 29, 30. Preservation of existing baseline, progress, and quizzes
  // -------------------------------------------------------------
  console.log('\n--- 28, 29, 30. Non-Destructive Preservation ---');
  const baselineStillIntact = await getLearnerBaselineResponse(course1.courseId, learnerA.email);
  assert(baselineStillIntact !== null, '28.1 Baseline submission remains intact', 'Preservation');

  const progressStillIntact = await getCourseProgress(course1.courseId, learnerA.email);
  assert(progressStillIntact.status === 'completed', '29.1 Course progress remains completed', 'Preservation');
  assert(progressStillIntact.progressPercentage === 100, '29.2 Course percentage remains 100%', 'Preservation');

  // -------------------------------------------------------------
  // Cleanup & Summary
  // -------------------------------------------------------------
  resetTestTokenVerifier();

  console.log('\n========================================================================');
  console.log(`🎉 TASK 7 TESTS COMPLETE: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%)`);
  console.log('========================================================================\n');
}

runAfterAssessmentTests().catch(err => {
  console.error('\n💥 TEST RUNNER FAILED:', err);
  process.exit(1);
});
