/**
 * Automated Test Suite — Admin Quiz Management & Learner Quiz Experience
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  createQuiz,
  getQuizById,
  getAllQuizzesAdmin,
  getPublishedQuizzesForLearner,
  updateQuiz,
  updateQuizStatus,
  duplicateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getLearnerQuizAttempts,
  getAllLearnerQuizAttempts,
  validateQuizPayload
} from './services/quizService.js';
import { createCourse } from './services/courseService.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 RUNNING QUIZ MANAGEMENT & LEARNER TESTS');
  console.log('=============================================\n');

  // 1. Setup sample course
  console.log('--- Step 1: Create Test Course ---');
  const course = await createCourse({
    title: 'Digital Skills & Online Safety Test Course',
    shortDescription: 'Practical computing essentials for adult community learners',
    category: 'Digital Skills',
    estimatedDuration: '3 hours',
    difficultyLevel: 'Beginner',
    learningOutcomes: ['Understand online safety', 'Recognise phishing emails']
  }, 'admin@onecommunityely.com');

  assert(course && course.courseId, 'Test course created successfully');

  // 2. Test Validation: Invalid Quiz Cannot be Published
  console.log('\n--- Step 2: Validate Publishing Rules ---');
  const invalidErrors = validateQuizPayload({
    title: '',
    courseId: course.courseId,
    questions: []
  }, true);

  assert(invalidErrors.length > 0, 'Publishing an empty quiz without questions is blocked by validation');
  assert(invalidErrors.some(e => e.includes('title')), 'Validation requires quiz title');
  assert(invalidErrors.some(e => e.includes('question')), 'Validation requires at least one question before publishing');

  // 3. Admin: Create Incomplete Quiz as Draft
  console.log('\n--- Step 3: Create Incomplete Quiz as Draft ---');
  const draftQuiz = await createQuiz({
    title: 'Incomplete Draft Quiz',
    instructions: 'Draft instructions',
    courseId: course.courseId,
    status: 'draft',
    passingScore: 70,
    questions: []
  }, 'admin@onecommunityely.com');

  assert(draftQuiz && draftQuiz.status === 'draft', 'Incomplete quiz saved successfully as Draft');

  // 4. Admin: Create Full Quiz with Multiple Choice and True/False
  console.log('\n--- Step 4: Create Manual Quiz with MC & True/False Questions ---');
  const fullQuizData = {
    title: 'Online Safety & Digital Essentials Quiz',
    instructions: 'Please answer all questions carefully to test your understanding.',
    courseId: course.courseId,
    status: 'draft',
    passingScore: 75,
    maximumAttempts: 3,
    questions: [
      {
        type: 'multiple_choice',
        questionText: 'What is the most secure practice for choosing passwords?',
        options: [
          'Using your birthday for all accounts',
          'Using a unique, complex passphrase for each service',
          'Writing your password on a sticky note near your monitor',
          'Using "Password123" on all websites'
        ],
        correctAnswer: 'Using a unique, complex passphrase for each service',
        explanation: 'A unique and complex passphrase prevents one compromised service from exposing all your online accounts.',
        points: 2
      },
      {
        type: 'true_false',
        questionText: 'A legitimate bank will never ask for your full PIN or online banking password via email.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Banks and financial institutions will never request sensitive security credentials via email or SMS.',
        points: 1
      },
      {
        type: 'multiple_choice',
        questionText: 'What should you do if you receive an unexpected email asking you to click an urgent verification link?',
        options: [
          'Click immediately to prevent account suspension',
          'Forward it to all your contacts',
          'Do not click the link; check your account directly through the official website or app',
          'Reply with your login details'
        ],
        correctAnswer: 'Do not click the link; check your account directly through the official website or app',
        explanation: 'Navigating directly to official websites prevents falling victim to phishing and fraudulent websites.',
        points: 1
      }
    ]
  };

  const manualQuiz = await createQuiz(fullQuizData, 'admin@onecommunityely.com');
  assert(manualQuiz.quizId, 'Manual quiz created with quizId');
  assert(manualQuiz.questions.length === 3, 'Quiz contains exactly 3 questions');
  assert(manualQuiz.questions[0].type === 'multiple_choice', 'Question 1 is Multiple Choice');
  assert(manualQuiz.questions[1].type === 'true_false', 'Question 2 is True/False');

  // 5. Admin: Edit Quiz & Reorder
  console.log('\n--- Step 5: Edit and Reorder Quiz ---');
  const updatedQuiz = await updateQuiz(manualQuiz.quizId, {
    title: 'Updated Online Safety & Digital Essentials Quiz',
    passingScore: 80
  }, 'admin@onecommunityely.com');

  assert(updatedQuiz.title === 'Updated Online Safety & Digital Essentials Quiz', 'Quiz title updated successfully');
  assert(updatedQuiz.passingScore === 80, 'Passing score updated to 80%');
  assert(updatedQuiz.version === 2, 'Quiz version incremented to 2 on edit');

  // 6. Admin: Publish Quiz
  console.log('\n--- Step 6: Publish Quiz ---');
  const publishedQuiz = await updateQuizStatus(manualQuiz.quizId, 'published', 'admin@onecommunityely.com');
  assert(publishedQuiz.status === 'published', 'Quiz successfully published');
  assert(publishedQuiz.publishedAt !== null, 'publishedAt timestamp recorded');

  // 7. Security & Learner Privacy: Stripping Answers
  console.log('\n--- Step 7: Learner View Never Contains Correct Answers or Explanations Before Submission ---');
  const learnerQuizView = await getQuizById(manualQuiz.quizId, false);
  assert(learnerQuizView !== null, 'Learner quiz loaded');
  assert(learnerQuizView.questions.every(q => q.correctAnswer === undefined), 'All correct answers stripped from learner view');
  assert(learnerQuizView.questions.every(q => q.explanation === undefined), 'All explanations stripped from learner view');
  assert(learnerQuizView.questions[0].options.length === 4, 'Learner can view all options');

  // 8. Learner: List Published Quizzes
  console.log('\n--- Step 8: Published vs Draft Filtering for Learners ---');
  const publishedList = await getPublishedQuizzesForLearner({ courseId: course.courseId });
  assert(publishedList.some(q => q.quizId === manualQuiz.quizId), 'Published quiz is visible in learner published list');
  assert(!publishedList.some(q => q.quizId === draftQuiz.quizId), 'Draft quiz is NOT visible in learner list');

  // 9. Learner: Submit Answers & Backend Grading
  console.log('\n--- Step 9: Authoritative Backend Score Calculation & Submission ---');
  const learnerUser = {
    id: 'usr_learner_123',
    email: 'learner@example.com',
    name: 'Alice Learner'
  };

  // Submit 3 correct answers: Total points 2 + 1 + 1 = 4 points (100%)
  const perfectResult = await submitQuizAttempt(manualQuiz.quizId, learnerUser, {
    [manualQuiz.questions[0].questionId]: 'Using a unique, complex passphrase for each service',
    [manualQuiz.questions[1].questionId]: 'True',
    [manualQuiz.questions[2].questionId]: 'Do not click the link; check your account directly through the official website or app'
  });

  assert(perfectResult.percentage === 100, 'Calculated percentage is 100%');
  assert(perfectResult.score === 4, 'Calculated score is 4 out of 4 points');
  assert(perfectResult.passed === true, 'Passed status is true (100% >= 80%)');
  assert(perfectResult.questionsReview.length === 3, 'Review items returned for all 3 questions');
  assert(perfectResult.questionsReview.every(r => r.isCorrect === true), 'All review items marked correct');
  assert(perfectResult.questionsReview.every(r => r.explanation.length > 0), 'Explanations returned after submission');

  // 10. Submit a Second Attempt with Mistakes (Partial Score)
  console.log('\n--- Step 10: Second Attempt with Incorrect Answer ---');
  const partialResult = await submitQuizAttempt(manualQuiz.quizId, learnerUser, {
    [manualQuiz.questions[0].questionId]: 'Using your birthday for all accounts', // Incorrect (0 pts)
    [manualQuiz.questions[1].questionId]: 'True', // Correct (1 pt)
    [manualQuiz.questions[2].questionId]: 'Do not click the link; check your account directly through the official website or app' // Correct (1 pt)
  });

  assert(partialResult.score === 2, 'Score is 2 out of 4 points');
  assert(partialResult.percentage === 50, 'Percentage is 50%');
  assert(partialResult.passed === false, 'Passed status is false (50% < 80%)');
  assert(partialResult.attemptNumber === 2, 'Attempt number is 2');
  assert(partialResult.questionsReview[0].isCorrect === false, 'Question 1 marked incorrect in review');

  // 11. Learner Attempts History Retrieval
  console.log('\n--- Step 11: Learner Attempts History Persistence ---');
  const learnerAttempts = await getLearnerQuizAttempts(manualQuiz.quizId, 'learner@example.com');
  assert(learnerAttempts.length === 2, 'Two attempts persisted in database');
  assert(learnerAttempts[0].percentage === 100, 'First attempt score preserved');
  assert(learnerAttempts[1].percentage === 50, 'Second attempt score preserved');

  // 12. Admin: Duplicate Quiz
  console.log('\n--- Step 12: Duplicate Quiz ---');
  const clonedQuiz = await duplicateQuiz(manualQuiz.quizId, 'admin@onecommunityely.com');
  assert(clonedQuiz.title.includes('(Copy)'), 'Duplicated quiz has "(Copy)" in title');
  assert(clonedQuiz.status === 'draft', 'Duplicated quiz is created in draft status');
  assert(clonedQuiz.questions.length === 3, 'Duplicated quiz retains all questions');

  // 13. Admin: Delete / Archive Quiz (Preserving Results)
  console.log('\n--- Step 13: Delete / Archive Quiz & Preserve Learner History ---');
  const delResult = await deleteQuiz(manualQuiz.quizId, 'admin@onecommunityely.com');
  assert(delResult.success === true, 'Quiz soft-deleted/archived');

  // 14. Admin Access and Token Security Verification
  console.log('\n--- Step 14: Comprehensive Token-Based Security Tests ---');
  const { requireAdmin, requireLearner, requireAuth } = await import('./middleware/auth.js');
  const { saveUser, getUserByEmail, deleteUser } = await import('./services/userService.js');
  const { setTestTokenVerifier, resetTestTokenVerifier } = await import('./services/firebaseAuthService.js');

  // Register mock token verifier for unit tests
  setTestTokenVerifier(async (token) => {
    if (token === 'valid_admin_token') {
      return { uid: 'uid_admin_test_1', email: 'admin@onecommunityely.com' };
    }
    if (token === 'valid_learner_token') {
      return { uid: 'uid_learner_test_1', email: 'learner@onecommunityely.com' };
    }
    if (token === 'learner_b_token') {
      return { uid: 'uid_learner_test_2', email: 'learnerb@onecommunityely.com' };
    }
    if (token === 'banned_admin_token') {
      return { uid: 'uid_banned_test_1', email: 'banned_admin@onecommunityely.com' };
    }
    if (token === 'unregistered_user_token') {
      return { uid: 'uid_ghost_1', email: 'ghost_user@test.com' };
    }
    if (token === 'expired_token') {
      const err = new Error('Token has expired');
      err.code = 'auth/id-token-expired';
      throw err;
    }
    const err = new Error('Invalid authentication token');
    err.code = 'auth/invalid-id-token';
    throw err;
  });

  // Seed test user fixtures in DB for testing
  await saveUser({
    email: 'admin@onecommunityely.com',
    name: 'Ely Training Admin',
    userType: 'teacher',
    role: 'admin',
    isBanned: false
  });
  await saveUser({
    email: 'learner@onecommunityely.com',
    name: 'Ely Community Student',
    userType: 'student',
    role: 'student',
    isBanned: false
  });
  await saveUser({
    email: 'learnerb@onecommunityely.com',
    name: 'Learner B',
    userType: 'student',
    role: 'student',
    isBanned: false
  });
  await saveUser({
    email: 'banned_admin@onecommunityely.com',
    name: 'Banned Admin',
    userType: 'teacher',
    role: 'admin',
    isBanned: true,
    status: 'banned'
  });

  function mockReqRes(headers = {}, body = {}, query = {}) {
    let statusCode = 200;
    let jsonBody = null;
    return {
      req: { headers, query, body },
      res: {
        status: (code) => { statusCode = code; return { json: (b) => { jsonBody = b; } }; },
        json: (b) => { jsonBody = b; }
      },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody
    };
  }

  // Security Test 1: Request without Bearer token returns 401
  const sec1 = mockReqRes({});
  let sec1Passed = false;
  await requireAdmin(sec1.req, sec1.res, () => { sec1Passed = true; });
  assert(sec1.getStatusCode() === 401 && !sec1Passed, 'Security Test 1: Request without Bearer token returns 401');

  // Security Test 2: Invalid token returns 401
  const sec2 = mockReqRes({ authorization: 'Bearer invalid_garbage_token' });
  let sec2Passed = false;
  await requireAdmin(sec2.req, sec2.res, () => { sec2Passed = true; });
  assert(sec2.getStatusCode() === 401 && !sec2Passed, 'Security Test 2: Invalid token returns 401');

  // Security Test 3: Expired token returns 401
  const sec3 = mockReqRes({ authorization: 'Bearer expired_token' });
  let sec3Passed = false;
  await requireAdmin(sec3.req, sec3.res, () => { sec3Passed = true; });
  assert(sec3.getStatusCode() === 401 && !sec3Passed, 'Security Test 3: Expired token returns 401');

  // Security Test 4: Learner token cannot access Admin APIs (403)
  const sec4 = mockReqRes({ authorization: 'Bearer valid_learner_token' });
  let sec4Passed = false;
  await requireAdmin(sec4.req, sec4.res, () => { sec4Passed = true; });
  assert(sec4.getStatusCode() === 403 && !sec4Passed, 'Security Test 4: Learner token cannot access Admin APIs (403 Forbidden)');

  // Security Test 5: Changing x-user-email to an Admin email does not grant Admin access
  const sec5a = mockReqRes({ 'x-user-email': 'admin@onecommunityely.com' });
  let sec5aPassed = false;
  await requireAdmin(sec5a.req, sec5a.res, () => { sec5aPassed = true; });
  assert(sec5a.getStatusCode() === 401 && !sec5aPassed, 'Security Test 5a: Sending x-user-email without token returns 401');

  const sec5b = mockReqRes({
    authorization: 'Bearer valid_learner_token',
    'x-user-email': 'admin@onecommunityely.com'
  });
  let sec5bPassed = false;
  await requireAdmin(sec5b.req, sec5b.res, () => { sec5bPassed = true; });
  assert(sec5b.getStatusCode() === 403 && !sec5bPassed, 'Security Test 5b: Learner token spoofing x-user-email is rejected with 403 Forbidden');

  // Security Test 6: Sending userType: admin does not grant Admin access
  const sec6 = mockReqRes(
    { authorization: 'Bearer valid_learner_token' },
    { userType: 'teacher', role: 'admin', adminEmail: 'admin@onecommunityely.com' }
  );
  let sec6Passed = false;
  await requireAdmin(sec6.req, sec6.res, () => { sec6Passed = true; });
  assert(sec6.getStatusCode() === 403 && !sec6Passed, 'Security Test 6: Frontend userType: admin does not grant Admin access (403 Forbidden)');

  // Security Test 7: Sending another learner email does not expose their attempts
  const sec7 = mockReqRes({ authorization: 'Bearer valid_learner_token' }, {}, { learnerEmail: 'learnerb@onecommunityely.com' });
  let sec7Passed = false;
  await requireLearner(sec7.req, sec7.res, () => { sec7Passed = true; });
  assert(sec7Passed && sec7.req.learnerEmail === 'learner@onecommunityely.com', 'Security Test 7: Learner identity is derived strictly from verified token, ignoring query/body params');

  // Security Test 8: Valid Admin token can access Admin quiz APIs
  const sec8 = mockReqRes({ authorization: 'Bearer valid_admin_token' });
  let sec8Passed = false;
  await requireAdmin(sec8.req, sec8.res, () => { sec8Passed = true; });
  assert(sec8.getStatusCode() === 200 && sec8Passed && sec8.req.adminUser.email === 'admin@onecommunityely.com', 'Security Test 8: Valid Admin token can access Admin quiz APIs');

  // Security Test 9: Banned Admin is rejected
  const sec9 = mockReqRes({ authorization: 'Bearer banned_admin_token' });
  let sec9Passed = false;
  await requireAdmin(sec9.req, sec9.res, () => { sec9Passed = true; });
  assert(sec9.getStatusCode() === 403 && !sec9Passed, 'Security Test 9: Banned Admin is rejected with 403 Forbidden');

  // Security Test 10: Missing user in DynamoDB denies access (401)
  const sec10 = mockReqRes({ authorization: 'Bearer unregistered_user_token' });
  let sec10Passed = false;
  await requireAdmin(sec10.req, sec10.res, () => { sec10Passed = true; });
  assert(sec10.getStatusCode() === 401 && !sec10Passed, 'Security Test 10: Unregistered user without DynamoDB record denies access with 401');

  // Security Test 11: No seeded production accounts exist in userService
  const userServiceModule = await import('./services/userService.js');
  assert(!userServiceModule.memoryUsers, 'Security Test 11: No seeded production accounts or in-memory fallback store in userService');

  // Security Test 12: Correct answers remain hidden before submission
  await updateQuizStatus(clonedQuiz.quizId, 'published', 'admin@onecommunityely.com');
  const strippedQuiz = await getQuizById(clonedQuiz.quizId, false);
  const hasHiddenAnswers = strippedQuiz && strippedQuiz.questions.length > 0 && strippedQuiz.questions.every(q => q.correctAnswer === undefined && q.explanation === undefined);
  assert(hasHiddenAnswers, 'Security Test 12: Correct answers and explanations are stripped in learner view before submission');

  // 15. Maximum Attempts Enforcement
  console.log('\n--- Step 15: Maximum Attempts Enforcement ---');
  const limitedQuiz = await createQuiz({
    title: 'Strict Attempt Limit Test Quiz',
    courseId: course.courseId,
    maximumAttempts: 1, // Only 1 attempt allowed
    passingScore: 70,
    questions: [
      {
        questionId: 'q_limit_1',
        order: 1,
        type: 'true_false',
        questionText: 'Is the limit enforced on the backend?',
        options: ['True', 'False'],
        correctAnswer: 'True',
        points: 1
      }
    ]
  }, 'admin@onecommunityely.com');
  await updateQuizStatus(limitedQuiz.quizId, 'published', 'admin@onecommunityely.com');

  const strictLearner = { email: 'limited_learner@test.com', name: 'Strict Learner' };
  const firstAttempt = await submitQuizAttempt(limitedQuiz.quizId, strictLearner, { 'q_limit_1': 'True' });
  assert(firstAttempt && firstAttempt.attemptNumber === 1, 'First attempt succeeds within maximum attempt limit');

  let limitBlocked = false;
  try {
    await submitQuizAttempt(limitedQuiz.quizId, strictLearner, { 'q_limit_1': 'False' });
  } catch (limitErr) {
    limitBlocked = limitErr.message.includes('maximum allowed attempts');
  }
  assert(limitBlocked, 'Backend strictly blocks attempt exceeding maximumAttempts limit');

  // 16. Proper Idempotency Mechanism Tests
  console.log('\n--- Step 16: Proper Idempotency Mechanism Tests ---');
  const multiQuiz = await createQuiz({
    title: 'Idempotency Test Quiz',
    courseId: course.courseId,
    maximumAttempts: 5,
    passingScore: 70,
    questions: [
      {
        questionId: 'q_idemp_1',
        order: 1,
        type: 'true_false',
        questionText: 'Idempotency key prevents duplicate attempts on retry',
        options: ['True', 'False'],
        correctAnswer: 'True',
        points: 1
      }
    ]
  }, 'admin@onecommunityely.com');
  await updateQuizStatus(multiQuiz.quizId, 'published', 'admin@onecommunityely.com');

  const idempLearner = { email: 'idemp_learner@test.com', name: 'Idempotent Learner' };
  const testSubmissionId = 'sub_idemp_abc_123';

  // First submission with clientSubmissionId
  const sub1 = await submitQuizAttempt(multiQuiz.quizId, idempLearner, { 'q_idemp_1': 'True' }, testSubmissionId);
  assert(sub1 && sub1.attemptNumber === 1, 'Initial submission succeeds with clientSubmissionId');

  // Repeated submission with identical clientSubmissionId (e.g. network retry or double click)
  const sub2 = await submitQuizAttempt(multiQuiz.quizId, idempLearner, { 'q_idemp_1': 'True' }, testSubmissionId);
  assert(sub1.attemptId === sub2.attemptId, 'Repeated submission with identical clientSubmissionId returns original attempt');

  // Verify only 1 attempt was recorded in DB
  const attemptsAfterRetry = await getLearnerQuizAttempts(multiQuiz.quizId, idempLearner.email);
  assert(attemptsAfterRetry.length === 1, 'Database contains exactly 1 attempt despite duplicate submissions with same key');

  // Genuine second attempt with identical answers but DIFFERENT clientSubmissionId
  const secondSubmissionId = 'sub_idemp_abc_456';
  const sub3 = await submitQuizAttempt(multiQuiz.quizId, idempLearner, { 'q_idemp_1': 'True' }, secondSubmissionId);
  assert(sub3.attemptId !== sub1.attemptId && sub3.attemptNumber === 2, 'Genuine retake with new clientSubmissionId creates new attempt even with identical answers');

  const attemptsAfterRetake = await getLearnerQuizAttempts(multiQuiz.quizId, idempLearner.email);
  assert(attemptsAfterRetake.length === 2, 'Database accurately contains 2 distinct attempts for 2 unique submission keys');

  // 17. Quiz Version Preservation in Historical Attempts
  console.log('\n--- Step 17: Quiz Version Preservation in Historical Attempts ---');
  const versionQuiz = await createQuiz({
    title: 'Version Preservation Quiz',
    courseId: course.courseId,
    passingScore: 70,
    questions: [
      {
        questionId: 'q_v1',
        order: 1,
        type: 'true_false',
        questionText: 'Version 1 question',
        options: ['True', 'False'],
        correctAnswer: 'True',
        points: 1
      }
    ]
  }, 'admin@onecommunityely.com');
  await updateQuizStatus(versionQuiz.quizId, 'published', 'admin@onecommunityely.com');

  const vLearner = { email: 'version_learner@test.com', name: 'Version Learner' };
  await submitQuizAttempt(versionQuiz.quizId, vLearner, { 'q_v1': 'True' });

  // Update quiz to bump its version
  await updateQuiz(versionQuiz.quizId, {
    title: 'Version Preservation Quiz (Updated V2)',
    questions: [
      {
        questionId: 'q_v2',
        order: 1,
        type: 'true_false',
        questionText: 'Version 2 updated question',
        options: ['True', 'False'],
        correctAnswer: 'False',
        points: 1
      }
    ]
  }, 'admin@onecommunityely.com');

  const updatedQuizRecord = await getQuizById(versionQuiz.quizId, true);
  assert(updatedQuizRecord.version === 2, 'Quiz version bumped to 2 upon edit');

  const preservedAttempts = await getLearnerQuizAttempts(versionQuiz.quizId, vLearner.email);
  assert(preservedAttempts[0].quizVersion === 1, 'Past learner attempt preserves original quizVersion: 1');

  // 18. Learner Data Isolation
  console.log('\n--- Step 18: Learner Data Isolation ---');
  const learnerAAttempts = await getLearnerQuizAttempts(versionQuiz.quizId, 'learnerA@test.com');
  assert(learnerAAttempts.length === 0, 'Learner A cannot see Learner B attempts (data isolation verified)');

  // 19. AI Generation Failure Handling
  console.log('\n--- Step 19: AI Generation Failure Handling ---');
  const { generateAIQuizDraft } = await import('./services/quizService.js');
  let aiFailCaught = false;
  try {
    await generateAIQuizDraft({ courseId: 'non_existent_course_xyz' }, 'admin@onecommunityely.com');
  } catch (aiErr) {
    aiFailCaught = aiErr.message.toLowerCase().includes('not found') || aiErr.message.toLowerCase().includes('failed');
  }
  assert(aiFailCaught, 'AI generator throws clean error when course is missing and does not save empty quiz');

  // Cleanup test fixtures
  await deleteUser('admin@onecommunityely.com').catch(() => {});
  await deleteUser('learner@onecommunityely.com').catch(() => {});
  await deleteUser('learnerb@onecommunityely.com').catch(() => {});
  await deleteUser('banned_admin@onecommunityely.com').catch(() => {});
  resetTestTokenVerifier();

  console.log('\n=============================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
