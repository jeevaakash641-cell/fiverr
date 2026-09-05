/**
 * Automated Acceptance Test Suite for Task 9:
 * Certificate of Completion System
 * One Community Ely Online Training Centre
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  createAssessment as createBaselineAssessment,
  submitBaselineResponse
} from './services/baselineAssessmentService.js';

import {
  createAssessment as createAfterAssessment,
  submitAfterResponse
} from './services/afterAssessmentService.js';

import {
  submitBeneficiaryFeedback
} from './services/beneficiaryFeedbackService.js';

import {
  checkCertificateEligibility,
  issueCertificate,
  getCertificateById,
  getLearnerCertificates,
  getAllCertificatesAdmin,
  revokeCertificate,
  verifyCertificatePublic,
  generateCertificatePDF,
  maskLearnerName,
  MANDATORY_DISCLAIMER
} from './services/certificateService.js';

import { createCourse, updateCourseStatus } from './services/courseService.js';
import { createModule, updateModuleStatus } from './services/moduleService.js';
import { createLesson, updateLessonStatus } from './services/lessonService.js';
import { createQuiz, updateQuizStatus, submitQuizAttempt } from './services/quizService.js';
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

async function runCertificateTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 9 ACCEPTANCE TESTS: CERTIFICATE OF COMPLETION SYSTEM');
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
  const learnerA = { email: 'learner_a@onecommunityely.com', id: 'uid_learner_a', name: 'Angela Davies' };
  const learnerB = { email: 'learner_b@onecommunityely.com', id: 'uid_learner_b', name: 'Robert Clark' };

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

  const mod1 = await createModule(course1.courseId, { title: 'Module 1: Everyday Digital Tools', orderIndex: 0 }, adminEmail);
  await updateModuleStatus(mod1.moduleId, 'published');

  const les1 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.1: Web Browsing', orderIndex: 0 }, adminEmail);
  await updateLessonStatus(les1.lessonId, 'published');
  const les2 = await createLesson(course1.courseId, mod1.moduleId, { title: 'Lesson 1.2: Email Security', orderIndex: 1 }, adminEmail);
  await updateLessonStatus(les2.lessonId, 'published');

  // Quiz for Course 1
  const quiz1 = await createQuiz({
    title: 'Digital Safety Knowledge Check',
    courseId: course1.courseId,
    lessonId: null,
    passingScore: 70,
    questions: [
      {
        type: 'multiple_choice',
        questionText: 'What is a strong password?',
        options: [
          '123456',
          'A long phrase with mixed characters'
        ],
        correctAnswer: 'A long phrase with mixed characters',
        points: 5
      }
    ]
  }, adminEmail);
  await updateQuizStatus(quiz1.quizId, 'published', adminEmail);

  // Published Baseline Assessment for Course 1
  const baseline1 = await createBaselineAssessment({
    title: 'Digital Inclusion Baseline',
    courseId: course1.courseId,
    status: 'published',
    questions: [
      { questionId: 'bq_net', type: 'confidence_rating', questionText: 'Confidence using internet', required: true, order: 0 }
    ]
  }, adminEmail);

  // Published After Assessment for Course 1
  const after1 = await createAfterAssessment({
    title: 'Digital Inclusion Final Reflection',
    courseId: course1.courseId,
    baselineAssessmentId: baseline1.assessmentId,
    status: 'published',
    questions: [
      { questionId: 'aq_net', type: 'confidence_rating', questionText: 'Confidence now using internet', baselineQuestionId: 'bq_net', required: true, order: 0 }
    ]
  }, adminEmail);

  // -------------------------------------------------------------
  // 1-5. Authoritative Eligibility Checks
  // -------------------------------------------------------------
  console.log('\n--- 1-5. Certificate Eligibility Checks ---');
  // Check 1: Course not started
  const eligNotStarted = await checkCertificateEligibility(course1.courseId, learnerA.email);
  assert(eligNotStarted.eligible === false, '1.1 Not started course is ineligible', 'Eligibility');

  // Check 2: Started course, only completed 1 of 2 lessons
  await submitBaselineResponse(baseline1.assessmentId, learnerA, { bq_net: 2 });
  await startCourse(course1.courseId, learnerA);
  await completeLesson(course1.courseId, les1.lessonId, learnerA);

  const eligLessonsIncomplete = await checkCertificateEligibility(course1.courseId, learnerA.email);
  assert(eligLessonsIncomplete.eligible === false, '1.2 Incomplete lessons (50%) is ineligible', 'Eligibility');
  assert(eligLessonsIncomplete.requirements.courseCompleted === false, '1.3 courseCompleted flag is false', 'Eligibility');

  // Attempt issuance when ineligible -> should throw with 403
  let issueBlockedIneligible = false;
  try {
    await issueCertificate(course1.courseId, learnerA);
  } catch (err) {
    issueBlockedIneligible = err.ineligible === true;
  }
  assert(issueBlockedIneligible, '5.1 Ineligible learner blocked from issuing certificate (backend enforced)', 'Eligibility');

  // Complete lesson 2 -> lessons are now 100%, but Quiz not yet passed
  await completeLesson(course1.courseId, les2.lessonId, learnerA);
  const eligQuizPending = await checkCertificateEligibility(course1.courseId, learnerA.email);
  assert(eligQuizPending.eligible === false, '2.1 Ineligible when required quiz is not yet passed', 'Eligibility');
  assert(eligQuizPending.requirements.quizzesPassed === false, '2.2 quizzesPassed is false', 'Eligibility');

  // Pass the quiz
  const qId = quiz1.questions[0].questionId;
  await submitQuizAttempt(quiz1.quizId, learnerA, { [qId]: 'A long phrase with mixed characters' }, 'sub_cert_quiz_1');

  // Quizzes passed, but After Assessment pending
  const eligAfterPending = await checkCertificateEligibility(course1.courseId, learnerA.email);
  assert(eligAfterPending.eligible === false, '3.1 Ineligible when After Assessment is pending', 'Eligibility');
  assert(eligAfterPending.requirements.afterAssessmentCompleted === false, '3.2 afterAssessmentCompleted is false', 'Eligibility');

  // Submit After Assessment
  await submitAfterResponse(after1.assessmentId, learnerA, { aq_net: 5 });

  // After assessment completed, but Beneficiary Feedback pending
  const eligFeedbackPending = await checkCertificateEligibility(course1.courseId, learnerA.email);
  assert(eligFeedbackPending.eligible === false, '4.1 Ineligible when Beneficiary Feedback is pending', 'Eligibility');
  assert(eligFeedbackPending.requirements.feedbackSubmitted === false, '4.2 feedbackSubmitted is false', 'Eligibility');

  // Submit Beneficiary Feedback
  await submitBeneficiaryFeedback(course1.courseId, learnerA, {
    usefulnessRating: 5,
    confidenceRating: 5,
    mostUsefulLearning: 'Digital security essentials',
    intendedChange: 'Applying multi-factor auth on all personal accounts',
    wouldRecommend: 'yes',
    testimonialConsent: 'named'
  });

  // Now all requirements are satisfied!
  const eligAllDone = await checkCertificateEligibility(course1.courseId, learnerA.email);
  assert(eligAllDone.eligible === true, '6.1 Learner is eligible once all 4 requirements are fulfilled', 'Eligibility');

  // -------------------------------------------------------------
  // 6, 7, 8. Certificate Issuance & Idempotency
  // -------------------------------------------------------------
  console.log('\n--- 6, 7, 8. Certificate Issuance & Idempotency ---');
  const issueResultA = await issueCertificate(course1.courseId, learnerA);
  assert(issueResultA.success === true, '6.2 Issue certificate succeeds', 'Issuance');
  assert(issueResultA.newlyIssued === true, '6.3 newlyIssued is true', 'Issuance');

  const certA = issueResultA.certificate;
  assert(certA.certificateNumber.startsWith('OCE-2026-'), '7.1 Certificate number format matches OCE-2026-...', 'Numbering');
  assert(certA.status === 'active', '7.2 Status is active', 'Issuance');
  assert(certA.learnerNameSnapshot === 'Angela Davies', '11.1 Learner name snapshot preserved', 'Snapshot');
  assert(certA.courseTitleSnapshot === 'Digital Inclusion & Essential Life Skills', '11.2 Course title snapshot preserved', 'Snapshot');

  // Idempotency check: Requesting certificate again returns identical record & number
  const repeatIssue = await issueCertificate(course1.courseId, learnerA);
  assert(repeatIssue.alreadyIssued === true, '8.1 Repeated issuance returns alreadyIssued: true', 'Idempotency');
  assert(repeatIssue.newlyIssued === false, '8.2 newlyIssued is false', 'Idempotency');
  assert(repeatIssue.certificate.certificateNumber === certA.certificateNumber, '8.3 Certificate number remains identical on repeat request', 'Idempotency');
  assert(repeatIssue.certificate.issuedAt === certA.issuedAt, '8.4 Original issue timestamp preserved without update', 'Idempotency');

  // -------------------------------------------------------------
  // 9, 10. PDF Generation & Disclaimer Verification
  // -------------------------------------------------------------
  console.log('\n--- 9, 10. PDF Generation & Disclaimer ---');
  const pdfBuffer = await generateCertificatePDF(certA);
  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 5000, '9.1 Server-side PDF buffer generated (> 5KB)', 'PDF Generation');

  // Verify PDF header magic bytes "%PDF-"
  const pdfMagic = pdfBuffer.slice(0, 5).toString('ascii');
  assert(pdfMagic === '%PDF-', '9.2 PDF buffer starts with valid %PDF- header', 'PDF Generation');

  assert(certA.disclaimer.includes('regulated qualification'), '10.1 Mandatory non-accreditation disclaimer included in certificate record', 'Disclaimer');
  assert(MANDATORY_DISCLAIMER.includes('regulated qualification'), '10.2 Mandatory disclaimer constant verified', 'Disclaimer');

  // -------------------------------------------------------------
  // 12, 13. Security & Learner Isolation
  // -------------------------------------------------------------
  console.log('\n--- 12, 13. Security & Learner Isolation ---');
  // Learner B certificates should be empty (Learner A isolated)
  const certsB = await getLearnerCertificates(learnerB.email);
  assert(certsB.length === 0, '12.1 Learner B has 0 certificates (isolated from Learner A)', 'Security');

  // Learner A certificates contains 1
  const certsA = await getLearnerCertificates(learnerA.email);
  assert(certsA.length === 1 && certsA[0].certificateId === certA.certificateId, '12.2 Learner A retrieves own certificate', 'Security');

  // Learner token receives 403 on Admin endpoint
  const adminReq = mockReqRes({ authorization: 'Bearer token_learner_a' });
  await requireAdmin(adminReq.req, adminReq.res, () => {});
  assert(adminReq.res.getStatusCode() === 403, '13.1 Learner token receives 403 Forbidden on Admin certificate routes', 'Security');

  // -------------------------------------------------------------
  // 14. Public Verification & Name Masking
  // -------------------------------------------------------------
  console.log('\n--- 14. Public Certificate Verification ---');
  const pubVerify = await verifyCertificatePublic(certA.certificateNumber);
  assert(pubVerify.valid === true, '14.1 Public verification returns valid: true for active cert', 'Public Verification');
  assert(pubVerify.status === 'active', '14.2 Status is active', 'Public Verification');
  assert(
    pubVerify.learnerName.startsWith('A*') &&
    pubVerify.learnerName.includes('D*') &&
    !pubVerify.learnerName.includes('Angela') &&
    !pubVerify.learnerName.includes('Davies'),
    '14.3 Learner name is masked for privacy (Angela Davies -> A**** D****); email is NOT exposed',
    'Public Verification'
  );
  assert(pubVerify.courseTitle === 'Digital Inclusion & Essential Life Skills', '14.4 Course title matches', 'Public Verification');
  assert(pubVerify.email === undefined, '14.5 Email is never exposed publicly', 'Public Verification');

  // Unknown certificate number
  const unknownVerify = await verifyCertificatePublic('OCE-2026-FAKE-999999');
  assert(unknownVerify.valid === false, '14.6 Nonexistent certificate returns valid: false', 'Public Verification');
  assert(unknownVerify.status === 'not_found', '14.7 Nonexistent certificate returns status: not_found', 'Public Verification');

  // -------------------------------------------------------------
  // 15, 16, 17, 18. Admin Management & Revocation
  // -------------------------------------------------------------
  console.log('\n--- 15-18. Admin Certificate Management & Revocation ---');
  // Admin lists certificates
  const adminCerts = await getAllCertificatesAdmin({});
  assert(adminCerts.length >= 1, '15.1 Admin lists all certificates', 'Admin Management');

  // Filter by course
  const filteredByCourse = await getAllCertificatesAdmin({ courseId: course1.courseId });
  assert(filteredByCourse.length >= 1, '15.2 Filter by course succeeds', 'Admin Management');

  // Revoke certificate with required reason
  let emptyReasonBlocked = false;
  try {
    await revokeCertificate(certA.certificateId, '');
  } catch (err) {
    emptyReasonBlocked = err.message.includes('reason is required');
  }
  assert(emptyReasonBlocked, '16.1 Revoking without reason is rejected', 'Revocation');

  const revokedCert = await revokeCertificate(
    certA.certificateId,
    'Learner requested cancellation due to employer name change',
    adminEmail
  );

  assert(revokedCert.status === 'revoked', '16.2 Certificate status changed to revoked', 'Revocation');
  assert(revokedCert.revokedAt !== null, '18.1 revokedAt timestamp is recorded', 'Revocation');
  assert(revokedCert.revokedBy === adminEmail, '18.2 revokedBy admin recorded', 'Revocation');
  assert(revokedCert.revocationReason.includes('employer name change'), '18.3 Revocation reason preserved', 'Revocation');

  // Public verification now returns revoked
  const pubVerifyRevoked = await verifyCertificatePublic(certA.certificateNumber);
  assert(pubVerifyRevoked.valid === false, '17.1 Revoked certificate returns valid: false', 'Public Verification');
  assert(pubVerifyRevoked.status === 'revoked', '17.2 Revoked certificate returns status: revoked', 'Public Verification');
  assert(pubVerifyRevoked.message.includes('has been revoked'), '17.3 Revocation message returned', 'Public Verification');

  // -------------------------------------------------------------
  // 19. Non-destructive Preservation Checks
  // -------------------------------------------------------------
  console.log('\n--- 19. System Non-Destructive Preservation ---');
  const progA = await getCourseProgress(course1.courseId, learnerA.email);
  assert(progA.status === 'completed' && progA.progressPercentage === 100, '19.1 Course progress remains 100% completed', 'Preservation');

  const fbA = await submitBeneficiaryFeedback(course1.courseId, learnerA, {});
  assert(fbA.alreadySubmitted === true, '19.2 Feedback submission remains intact', 'Preservation');

  // Cleanup
  resetTestTokenVerifier();

  console.log('\n========================================================================');
  console.log(`🎉 TASK 9 TESTS COMPLETE: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%)`);
  console.log('========================================================================\n');
}

runCertificateTests().catch(err => {
  console.error('\n💥 TEST RUNNER FAILED:', err);
  process.exit(1);
});
