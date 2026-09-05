/**
 * After Assessments & Outcome Comparison API Routes
 * One Community Ely Online Training Centre
 */

import express from 'express';
import {
  createAssessment,
  createDraftFromBaseline,
  getAssessmentById,
  getAllAssessmentsAdmin,
  getPublishedAssessmentForCourse,
  updateAssessment,
  updateAssessmentStatus,
  deleteAssessment,
  checkLearnerEligibility,
  submitAfterResponse,
  getLearnerAfterResponse,
  getAssessmentResponsesAdmin
} from '../services/afterAssessmentService.js';
import { requireAuth, requireAdmin, requireLearner } from '../middleware/auth.js';

const router = express.Router();

/**
 * 1. GET /api/after-assessments/admin
 * List all After Assessments (Admin only)
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
    console.error('GET /api/after-assessments/admin error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/after-assessments
 * Create a new After Assessment (Admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const assessment = await createAssessment(req.body, req.user.email);
    res.status(201).json({
      success: true,
      message: 'After-assessment created successfully',
      assessment
    });
  } catch (err) {
    console.error('POST /api/after-assessments error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 3. POST /api/after-assessments/from-baseline/:baselineAssessmentId
 * Auto-create draft After Assessment from Baseline Assessment (Admin only)
 */
router.post('/from-baseline/:baselineAssessmentId', requireAdmin, async (req, res) => {
  try {
    const { baselineAssessmentId } = req.params;
    const draft = await createDraftFromBaseline(baselineAssessmentId, req.user.email);
    res.status(201).json({
      success: true,
      message: 'Draft After-assessment created from baseline successfully',
      assessment: draft
    });
  } catch (err) {
    console.error('POST /api/after-assessments/from-baseline error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET /api/after-assessments/admin/:assessmentId/responses
 * Retrieve learner submissions and before-vs-after comparisons (Admin only)
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
    console.error('GET /api/after-assessments/admin/:assessmentId/responses error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. GET /api/after-assessments/course/:courseId/eligibility
 * Authoritatively check if learner is eligible to take the After Assessment
 */
router.get('/course/:courseId/eligibility', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    // 1. Check if course has a published After Assessment
    const assessment = await getPublishedAssessmentForCourse(courseId);
    if (!assessment) {
      return res.status(200).json({
        success: true,
        eligible: false,
        hasAssessment: false,
        completed: false,
        reason: 'No published final assessment for this course.'
      });
    }

    // 2. Check if already submitted
    const existingResponse = await getLearnerAfterResponse(courseId, cleanEmail);
    if (existingResponse) {
      return res.status(200).json({
        success: true,
        eligible: false,
        hasAssessment: true,
        completed: true,
        assessment,
        response: existingResponse,
        message: 'Final assessment already completed.'
      });
    }

    // 3. Authoritatively verify course progress is 100%
    const eligibility = await checkLearnerEligibility(courseId, cleanEmail);

    res.status(200).json({
      success: true,
      eligible: eligibility.eligible,
      hasAssessment: true,
      completed: false,
      assessment,
      reason: eligibility.reason || null,
      progressPercentage: eligibility.progressPercentage
    });
  } catch (err) {
    console.error('GET /api/after-assessments/course/:courseId/eligibility error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. GET /api/after-assessments/course/:courseId/my-result
 * Retrieve learner's own outcome comparison for a completed course
 */
router.get('/course/:courseId/my-result', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    const response = await getLearnerAfterResponse(courseId, cleanEmail);
    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'No final assessment outcome found for this course.'
      });
    }

    res.status(200).json({
      success: true,
      result: response
    });
  } catch (err) {
    console.error('GET /api/after-assessments/course/:courseId/my-result error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. GET /api/after-assessments/course/:courseId
 * Retrieve the active published After Assessment for a course (checks eligibility)
 */
router.get('/course/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    const eligibility = await checkLearnerEligibility(courseId, cleanEmail);
    if (!eligibility.eligible) {
      return res.status(403).json({
        success: false,
        error: eligibility.reason || 'Complete the required course content before taking the final assessment.'
      });
    }

    const assessment = await getPublishedAssessmentForCourse(courseId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'No active published final assessment found for this course.'
      });
    }

    res.status(200).json({
      success: true,
      assessment
    });
  } catch (err) {
    console.error('GET /api/after-assessments/course/:courseId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. GET /api/after-assessments/:assessmentId
 * Retrieve assessment by ID (Admin sees any status; Learner sees published only)
 */
router.get('/:assessmentId', requireAuth, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const isAdmin = req.user.userType === 'teacher' || req.user.userType === 'admin';
    const assessment = await getAssessmentById(assessmentId, isAdmin);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'After assessment not found or not published.'
      });
    }

    res.status(200).json({
      success: true,
      assessment
    });
  } catch (err) {
    console.error('GET /api/after-assessments/:assessmentId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 9. PUT /api/after-assessments/:assessmentId
 * Update After Assessment configuration (Admin only)
 */
router.put('/:assessmentId', requireAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updated = await updateAssessment(assessmentId, req.body, req.user.email);
    res.status(200).json({
      success: true,
      message: 'After assessment updated successfully',
      assessment: updated
    });
  } catch (err) {
    console.error('PUT /api/after-assessments/:assessmentId error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 10. PATCH /api/after-assessments/:assessmentId/status
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
      message: `After assessment status updated to ${status}`,
      assessment: updated
    });
  } catch (err) {
    console.error('PATCH /api/after-assessments/:assessmentId/status error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 11. DELETE /api/after-assessments/:assessmentId
 * Soft archive After Assessment (Admin only)
 */
router.delete('/:assessmentId', requireAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const archived = await deleteAssessment(assessmentId, req.user.email);
    res.status(200).json({
      success: true,
      message: 'After assessment archived successfully',
      assessment: archived
    });
  } catch (err) {
    console.error('DELETE /api/after-assessments/:assessmentId error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 12. POST /api/after-assessments/:assessmentId/submit
 * Submit After Assessment answers & generate before-vs-after comparison (Learner only)
 */
router.post('/:assessmentId/submit', requireLearner, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { answers } = req.body;

    const learnerUser = req.user;
    const result = await submitAfterResponse(assessmentId, learnerUser, answers || {});

    res.status(200).json(result);
  } catch (err) {
    console.error('POST /api/after-assessments/:assessmentId/submit error:', err);
    const statusCode = err.ineligible ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
