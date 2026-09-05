/**
 * Baseline Assessments API Routes — One Community Ely Online Training Centre
 * Secure endpoints for Admin configuration and Learner submissions.
 */

import express from 'express';
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
  getAssessmentResponsesAdmin
} from '../services/baselineAssessmentService.js';
import { requireAuth, requireAdmin, requireLearner } from '../middleware/auth.js';
import { getCourseProgress } from '../services/progressService.js';

const router = express.Router();

/**
 * 1. GET /api/baseline-assessments/admin
 * List all assessments with optional filtering (Admin only)
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { courseId, status } = req.query;
    const assessments = await getAllAssessmentsAdmin({ courseId, status });
    res.status(200).json({
      success: true,
      assessments
    });
  } catch (err) {
    console.error('GET /api/baseline-assessments/admin error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/baseline-assessments
 * Create a new baseline assessment (Admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const assessment = await createAssessment(req.body, req.user.email);
    res.status(201).json({
      success: true,
      message: 'Baseline assessment created successfully',
      assessment
    });
  } catch (err) {
    console.error('POST /api/baseline-assessments error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/baseline-assessments/admin/:assessmentId/responses
 * Retrieve learner submissions for an assessment (Admin only)
 */
router.get('/admin/:assessmentId/responses', requireAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { search } = req.query;
    const responses = await getAssessmentResponsesAdmin(assessmentId, { search });
    res.status(200).json({
      success: true,
      responses,
      totalResponses: responses.length
    });
  } catch (err) {
    console.error('GET /api/baseline-assessments/admin/:assessmentId/responses error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET /api/baseline-assessments/course/:courseId/status
 * Check learner baseline completion status for a course
 */
router.get('/course/:courseId/status', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    // Check if course has a published baseline assessment
    const assessment = await getPublishedAssessmentForCourse(courseId);
    if (!assessment) {
      return res.status(200).json({
        success: true,
        required: false,
        completed: false,
        reason: 'No published baseline assessment for this course'
      });
    }

    // Check learner's course progress (backward compatibility: in-progress/completed learners aren't blocked)
    const progress = await getCourseProgress(courseId, cleanEmail);
    const hasAlreadyStarted = progress && progress.status !== 'not_started';

    // Check if learner has submitted
    const response = await getLearnerBaselineResponse(courseId, cleanEmail);
    const completed = !!response;

    res.status(200).json({
      success: true,
      required: !hasAlreadyStarted && !completed,
      hasAlreadyStarted,
      completed,
      assessment: {
        assessmentId: assessment.assessmentId,
        title: assessment.title,
        instructions: assessment.instructions,
        version: assessment.version,
        totalQuestions: assessment.questions.length
      },
      submittedAt: response?.submittedAt || null
    });
  } catch (err) {
    console.error('GET /api/baseline-assessments/course/:courseId/status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. GET /api/baseline-assessments/course/:courseId
 * Retrieve the active published baseline assessment for a course
 */
router.get('/course/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const assessment = await getPublishedAssessmentForCourse(courseId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'No active published baseline assessment found for this course.'
      });
    }

    res.status(200).json({
      success: true,
      assessment
    });
  } catch (err) {
    console.error('GET /api/baseline-assessments/course/:courseId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. GET /api/baseline-assessments/:assessmentId
 * Retrieve assessment by ID (Admin sees any status; Learner only sees published)
 */
router.get('/:assessmentId', requireAuth, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const isAdmin = req.user.userType === 'teacher' || req.user.userType === 'admin';
    const assessment = await getAssessmentById(assessmentId, isAdmin);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Baseline assessment not found or not published.'
      });
    }

    res.status(200).json({
      success: true,
      assessment
    });
  } catch (err) {
    console.error('GET /api/baseline-assessments/:assessmentId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. PUT /api/baseline-assessments/:assessmentId
 * Update baseline assessment configuration (Admin only)
 */
router.put('/:assessmentId', requireAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updated = await updateAssessment(assessmentId, req.body, req.user.email);
    res.status(200).json({
      success: true,
      message: 'Baseline assessment updated successfully',
      assessment: updated
    });
  } catch (err) {
    console.error('PUT /api/baseline-assessments/:assessmentId error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 8. PATCH /api/baseline-assessments/:assessmentId/status
 * Update status (publish, unpublish, draft, archived) (Admin only)
 */
router.patch('/:assessmentId/status', requireAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }
    const updated = await updateAssessmentStatus(assessmentId, status, req.user.email);
    res.status(200).json({
      success: true,
      message: `Assessment status updated to ${status}`,
      assessment: updated
    });
  } catch (err) {
    console.error('PATCH /api/baseline-assessments/:assessmentId/status error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 9. DELETE /api/baseline-assessments/:assessmentId
 * Soft-delete / archive assessment (Admin only)
 */
router.delete('/:assessmentId', requireAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const archived = await deleteAssessment(assessmentId, req.user.email);
    res.status(200).json({
      success: true,
      message: 'Assessment archived successfully',
      assessment: archived
    });
  } catch (err) {
    console.error('DELETE /api/baseline-assessments/:assessmentId error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 10. POST /api/baseline-assessments/:assessmentId/submit
 * Submit baseline assessment answers (Learner only)
 */
router.post('/:assessmentId/submit', requireLearner, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { answers } = req.body;

    // Use verified identity from Bearer token
    const learnerUser = req.user;
    const result = await submitBaselineResponse(assessmentId, learnerUser, answers || {});

    res.status(200).json(result);
  } catch (err) {
    console.error('POST /api/baseline-assessments/:assessmentId/submit error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
