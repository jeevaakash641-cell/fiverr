/**
 * Automated Acceptance Test Suite for Task 10:
 * Final Learner Dashboard System
 * One Community Ely Online Training Centre
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  getLearnerDashboardSummary
} from './services/learnerDashboardService.js';

import { createCourse, updateCourseStatus } from './services/courseService.js';
import { createModule, updateModuleStatus } from './services/moduleService.js';
import { createLesson, updateLessonStatus } from './services/lessonService.js';
import { saveCourseSelection } from './services/courseSelectionService.js';
import { startCourse, completeLesson, getCourseProgress } from './services/progressService.js';
import { createQuiz, updateQuizStatus, submitQuizAttempt } from './services/quizService.js';
import { createAssessment as createBaseline, submitBaselineResponse } from './services/baselineAssessmentService.js';
import { createAssessment as createAfter, submitAfterResponse } from './services/afterAssessmentService.js';
import { submitBeneficiaryFeedback } from './services/beneficiaryFeedbackService.js';
import { issueCertificate, revokeCertificate } from './services/certificateService.js';
import { saveUser, getUserByEmail } from './services/userService.js';
import { setTestTokenVerifier, resetTestTokenVerifier } from './services/firebaseAuthService.js';
import { requireAuth } from './middleware/auth.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, testGroup = 'Dashboard') {
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

function mockReqRes(headers = {}, body = {}, query = {}) {
  const req = {
    headers: { ...headers },
    header: (name) => {
      const key = Object.keys(req.headers).find(k => k.toLowerCase() === name.toLowerCase());
      return key ? req.headers[key] : undefined;
    },
    body,
    query
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

async function runDashboardTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 10 ACCEPTANCE TESTS: FINAL LEARNER DASHBOARD SYSTEM');
  console.log('========================================================================\n');

  const runId = Date.now();
  const adminEmail = 'admin@onecommunityely.com';
  const alice = { email: `alice_${runId}@onecommunityely.com`, id: `uid_alice_${runId}`, name: 'Alice Community' };
  const bob = { email: `bob_${runId}@onecommunityely.com`, id: `uid_bob_${runId}`, name: 'Bob Community' };

  // Configure Test Auth Tokens
  setTestTokenVerifier(async (token) => {
    if (token === 'token_admin') {
      return { uid: 'uid_admin', email: 'admin@onecommunityely.com' };
    }
    if (token === 'token_learner_alice') {
      return { uid: alice.id, email: alice.email };
    }
    if (token === 'token_learner_bob') {
      return { uid: bob.id, email: bob.email };
    }
    throw new Error('Invalid or expired token');
  });

  // Seed Users
  await saveUser({ email: adminEmail, name: 'Ely Admin', userType: 'teacher', role: 'admin', isBanned: false });
  await saveUser({ email: alice.email, name: alice.name, userType: 'student', role: 'student', learningInterests: 'Digital Skills', isBanned: false });
  await saveUser({ email: bob.email, name: bob.name, userType: 'student', role: 'student', learningInterests: 'Health & Wellbeing', isBanned: false });

  // -------------------------------------------------------------
  // 1. Security & Authentication Tests
  // -------------------------------------------------------------
  console.log('--- 1. Security & Authentication Tests ---');
  // Unauthenticated request without token returns 401
  const noTokenReq = mockReqRes({});
  await requireAuth(noTokenReq.req, noTokenReq.res, () => {});
  assert(noTokenReq.res.getStatusCode() === 401, '1.1 Unauthenticated request returns 401', 'Security');

  // Token with invalid format
  const badTokenReq = mockReqRes({ authorization: 'Bearer bad_token_123' });
  await requireAuth(badTokenReq.req, badTokenReq.res, () => {});
  assert(badTokenReq.res.getStatusCode() === 401, '1.2 Invalid token returns 401', 'Security');

  // Initial fresh summary for Alice (no courses selected yet)
  console.log('\n--- 2. Fresh Learner State (Explore Fallback) ---');
  const freshAliceSummary = await getLearnerDashboardSummary(alice);
  assert(freshAliceSummary.success === true, '2.1 Summary call succeeds', 'Fresh State');
  assert(freshAliceSummary.learnerProfile.email === alice.email, '2.2 Learner email matches token identity', 'Fresh State');
  assert(freshAliceSummary.summaryCounts.selectedCount === 0, '2.3 Selected count is 0', 'Fresh State');
  assert(freshAliceSummary.summaryCounts.inProgressCount === 0, '2.4 In-progress count is 0', 'Fresh State');
  assert(freshAliceSummary.summaryCounts.completedCount === 0, '2.5 Completed count is 0', 'Fresh State');
  assert(freshAliceSummary.summaryCounts.certificatesCount === 0, '2.6 Certificates count is 0', 'Fresh State');
  assert(freshAliceSummary.achievements.every(a => a.unlocked === false), '2.7 All achievements locked for fresh learner', 'Achievements');

  // Priority 9: Explore / Browse Fallback when no active courses
  assert(freshAliceSummary.nextAction.priority === 9 || freshAliceSummary.nextAction.priority === 8, '2.8 Priority 8 or 9 recommendation/explore action returned for fresh learner', 'Next Action');

  // -------------------------------------------------------------
  // 3. Setup Published Curriculum & Courses
  // -------------------------------------------------------------
  console.log('\n--- 3. Setting Up Curriculum ---');
  // Course 1: Digital Skills Course (Has Baseline, Quizzes, After Assessment)
  const course1 = await createCourse({
    title: 'Essential Online Public Services',
    shortDescription: 'Accessing council, NHS and local community resources online',
    category: 'Digital Skills'
  }, adminEmail);
  await updateCourseStatus(course1.courseId, 'published');

  const mod1 = await createModule(course1.courseId, { title: 'Module 1: NHS & Council Portals', orderIndex: 0 }, adminEmail);
  await updateModuleStatus(mod1.moduleId, 'published');

  const les1 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.1: Navigating the NHS App', orderIndex: 0 }, adminEmail);
  await updateLessonStatus(les1.lessonId, 'published');

  const les2 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.2: Council Tax & Rubbish Schedules', orderIndex: 1 }, adminEmail);
  await updateLessonStatus(les2.lessonId, 'published');

  // Published Baseline Assessment for Course 1
  const base1 = await createBaseline({
    title: 'Digital Services Baseline',
    courseId: course1.courseId,
    status: 'published',
    questions: [
      { questionId: 'bq1', type: 'confidence_rating', questionText: 'Confidence navigating online council forms', required: true, order: 0 }
    ]
  }, adminEmail);

  // Published After Assessment for Course 1
  const after1 = await createAfter({
    title: 'Digital Services Reflection',
    courseId: course1.courseId,
    baselineAssessmentId: base1.assessmentId,
    status: 'published',
    questions: [
      { questionId: 'aq1', type: 'confidence_rating', questionText: 'Confidence now navigating online council forms', baselineQuestionId: 'bq1', required: true, order: 0 }
    ]
  }, adminEmail);

  // Published Quiz for Course 1
  const quiz1 = await createQuiz({
    title: 'Digital Services Knowledge Check',
    courseId: course1.courseId,
    lessonId: null,
    passingScore: 70,
    questions: [
      {
        type: 'multiple_choice',
        questionText: 'Which portal is used for local council tax?',
        options: ['Local Council Website', 'Social Media', 'Random Forum'],
        correctAnswer: 'Local Council Website',
        points: 5
      }
    ]
  }, adminEmail);
  await updateQuizStatus(quiz1.quizId, 'published', adminEmail);

  // Course 2: Health Course
  const course2 = await createCourse({
    title: 'Everyday Wellbeing & Healthy Cooking',
    shortDescription: 'Nutritious affordable family meals in Ely',
    category: 'Health & Wellbeing'
  }, adminEmail);
  await updateCourseStatus(course2.courseId, 'published');

  const mod2 = await createModule(course2.courseId, { title: 'Module 1: Budget Cooking', orderIndex: 0 }, adminEmail);
  await updateModuleStatus(mod2.moduleId, 'published');

  const les2_1 = await createLesson(course2.courseId, mod2.moduleId, { title: 'Lesson 1.1: Pantry Basics', orderIndex: 0 }, adminEmail);
  await updateLessonStatus(les2_1.lessonId, 'published');

  // -------------------------------------------------------------
  // 4. Priority 1 Test: Required Baseline Assessment Pending
  // -------------------------------------------------------------
  console.log('\n--- 4. Priority 1: Required Baseline Pending ---');
  // Alice selects Course 1 (which has a published baseline assessment)
  await saveCourseSelection(alice.email, course1.courseId, 'recommendation', 'Interest in digital skills');

  const aliceSummaryP1 = await getLearnerDashboardSummary(alice);
  assert(aliceSummaryP1.summaryCounts.selectedCount === 1, '4.1 Selected count is 1', 'Selection');
  assert(aliceSummaryP1.nextAction.priority === 1, '4.2 Highest priority next action is Priority 1 (Baseline Pending)', 'Next Action');
  assert(aliceSummaryP1.nextAction.type === 'baseline_assessment', '4.3 Action type is baseline_assessment', 'Next Action');
  assert(aliceSummaryP1.nextAction.buttonUrl.includes('baseline-assessment'), '4.4 Button links to baseline assessment', 'Next Action');
  assert(aliceSummaryP1.pendingActions.some(a => a.type === 'baseline_assessment'), '4.5 Pending actions list contains baseline requirement', 'Pending Actions');

  // -------------------------------------------------------------
  // 5. Priority 2 Test: Selected Course Not Started
  // -------------------------------------------------------------
  console.log('\n--- 5. Priority 2: Selected Course Not Started ---');
  // Alice completes baseline for Course 1
  await submitBaselineResponse(base1.assessmentId, alice, { bq1: 2 });

  const aliceSummaryP2 = await getLearnerDashboardSummary(alice);
  assert(aliceSummaryP2.nextAction.priority === 2, '5.1 Priority is 2 (Course Not Started)', 'Next Action');
  assert(aliceSummaryP2.nextAction.type === 'course_not_started', '5.2 Action type is course_not_started', 'Next Action');
  assert(aliceSummaryP2.coursesNotStarted.length === 1, '5.3 coursesNotStarted list contains 1 course', 'Not Started');
  assert(aliceSummaryP2.coursesNotStarted[0].baselineCompleted === true, '5.4 Baseline completed flag is true', 'Not Started');

  // -------------------------------------------------------------
  // 6. Priority 3 Test: Continue Course In Progress
  // -------------------------------------------------------------
  console.log('\n--- 6. Priority 3: Continue In-Progress Course ---');
  // Alice starts Course 1
  await startCourse(course1.courseId, alice);

  const aliceSummaryP3 = await getLearnerDashboardSummary(alice);
  assert(aliceSummaryP3.summaryCounts.inProgressCount === 1, '6.1 inProgressCount is 1', 'In Progress');
  assert(aliceSummaryP3.nextAction.priority === 3, '6.2 Next action priority is 3 (Continue Learning)', 'Next Action');
  assert(aliceSummaryP3.nextAction.type === 'continue_learning', '6.3 Action type is continue_learning', 'Next Action');
  assert(aliceSummaryP3.coursesInProgress.length === 1, '6.4 coursesInProgress contains 1 course', 'In Progress');

  // Check Achievement: First Course Started is now unlocked!
  const achCourseStarted = aliceSummaryP3.achievements.find(a => a.id === 'first_course_started');
  assert(achCourseStarted.unlocked === true, '6.5 "First Course Started" achievement is unlocked', 'Achievements');

  // -------------------------------------------------------------
  // 7. Progress & Lessons Completed Tests
  // -------------------------------------------------------------
  console.log('\n--- 7. Lesson Completion & Progress Updates ---');
  // Alice completes lesson 1
  await completeLesson(course1.courseId, les1.lessonId, alice);

  const aliceSummaryProgress = await getLearnerDashboardSummary(alice);
  assert(aliceSummaryProgress.summaryCounts.lessonsCompletedCount === 1, '7.1 lessonsCompletedCount is 1', 'Summary Counts');
  assert(aliceSummaryProgress.coursesInProgress[0].progressPercentage === 50, '7.2 Progress percentage is 50% (1 of 2 lessons)', 'Progress Calculation');

  // Check Achievement: First Lesson Completed unlocked!
  const achLessonDone = aliceSummaryProgress.achievements.find(a => a.id === 'first_lesson_completed');
  assert(achLessonDone.unlocked === true, '7.3 "First Lesson Completed" achievement unlocked', 'Achievements');

  // -------------------------------------------------------------
  // 8. Priority 4 Test: Required Lesson Quiz Pending
  // -------------------------------------------------------------
  console.log('\n--- 8. Priority 4: Required Quiz Pending ---');
  // Complete lesson 2 -> Lessons are 100%, but course quiz1 is not yet passed
  await completeLesson(course1.courseId, les2.lessonId, alice);

  const aliceSummaryP4 = await getLearnerDashboardSummary(alice);
  assert(aliceSummaryP4.nextAction.priority === 4, '8.1 Next action priority is 4 (Quiz Required)', 'Next Action');
  assert(aliceSummaryP4.nextAction.type === 'lesson_quiz', '8.2 Action type is lesson_quiz', 'Next Action');
  assert(aliceSummaryP4.nextAction.buttonUrl.includes('/quiz/'), '8.3 Button links to quiz viewer', 'Next Action');

  // Pass the quiz
  const q1Id = quiz1.questions[0].questionId;
  await submitQuizAttempt(quiz1.quizId, alice, { [q1Id]: 'Local Council Website' }, 'sub_alice_q1');

  // Check Achievements: Quiz Completed & Quiz Passed
  const aliceSummaryQuizDone = await getLearnerDashboardSummary(alice);
  assert(aliceSummaryQuizDone.summaryCounts.quizzesPassedCount === 1, '8.4 quizzesPassedCount is 1', 'Summary Counts');
  const achQuizCompleted = aliceSummaryQuizDone.achievements.find(a => a.id === 'first_quiz_completed');
  const achQuizPassed = aliceSummaryQuizDone.achievements.find(a => a.id === 'quiz_passed');
  assert(achQuizCompleted.unlocked === true, '8.5 "First Quiz Completed" unlocked', 'Achievements');
  assert(achQuizPassed.unlocked === true, '8.6 "Quiz Passed" unlocked', 'Achievements');

  // -------------------------------------------------------------
  // 9. Priority 5 Test: Final Assessment Pending
  // -------------------------------------------------------------
  console.log('\n--- 9. Priority 5: Final Assessment Pending ---');
  assert(aliceSummaryQuizDone.nextAction.priority === 5, '9.1 Next action priority is 5 (Final Assessment Pending)', 'Next Action');
  assert(aliceSummaryQuizDone.nextAction.type === 'after_assessment', '9.2 Action type is after_assessment', 'Next Action');
  assert(aliceSummaryQuizDone.summaryCounts.completedCount === 1, '9.3 Course is marked in completedCount', 'Completed Courses');
  assert(aliceSummaryQuizDone.coursesCompleted[0].afterAssessmentCompleted === false, '9.4 afterAssessmentCompleted is false', 'Completed Courses');

  // Submit After Assessment
  await submitAfterResponse(after1.assessmentId, alice, { aq1: 5 });

  const aliceSummaryAfterDone = await getLearnerDashboardSummary(alice);
  const achAfterDone = aliceSummaryAfterDone.achievements.find(a => a.id === 'final_assessment_completed');
  assert(achAfterDone.unlocked === true, '9.5 "Final Assessment Completed" achievement unlocked', 'Achievements');

  // -------------------------------------------------------------
  // 10. Priority 6 Test: Beneficiary Feedback Pending
  // -------------------------------------------------------------
  console.log('\n--- 10. Priority 6: Beneficiary Feedback Pending ---');
  assert(aliceSummaryAfterDone.nextAction.priority === 6, '10.1 Next action priority is 6 (Beneficiary Feedback Pending)', 'Next Action');
  assert(aliceSummaryAfterDone.nextAction.type === 'beneficiary_feedback', '10.2 Action type is beneficiary_feedback', 'Next Action');

  // Submit Beneficiary Feedback
  await submitBeneficiaryFeedback(course1.courseId, alice, {
    usefulnessRating: 5,
    confidenceRating: 5,
    mostUsefulLearning: 'Navigating council forms',
    intendedChange: 'Applying online directly',
    wouldRecommend: 'yes',
    testimonialConsent: 'named'
  });

  const aliceSummaryFeedbackDone = await getLearnerDashboardSummary(alice);
  const achFbDone = aliceSummaryFeedbackDone.achievements.find(a => a.id === 'feedback_submitted');
  assert(achFbDone.unlocked === true, '10.3 "Feedback Submitted" achievement unlocked', 'Achievements');

  // -------------------------------------------------------------
  // 11. Priority 7 Test: Certificate Ready / Issued
  // -------------------------------------------------------------
  console.log('\n--- 11. Priority 7: Certificate Ready & Earned ---');
  assert(aliceSummaryFeedbackDone.nextAction.priority === 7, '11.1 Next action priority is 7 (Certificate Ready)', 'Next Action');
  assert(aliceSummaryFeedbackDone.nextAction.type === 'certificate_ready', '11.2 Action type is certificate_ready', 'Next Action');

  // Issue Certificate
  const certResult = await issueCertificate(course1.courseId, alice);
  assert(certResult.success === true, '11.3 Certificate issued successfully', 'Certificates');

  const aliceSummaryCertDone = await getLearnerDashboardSummary(alice);
  assert(aliceSummaryCertDone.summaryCounts.certificatesCount === 1, '11.4 certificatesCount is 1', 'Certificates');
  assert(aliceSummaryCertDone.certificates.length === 1, '11.5 certificates list contains 1 item', 'Certificates');
  assert(aliceSummaryCertDone.certificates[0].certificateNumber.startsWith('OCE-2026-'), '11.6 Certificate number is valid', 'Certificates');

  // Check Achievement: First Certificate Earned
  const achCertEarned = aliceSummaryCertDone.achievements.find(a => a.id === 'first_certificate_earned');
  assert(achCertEarned.unlocked === true, '11.7 "First Certificate Earned" achievement unlocked', 'Achievements');

  // Check that completed courses list shows all badges completed
  const completedC1 = aliceSummaryCertDone.coursesCompleted[0];
  assert(completedC1.afterAssessmentCompleted === true, '11.8 Completed course afterAssessmentCompleted is true', 'Completed Courses');
  assert(completedC1.feedbackCompleted === true, '11.9 Completed course feedbackCompleted is true', 'Completed Courses');
  assert(completedC1.certificateIssued === true, '11.10 Completed course certificateIssued is true', 'Completed Courses');

  // -------------------------------------------------------------
  // 12. Recommendations & Learner Isolation
  // -------------------------------------------------------------
  console.log('\n--- 12. Recommendations & Data Isolation ---');
  console.log('DEBUG recs:', aliceSummaryCertDone.recommendations.map(r => ({ id: r.courseId, title: r.title, score: r.score, isFallback: r.isFallback })));
  assert(aliceSummaryCertDone.recommendations.length > 0, '12.1 Recommendations returned for learner', 'Recommendations');
  assert(aliceSummaryCertDone.recommendations.every(r => r.status === 'published'), '12.1b All recommendations are published courses', 'Recommendations');
  assert(!aliceSummaryCertDone.recommendations.some(r => r.courseId === course1.courseId), '12.2 Already completed Course 1 is excluded from recommendations', 'Recommendations');

  // Bob's data isolation check: Bob has 0 progress, 0 selections, 0 certificates
  const bobSummary = await getLearnerDashboardSummary(bob);
  assert(bobSummary.recommendations.some(r => r.courseId === course2.courseId), '12.2b Bob recommendations match Course 2 (Health & Wellbeing)', 'Recommendations');
  assert(bobSummary.summaryCounts.selectedCount === 0, '12.3 Bob has 0 selected courses (isolated from Alice)', 'Isolation');
  assert(bobSummary.summaryCounts.completedCount === 0, '12.4 Bob has 0 completed courses', 'Isolation');
  assert(bobSummary.summaryCounts.certificatesCount === 0, '12.5 Bob has 0 certificates', 'Isolation');
  assert(bobSummary.achievements.every(a => a.unlocked === false), '12.6 Bob has 0 unlocked achievements', 'Isolation');

  // Cleanup Test Auth
  resetTestTokenVerifier();

  console.log('\n========================================================================');
  console.log(`🎉 TASK 10 TESTS COMPLETE: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%)`);
  console.log('========================================================================\n');
}

runDashboardTests().catch(err => {
  console.error('\n💥 TEST RUNNER FAILED:', err);
  process.exit(1);
});
