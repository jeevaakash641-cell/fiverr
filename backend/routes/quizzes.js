/**
 * Quiz API Routes — One Community Ely Online Training Centre
 * Handles Admin Quiz Management & Learner Quiz Taking
 */

import express from 'express';
import {
  createQuiz,
  getQuizById,
  getAllQuizzesAdmin,
  getPublishedQuizzesForLearner,
  updateQuiz,
  updateQuizStatus,
  duplicateQuiz,
  deleteQuiz,
  generateAIQuizDraft,
  submitQuizAttempt,
  getLearnerQuizAttempts,
  getAllLearnerQuizAttempts
} from '../services/quizService.js';
import { invalidateDashboardCache } from '../services/learnerDashboardService.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { recordAdminAction, AuditCategories } from '../services/adminAuditService.js';

const router = express.Router();

// ==========================================
// ADMIN QUIZ MANAGEMENT ROUTES (requireAdmin)
// ==========================================

/**
 * 1. GET /api/quizzes/admin
 * List all quizzes for Admin (Draft, Published, Unpublished, Archived)
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { status, courseId, creationMethod, search } = req.query;
    const quizzes = await getAllQuizzesAdmin({ status, courseId, creationMethod, search });
    res.json({
      success: true,
      count: quizzes.length,
      quizzes
    });
  } catch (err) {
    console.error('GET /api/quizzes/admin error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quizzes: ' + err.message,
      quizzes: []
    });
  }
});

/**
 * 2. GET /api/quizzes/admin/:quizId
 * Get complete quiz with answers and explanations for Admin review/editing
 */
router.get('/admin/:quizId', requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await getQuizById(quizId, true);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: `Quiz with ID "${quizId}" not found`
      });
    }

    res.json({
      success: true,
      quiz
    });
  } catch (err) {
    console.error('GET /api/quizzes/admin/:quizId error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quiz: ' + err.message
    });
  }
});

/**
 * 3. POST /api/quizzes
 * Create a new quiz manually (Admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const createdBy = req.adminUser?.email || 'admin';
    const quiz = await createQuiz(req.body, createdBy);

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Created Manual Quiz',
      category: AuditCategories.QUIZZES,
      targetType: 'Quiz',
      targetId: quiz.quizId,
      targetName: quiz.title,
      result: 'Success',
      description: `${req.adminUser?.name || createdBy} created manual quiz "${quiz.title}" (${quiz.quizId})`,
      metadata: { courseId: quiz.courseId, questionsCount: quiz.questions?.length },
      req
    });

    console.log(`✅ Quiz created manually by ${createdBy}:`, quiz.quizId, quiz.title);
    invalidateDashboardCache();
    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz
    });
  } catch (err) {
    console.error('POST /api/quizzes error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 4. POST /api/quizzes/generate-ai
 * Generate a Draft Quiz with AI via AWS Bedrock (Admin only)
 */
router.post('/generate-ai', requireAdmin, async (req, res) => {
  try {
    const createdBy = req.adminUser?.email || 'admin';
    const quiz = await generateAIQuizDraft(req.body, createdBy);
    invalidateDashboardCache();

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Generated AI Draft Quiz',
      category: AuditCategories.QUIZZES,
      targetType: 'Quiz',
      targetId: quiz.quizId,
      targetName: quiz.title,
      result: 'Success',
      description: `${req.adminUser?.name || createdBy} generated AI draft quiz "${quiz.title}" (${quiz.quizId})`,
      metadata: { courseId: quiz.courseId, questionsCount: quiz.questions?.length },
      req
    });

    res.status(201).json({
      success: true,
      message: 'AI draft quiz generated successfully. Please review and publish manually.',
      quiz
    });
  } catch (err) {
    console.error('POST /api/quizzes/generate-ai error:', err);
    res.status(500).json({
      success: false,
      error: 'AI Quiz Generation failed: ' + err.message
    });
  }
});

/**
 * 5. PUT /api/quizzes/:quizId
 * Edit an existing quiz (Admin only)
 */
