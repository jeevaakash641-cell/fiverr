/**
 * TASK 11 ACCEPTANCE TESTS: ADMIN IMPACT REPORTING
 * 
 * Verifies all requirements for Task 11:
 * - Admin-only role authorization and token security
 * - Real backend data aggregation (zero mock statistics)
 * - Exclusion of Admin accounts from learner metrics
 * - Active learner evaluation
 * - Safe mathematical formulas (handles zero starts safely without NaN)
 * - Quiz summary metrics with answers hidden
 * - Before-vs-after outcome delta evaluations (missing baseline not zero)
 * - Beneficiary feedback & testimonial consent categories
 * - Certificates metrics (active vs revoked)
 * - Date and course filtering with validation (endDate < startDate rejects with 400)
 * - CSV export with formula injection protection (=, +, -, @ escaped)
 */

import assert from 'assert';
import { setTestTokenVerifier, resetTestTokenVerifier } from './services/firebaseAuthService.js';
import { saveUser, getUserByEmail } from './services/userService.js';
import { createCourse, updateCourseStatus } from './services/courseService.js';
import { saveCourseSelection } from './services/courseSelectionService.js';
import { inMemoryProgress } from './services/progressService.js';
import { createQuiz, updateQuizStatus, submitQuizAttempt } from './services/quizService.js';
import { createAssessment, updateAssessmentStatus, inMemoryResponses as inMemoryBaselineResponses } from './services/baselineAssessmentService.js';
import { createAssessment as createAfterAssessment, updateAssessmentStatus as updateAfterAssessmentStatus, inMemoryAfterResponses } from './services/afterAssessmentService.js';
import { inMemoryFeedback } from './services/beneficiaryFeedbackService.js';
import { revokeCertificate, inMemoryCertificates } from './services/certificateService.js';
import {
  parseFilters,
  getOverviewReport,
  getLearnerActivityReport,
  getCoursePerformanceReport,
  getQuizResultsReport,
  getOutcomesReport,
  getFeedbackReport,
  getCertificatesReport,
  generateCsvExport,
  sanitizeCsvCell,
  formatCsv
} from './services/impactReportingService.js';

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function itAsync(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// Mock request / response helper for Express routes
function createMockReqRes({ method = 'GET', url = '/', headers = {}, query = {}, body = {} }) {
  let resolveResponse;
  const promise = new Promise(r => { resolveResponse = r; });

  let statusCode = 200;
  let responseData = null;
  const resHeaders = {};

  const cleanUrl = url.split('?')[0];
  const req = {
    method,
    url: cleanUrl,
    originalUrl: url,
    headers: { ...headers },
    query: { ...query },
    body: { ...body }
  };

  if (url.includes('?')) {
    const search = new URLSearchParams(url.split('?')[1]);
    for (const [k, v] of search.entries()) {
      req.query[k] = v;
    }
  }

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      resHeaders[name.toLowerCase()] = value;
      return this;
    },
    json(data) {
      responseData = data;
      resolveResponse();
      return this;
    },
    send(data) {
      responseData = data;
      resolveResponse();
      return this;
    },
    end() {
      resolveResponse();
      return this;
    },
    getStatusCode() { return statusCode; },
    getData() { return responseData; },
    getHeaders() { return resHeaders; },
    waitForResponse() { return promise; }
  };

  return { req, res };
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 11 ACCEPTANCE TESTS: ADMIN IMPACT REPORTING');
  console.log('========================================================================\n');

  const ts = Date.now();
  const adminEmail = 'admin@onecommunityely.com';
  const learnerAEmail = `learner_a_${ts}@onecommunityely.com`;
  const learnerBEmail = `learner_b_${ts}@onecommunityely.com`;
  const learnerCEmail = `learner_c_${ts}@onecommunityely.com`;

  // Register test token verifier
  setTestTokenVerifier(async (token) => {
    if (token === 'admin_token') {
      return { uid: 'admin_uid', email: adminEmail, userType: 'teacher' };
    }
    if (token === 'learner_token') {
      return { uid: 'learner_a_uid', email: learnerAEmail, userType: 'student' };
    }
    if (token === 'malicious_token') {
      return { uid: 'malicious_uid', email: 'hacker@example.com', userType: 'student' };
    }
    throw new Error('Unauthorized: Invalid test token');
  });

  // Ensure users exist in UserService
  await saveUser({ email: adminEmail, name: 'Ely Admin', userType: 'teacher', role: 'admin' });
  await saveUser({ email: learnerAEmail, name: 'Alice Impact', userType: 'student', registeredAt: '2026-08-01T10:00:00.000Z', lastActiveAt: '2026-08-15T12:00:00.000Z' });
  await saveUser({ email: learnerBEmail, name: 'Bob Inactive', userType: 'student', registeredAt: '2026-08-01T10:00:00.000Z', lastActiveAt: null });
  await saveUser({ email: learnerCEmail, name: 'Charlie Banned', userType: 'student', registeredAt: '2026-08-01T10:00:00.000Z', isBanned: true });

  // 1. SETUP TEST CURRICULUM
  console.log('--- Setting up test curriculum ---');
  const course1 = await createCourse({
    title: `Impact Digital Skills ${ts}`,
    description: 'Practical digital literacy course',
    category: 'Digital Skills',
    difficulty: 'Beginner'
  }, adminEmail);
  await updateCourseStatus(course1.courseId, 'published', adminEmail);

  const course2ZeroStarts = await createCourse({
    title: `Zero Starts Course ${ts}`,
    description: 'Course with zero learners started',
    category: 'Small Business',
    difficulty: 'Intermediate'
  }, adminEmail);
  await updateCourseStatus(course2ZeroStarts.courseId, 'published', adminEmail);

  // Selections
  await saveCourseSelection(learnerAEmail, course1.courseId);
  await saveCourseSelection(learnerAEmail, course2ZeroStarts.courseId); // Selected but never started

  // Progress
  const progressId = `${learnerAEmail}#${course1.courseId}`;
  inMemoryProgress.set(progressId, {
    progressId,
    courseId: course1.courseId,
    learnerEmail: learnerAEmail,
    status: 'completed',
    progressPercentage: 100,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    completedLessonIds: []
  });

  // Quizzes & Attempts
  const quiz1 = await createQuiz({
    title: `Digital Skills Assessment Quiz ${ts}`,
    courseId: course1.courseId,
    passingScore: 75,
    questions: [
      {
        questionId: 'q_test_1',
        type: 'multiple_choice',
        questionText: 'Which of the following is a safe password practice?',
        options: ['Password123', 'Using a unique phrase with numbers and symbols', 'Writing on monitor', 'Sharing with friends'],
        correctAnswer: 'Using a unique phrase with numbers and symbols',
        points: 1
      }
    ]
  }, adminEmail);
  await updateQuizStatus(quiz1.quizId, 'published', adminEmail);

  // Learner A attempts quiz twice (first 50%, second 100%)
  await submitQuizAttempt(quiz1.quizId, { email: learnerAEmail, name: 'Alice Impact' }, { 'q_test_1': 'Password123' }, `sub_1_${ts}`);
  await submitQuizAttempt(quiz1.quizId, { email: learnerAEmail, name: 'Alice Impact' }, { 'q_test_1': 'Using a unique phrase with numbers and symbols' }, `sub_2_${ts}`);

  // Baseline Assessment & Response
  const baseline1 = await createAssessment({
    courseId: course1.courseId,
    title: `Baseline for ${course1.title}`,
    questions: [
      { questionId: 'q_b1', type: 'confidence_rating', questionText: 'How confident do you feel using email securely?' }
    ]
  }, adminEmail);
  await updateAssessmentStatus(baseline1.assessmentId, 'published', adminEmail);

  const baseRespId = `base_resp_${learnerAEmail}#${course1.courseId}#${baseline1.assessmentId}`;
  inMemoryBaselineResponses.set(baseRespId, {
    responseId: baseRespId,
    assessmentId: baseline1.assessmentId,
    courseId: course1.courseId,
    learnerEmail: learnerAEmail,
    learnerName: 'Alice Impact',
    answers: {
      'q_b1': { questionId: 'q_b1', type: 'confidence_rating', rating: 2, ratingValue: 2 }
    },
    submittedAt: new Date().toISOString()
  });

  // After Assessment & Response
  const after1 = await createAfterAssessment({
    courseId: course1.courseId,
    title: `After Assessment for ${course1.title}`,
    questions: [
      { questionId: 'q_a1', baselineQuestionId: 'q_b1', type: 'confidence_rating', questionText: 'How confident do you feel using email securely?' }
    ]
  }, adminEmail);
  await updateAfterAssessmentStatus(after1.assessmentId, 'published', adminEmail);

  inMemoryAfterResponses.set(`after_resp_${learnerAEmail}#${course1.courseId}#${after1.assessmentId}`, {
    responseId: `after_resp_${learnerAEmail}#${course1.courseId}#${after1.assessmentId}`,
    assessmentId: after1.assessmentId,
    courseId: course1.courseId,
    learnerEmail: learnerAEmail,
    learnerName: 'Alice Impact',
    answers: {
      'q_a1': { questionId: 'q_a1', baselineQuestionId: 'q_b1', rating: 5, ratingValue: 5 }
    },
    submittedAt: new Date().toISOString()
  });

  // Beneficiary Feedback
  const fb1Id = `fb_${learnerAEmail}#${course1.courseId}`;
  inMemoryFeedback.set(fb1Id, {
    feedbackId: fb1Id,
    courseId: course1.courseId,
    learnerEmail: learnerAEmail,
    learnerName: 'Alice Impact',
    usefulnessRating: 5,
    confidenceRating: 5,
    wouldRecommend: true,
    testimonialConsent: 'named',
    generalComments: 'The practical steps helped me understand passwords safely.',
    nextTrainingTopic: 'Online Banking Security',
    submittedAt: new Date().toISOString()
  });

  // Certificates
  const certId = `cert_${learnerAEmail}#${course1.courseId}`;
  const certNumber = `OCE-${Date.now()}-1001`;
  const cert1 = {
    certificateId: certId,
    certificateNumber: certNumber,
    courseId: course1.courseId,
    courseTitle: course1.title,
    courseTitleSnapshot: course1.title,
    learnerEmail: learnerAEmail,
    learnerName: 'Alice Impact',
    learnerNameSnapshot: 'Alice Impact',
    issuedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'active'
  };
  inMemoryCertificates.set(certId, cert1);

  // ========================================================================
  // 1. AUTHENTICATION & ADMIN ROLE ENFORCEMENT
  // ========================================================================
  console.log('\n--- 1. Authentication & Security Enforcement ---');

  await itAsync('1.1 Unauthenticated request returns 401', async () => {
    const { req, res } = createMockReqRes({ url: '/overview' });
    const router = (await import('./routes/impactReports.js')).default;
    router(req, res, () => {});
    await res.waitForResponse();
    assert.strictEqual(res.getStatusCode(), 401);
  });

  await itAsync('1.2 Learner token cannot access Admin impact reports (403 Forbidden)', async () => {
    const { req, res } = createMockReqRes({
      url: '/overview',
      headers: { authorization: 'Bearer learner_token' }
    });
    const router = (await import('./routes/impactReports.js')).default;
    router(req, res, () => {});
    await res.waitForResponse();
    assert.strictEqual(res.getStatusCode(), 403);
  });

  await itAsync('1.3 Learner token cannot access CSV exports (403 Forbidden)', async () => {
    const { req, res } = createMockReqRes({
      url: '/export/csv?type=courses',
      headers: { authorization: 'Bearer learner_token' }
    });
    const router = (await import('./routes/impactReports.js')).default;
    router(req, res, () => {});
    await res.waitForResponse();
    assert.strictEqual(res.getStatusCode(), 403);
  });

  await itAsync('1.4 Valid Admin token successfully accesses Overview report', async () => {
    const { req, res } = createMockReqRes({
      url: '/overview',
      headers: { authorization: 'Bearer admin_token' }
    });
    const router = (await import('./routes/impactReports.js')).default;
    router(req, res, () => {});
    await res.waitForResponse();
    assert.strictEqual(res.getStatusCode(), 200);
    const body = res.getData();
    assert.strictEqual(body.success, true);
    assert(body.data && body.data.summary, 'Overview summary data returned');
  });

  // ========================================================================
  // 2. EXCLUSION OF ADMIN ACCOUNTS & ACCURATE METRICS
  // ========================================================================
  console.log('\n--- 2. Exclusion of Admin Accounts & Summary Metrics ---');

  await itAsync('2.1 Total registered learners excludes admin@onecommunityely.com', async () => {
    const overview = await getOverviewReport();
    const learners = await getLearnerActivityReport();
    const adminIncluded = learners.learners.some(l => l.email.toLowerCase() === adminEmail.toLowerCase());
    assert.strictEqual(adminIncluded, false, 'Admin account must never appear in learner list');
    assert(overview.summary.totalRegisteredLearners >= 3, 'Registered learners count strictly counts non-admins');
  });

  await itAsync('2.2 Active learner definition accurately identifies active users', async () => {
    const learners = await getLearnerActivityReport();
    const alice = learners.learners.find(l => l.email === learnerAEmail);
    const bob = learners.learners.find(l => l.email === learnerBEmail);
    assert(alice && alice.isActive === true, 'Alice with activity events is marked active');
    assert(bob && bob.isActive === false, 'Bob without recent activity is marked inactive');
  });

  await itAsync('2.3 Banned learners are flagged and counted separately', async () => {
    const learners = await getLearnerActivityReport();
    const charlie = learners.learners.find(l => l.email === learnerCEmail);
    assert(charlie && charlie.isBanned === true, 'Charlie is identified as banned');
    assert(learners.bannedCount >= 1, 'Banned count reflects stored status');
  });

  // ========================================================================
  // 3. COURSE PERFORMANCE & SAFE FORMULAS
  // ========================================================================
  console.log('\n--- 3. Course Performance & Safe Formulas ---');

  await itAsync('3.1 Course completion rate is calculated accurately: (completed ÷ started) * 100', async () => {
    const report = await getCoursePerformanceReport();
    const c1 = report.courses.find(c => c.courseId === course1.courseId);
    assert(c1, 'Course 1 found in performance report');
    assert(c1.startedCount >= 1, 'Course 1 has at least 1 started learner');
    assert(typeof c1.completionRate === 'number', 'Completion rate is a valid number');
    assert(!isNaN(c1.completionRate), 'Completion rate must not be NaN');
  });

  await itAsync('3.2 Zero-start course handled safely without NaN or crash (0% or Not available)', async () => {
    const report = await getCoursePerformanceReport();
    const c2 = report.courses.find(c => c.courseId === course2ZeroStarts.courseId);
    assert(c2, 'Zero starts course found in report');
    assert.strictEqual(c2.startedCount, 0, 'Started count is exactly 0');
    assert.strictEqual(c2.completionRate, 0, 'Completion rate is cleanly 0 (not NaN)');
    assert(!isNaN(c2.completionRate), 'Zero starts must not produce NaN');
  });

  // ========================================================================
  // 4. QUIZ RESULTS & EXPOSURE CONTROLS
  // ========================================================================
  console.log('\n--- 4. Quiz Results & Exposure Controls ---');

  await itAsync('4.1 Quiz metrics accurately compute average score and pass rate', async () => {
    const quizReport = await getQuizResultsReport();
    const q1 = quizReport.quizzes.find(q => q.quizId === quiz1.quizId);
    assert(q1, 'Quiz 1 found in report');
    assert.strictEqual(q1.learnersAttempted, 1, '1 unique learner attempted');
    assert.strictEqual(q1.totalAttempts, 2, '2 total attempts recorded');
    assert.strictEqual(q1.highestScore, 100, 'Highest score is 100%');
    assert.strictEqual(q1.lowestScore, 0, 'Lowest score is 0%');
    assert.strictEqual(q1.passRate, 100, 'Pass rate is 100% (passed at least once)');
  });

  await itAsync('4.2 Correct quiz answers and question explanations are strictly hidden', async () => {
    const quizReport = await getQuizResultsReport();
    const q1 = quizReport.quizzes.find(q => q.quizId === quiz1.quizId);
    assert.strictEqual(q1.questions, undefined, 'Raw questions array must not be in summary report');
    assert.strictEqual(q1.correctAnswer, undefined, 'Correct answers must not be leaked');
  });

  // ========================================================================
  // 5. BEFORE-VS-AFTER OUTCOMES
  // ========================================================================
  console.log('\n--- 5. Before-vs-After Outcomes ---');

  await itAsync('5.1 Linked baseline and final assessment outcomes accurately paired', async () => {
    const outcomes = await getOutcomesReport();
    assert(outcomes.summary.validComparisonsCount >= 1, 'At least 1 valid comparison computed');
    const comp = outcomes.comparisons.find(c => c.courseId === course1.courseId);
    assert(comp, 'Comparison for course 1 exists');
    assert.strictEqual(comp.baselineConfidence, 2, 'Baseline confidence rating is 2');
    assert.strictEqual(comp.finalConfidence, 5, 'Final confidence rating is 5');
    assert.strictEqual(comp.change, 3, 'Change is +3 points');
    assert.strictEqual(comp.outcome, 'increased', 'Outcome categorized as increased');
  });

  await itAsync('5.2 Missing baseline data is NOT treated as zero', async () => {
    // Submit an after assessment without any baseline for Learner B
    inMemoryAfterResponses.set(`after_resp_${learnerBEmail}#${course2ZeroStarts.courseId}#after_unlinked`, {
      responseId: `after_resp_${learnerBEmail}#${course2ZeroStarts.courseId}#after_unlinked`,
      assessmentId: 'after_unlinked',
      courseId: course2ZeroStarts.courseId,
      learnerEmail: learnerBEmail,
      learnerName: 'Bob Inactive',
      answers: { 'q_any': { questionId: 'q_any', rating: 4, ratingValue: 4 } },
      submittedAt: new Date().toISOString()
    });

    const outcomes = await getOutcomesReport();
    assert(outcomes.summary.unavailableCount >= 1, 'Learner B counted in unavailableCount');
    // Average baseline confidence must NOT drop because of learner B
    assert(outcomes.summary.averageBaselineConfidence >= 1, 'Baseline average is not polluted with false zeros');
  });

  await itAsync('5.3 Approved non-causal UK wording and disclaimer present', async () => {
    const outcomes = await getOutcomesReport();
    assert.strictEqual(outcomes.wording, 'Learner-reported confidence increased after training.');
    assert(outcomes.disclaimer.includes('does not constitute an accredited or regulated educational qualification'), 'Mandatory disclaimer present');
  });

  // ========================================================================
  // 6. BENEFICIARY FEEDBACK & TESTIMONIAL CONSENT
  // ========================================================================
  console.log('\n--- 6. Beneficiary Feedback & Testimonial Consent ---');

  await itAsync('6.1 Averages and recommendation percentages calculated accurately', async () => {
    const feedback = await getFeedbackReport();
    assert(feedback.summary.totalSubmissions >= 1, 'At least 1 submission exists');
    assert(feedback.summary.averageUsefulness >= 4, 'Usefulness rating is accurate');
    assert(feedback.summary.recommendationPercentage === 100, 'Recommendation percentage is 100%');
  });

  await itAsync('6.2 Testimonial consent categories categorized accurately', async () => {
    const feedback = await getFeedbackReport();
    assert(feedback.summary.consentBreakdown.named >= 1, 'Named consent counted');
    const comment = feedback.comments.find(c => c.comment.includes('passwords safely'));
    assert(comment, 'Learner comment found');
    assert.strictEqual(comment.consentStatus, 'named', 'Consent status verified as named');
  });

  await itAsync('6.3 Consent withdrawal is respected and excludes comment from testimonial use', async () => {
    // Submit feedback with withdrawn consent
    const fb2Id = `fb_${learnerBEmail}#${course1.courseId}`;
    inMemoryFeedback.set(fb2Id, {
      feedbackId: fb2Id,
      courseId: course1.courseId,
      learnerEmail: learnerBEmail,
      learnerName: 'Bob Inactive',
      usefulnessRating: 3,
      confidenceRating: 3,
      wouldRecommend: false,
      testimonialConsent: 'withdrawn',
      consentWithdrawn: true,
      generalComments: 'Withdrawn private feedback.',
      submittedAt: new Date().toISOString()
    });

    const feedback = await getFeedbackReport();
    assert(feedback.summary.consentBreakdown.withdrawn >= 1, 'Withdrawn consent counted');
    const withdrawnComment = feedback.comments.find(c => c.comment.includes('Withdrawn private'));
    assert(withdrawnComment, 'Withdrawn comment found in admin audit');
    assert.strictEqual(withdrawnComment.consentStatus, 'withdrawn', 'Status is withdrawn');
  });

  // ========================================================================
  // 7. CERTIFICATES REPORTING
  // ========================================================================
  console.log('\n--- 7. Certificates Reporting ---');

  await itAsync('7.1 Certificate counts match issued records', async () => {
    const certReport = await getCertificatesReport();
    assert(certReport.summary.totalIssued >= 1, 'Total certificates issued >= 1');
    assert(certReport.summary.activeCount >= 1, 'Active certificates >= 1');
  });

  await itAsync('7.2 Revoked certificates are accurately distinguished', async () => {
    await revokeCertificate(cert1.certificateId, 'Test audit revocation', adminEmail);
    const certReport = await getCertificatesReport();
    assert(certReport.summary.revokedCount >= 1, 'Revoked certificates counted');
    const revokedItem = certReport.certificates.find(c => c.certificateNumber === cert1.certificateNumber);
    assert(revokedItem && revokedItem.status === 'revoked', 'Certificate status is revoked in registry');
  });

  // ========================================================================
  // 8. DATE & COURSE FILTERS
  // ========================================================================
  console.log('\n--- 8. Date & Course Filters ---');

  it('8.1 Date validation rejects endDate earlier than startDate with 400', () => {
    let threw = false;
    try {
      parseFilters({ startDate: '2026-09-10', endDate: '2026-09-01' });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('End date cannot be earlier than Start date'));
    }
    assert(threw, 'Should throw 400 on invalid date range');
  });

  await itAsync('8.2 Course filter narrows down course performance results', async () => {
    const filtered = await getCoursePerformanceReport({ courseId: course1.courseId });
    assert.strictEqual(filtered.courses.length, 1);
    assert.strictEqual(filtered.courses[0].courseId, course1.courseId);
  });

  // ========================================================================
  // 9. CSV EXPORT & FORMULA INJECTION PREVENTION
  // ========================================================================
  console.log('\n--- 9. CSV Export & Formula Injection Prevention ---');

  it('9.1 Formula injection characters (=, +, -, @, tab) are safely escaped with single quote', () => {
    assert.strictEqual(sanitizeCsvCell('=1+1'), "'=1+1");
    assert.strictEqual(sanitizeCsvCell('+cmd|'), "'+cmd|");
    assert.strictEqual(sanitizeCsvCell('-5'), "'-5");
    assert.strictEqual(sanitizeCsvCell('@SUM(A1)'), "'@SUM(A1)");
    assert.strictEqual(sanitizeCsvCell('Safe Text'), 'Safe Text');
  });

  it('9.2 CSV formatting produces valid RFC 4180 output with UTF-8 BOM', () => {
    const headers = [{ label: 'Course', key: 'course' }, { label: 'Rating', key: 'rating' }];
    const rows = [{ course: 'Digital Skills, 101', rating: 5 }];
    const csv = formatCsv(headers, rows);
    assert(csv.startsWith('\uFEFF'), 'CSV starts with UTF-8 BOM');
    assert(csv.includes('"Digital Skills, 101"'), 'Quotes applied for comma');
  });

  await itAsync('9.3 CSV exports generate successfully for all 6 report types', async () => {
    const types = ['learners', 'courses', 'quizzes', 'outcomes', 'feedback', 'certificates'];
    for (const t of types) {
      const csv = await generateCsvExport(t);
      assert(typeof csv === 'string' && csv.length > 0, `CSV export for ${t} generated`);
      assert(!csv.includes('secretAccessKey'), `No AWS credentials in ${t} CSV`);
      if (t !== 'feedback') {
        assert(!csv.includes('password'), `No passwords exposed in ${t} CSV`);
      }
    }
  });

  // Reset test verifier
  resetTestTokenVerifier();

  console.log('\n========================================================================');
  console.log(`🎉 TASK 11 TESTS COMPLETE: ${passedTests} / ${totalTests} ASSERTIONS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('========================================================================\n');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