router.put('/:quizId', requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    const updatedBy = req.adminUser?.email || 'admin';
    const updatedQuiz = await updateQuiz(quizId, req.body, updatedBy);
    invalidateDashboardCache();

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Edited Quiz',
      category: AuditCategories.QUIZZES,
      targetType: 'Quiz',
      targetId: updatedQuiz.quizId,
      targetName: updatedQuiz.title,
      result: 'Success',
      description: `${req.adminUser?.name || updatedBy} updated quiz "${updatedQuiz.title}" (${updatedQuiz.quizId})`,
      changedFields: Object.keys(req.body),
      req
    });

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      quiz: updatedQuiz
    });
  } catch (err) {
    console.error('PUT /api/quizzes/:quizId error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 6. PATCH /api/quizzes/:quizId/status
 * Publish or Unpublish a quiz (Admin only)
 */
router.patch('/:quizId/status', requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    const updatedBy = req.adminUser?.email || 'admin';
    const updatedQuiz = await updateQuizStatus(quizId, status, updatedBy);
    invalidateDashboardCache();

    const actionText = status === 'published' ? 'Published Quiz' : (status === 'archived' ? 'Archived Quiz' : 'Unpublished Quiz');

    await recordAdminAction({
      admin: req.adminUser,
      action: actionText,
      category: AuditCategories.QUIZZES,
      targetType: 'Quiz',
      targetId: updatedQuiz.quizId,
      targetName: updatedQuiz.title,
      result: 'Success',
      description: `${req.adminUser?.name || updatedBy} updated quiz "${updatedQuiz.title}" status to ${status}`,
      metadata: { newStatus: status },
      req
    });

    res.json({
      success: true,
      message: `Quiz status changed to ${status}`,
      quiz: updatedQuiz
    });
  } catch (err) {
    console.error('PATCH /api/quizzes/:quizId/status error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 7. POST /api/quizzes/:quizId/duplicate
 * Duplicate an existing quiz (Admin only)
 */
router.post('/:quizId/duplicate', requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    const createdBy = req.adminUser?.email || 'admin';
    const duplicated = await duplicateQuiz(quizId, createdBy);

    res.status(201).json({
      success: true,
      message: 'Quiz duplicated successfully',
      quiz: duplicated
    });
  } catch (err) {
    console.error('POST /api/quizzes/:quizId/duplicate error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 8. DELETE /api/quizzes/:quizId
 * Soft-delete / Archive a quiz (Admin only, learner history preserved)
 */
router.delete('/:quizId', requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    const deletedBy = req.adminUser?.email || 'admin';
    const result = await deleteQuiz(quizId, deletedBy);

    res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    console.error('DELETE /api/quizzes/:quizId error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ==========================================
// LEARNER QUIZ EXPERIENCE ROUTES (requireAuth)
// ==========================================

/**
 * 9. GET /api/quizzes/learner
 * List published quizzes available to the authenticated learner
 */
router.get('/learner', requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId, search } = req.query;
    const quizzes = await getPublishedQuizzesForLearner({ courseId, lessonId, search });

    res.json({
      success: true,
      count: quizzes.length,
      quizzes
    });
  } catch (err) {
    console.error('GET /api/quizzes/learner error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quizzes: ' + err.message,
      quizzes: []
    });
  }
});

/**
 * 10. GET /api/quizzes/learner/my-attempts
 * Get all quiz attempts made by the authenticated learner
 */
router.get('/learner/my-attempts', requireAuth, async (req, res) => {
  try {
    const attempts = await getAllLearnerQuizAttempts(req.user.email);
    res.json({
      success: true,
      count: attempts.length,
      attempts
    });
  } catch (err) {
    console.error('GET /api/quizzes/learner/my-attempts error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve attempts: ' + err.message,
      attempts: []
    });
  }
});

/**
 * 11. GET /api/quizzes/learner/:quizId
 * Load a published quiz without correct answers or explanations
 */
router.get('/learner/:quizId', requireAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await getQuizById(quizId, false); // false = strip answers

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: `Quiz with ID "${quizId}" not found or not published`
      });
    }

    if (quiz.status !== 'published') {
      return res.status(403).json({
        success: false,
        error: 'This quiz is not currently published'
      });
    }

    // Also get previous attempts for this learner to display stats
    const pastAttempts = await getLearnerQuizAttempts(quizId, req.user.email);

    res.json({
      success: true,
      quiz,
      pastAttemptsCount: pastAttempts.length,
      bestScore: pastAttempts.length > 0 ? Math.max(...pastAttempts.map(a => a.percentage || 0)) : null,
      lastAttempt: pastAttempts.length > 0 ? pastAttempts[pastAttempts.length - 1] : null
    });
  } catch (err) {
    console.error('GET /api/quizzes/learner/:quizId error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load quiz: ' + err.message
    });
  }
});

/**
 * 12. GET /api/quizzes/learner/:quizId/attempts
 * Get learner's past attempts for a specific quiz
 */
router.get('/learner/:quizId/attempts', requireAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const attempts = await getLearnerQuizAttempts(quizId, req.user.email);
    res.json({
      success: true,
      count: attempts.length,
      attempts
    });
  } catch (err) {
    console.error('GET /api/quizzes/learner/:quizId/attempts error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve attempts: ' + err.message,
      attempts: []
    });
  }
});

/**
 * 13. POST /api/quizzes/learner/:quizId/submit
 * Submit answers, calculate score ON BACKEND, return results with review & explanations
 */
router.post('/learner/:quizId/submit', requireAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers, clientSubmissionId, idempotencyKey } = req.body;
    const submissionKey = clientSubmissionId || idempotencyKey || req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'answers object is required'
      });
    }

    // Authoritative calculation on backend with verified user & idempotency key
    const result = await submitQuizAttempt(quizId, req.user, answers, submissionKey);

    console.log(`📊 Quiz submitted by ${req.user.email} for quiz ${quizId}: Score ${result.percentage}% (${result.passed ? 'PASSED' : 'FAILED'})`);
    res.json({
      success: true,
      result
    });
  } catch (err) {
    console.error('POST /api/quizzes/learner/:quizId/submit error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
