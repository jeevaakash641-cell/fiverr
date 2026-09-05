/**
 * Beneficiary Feedback & Testimonial Consent Routes
 * One Community Ely Online Training Centre
 */

import express from 'express';
import {
  checkFeedbackEligibility,
  submitBeneficiaryFeedback,
  getLearnerFeedback,
  getFeedbackById,
  getAllFeedbackAdmin,
  recordConsentWithdrawal,
  archiveFeedback,
  RATING_SCALE_LABELS,
  TESTIMONIAL_CONSENT_OPTIONS,
  STANDARD_CONSENT_TEXT
} from '../services/beneficiaryFeedbackService.js';
import { requireAuth, requireAdmin, requireLearner } from '../middleware/auth.js';
import { recordAdminAction, AuditCategories } from '../services/adminAuditService.js';

const router = express.Router();

/**
 * 1. GET /api/beneficiary-feedback/course/:courseId/status
 * Check learner's feedback eligibility & completion status
 */
router.get('/course/:courseId/status', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    const status = await checkFeedbackEligibility(courseId, cleanEmail);
    res.status(200).json({
      success: true,
      ...status
    });
  } catch (err) {
    console.error('GET /api/beneficiary-feedback/course/:courseId/status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. GET /api/beneficiary-feedback/course/:courseId/form
 * Load the standardized feedback form schema and questions
 */
router.get('/course/:courseId/form', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    const eligibility = await checkFeedbackEligibility(courseId, cleanEmail);
    if (!eligibility.eligible && !eligibility.alreadySubmitted) {
      return res.status(403).json({
        success: false,
        error: eligibility.reason || 'Complete the required course content before providing feedback.'
      });
    }

    res.status(200).json({
      success: true,
      form: {
        questions: [
          {
            id: 'usefulnessRating',
            text: 'How useful was this training?',
            type: 'rating_1_to_5',
            required: true,
            labels: RATING_SCALE_LABELS
          },
          {
            id: 'confidenceRating',
            text: 'Do you feel more confident?',
            type: 'rating_1_to_5',
            required: true,
            labels: RATING_SCALE_LABELS
          },
          {
            id: 'mostUsefulLearning',
            text: 'What was the most useful thing you learned?',
            type: 'long_text',
            required: true,
            placeholder: 'Share what resonated most with you...'
          },
          {
            id: 'intendedChange',
            text: 'What will you do differently?',
            type: 'long_text',
            required: true,
            placeholder: 'Describe any practical changes or actions you plan to take...'
          },
          {
            id: 'nextLearning',
            text: 'What would you like to learn next?',
            type: 'long_text',
            required: false,
            placeholder: 'Tell us about topics or skills you want to explore next...'
          },
          {
            id: 'wouldRecommend',
            text: 'Would you recommend this training?',
            type: 'boolean_yes_no',
            required: true,
            options: [
              { value: 'yes', label: 'Yes, I would recommend it' },
              { value: 'no', label: 'No, I would not recommend it' }
            ]
          },
          {
            id: 'testimonialConsent',
            text: STANDARD_CONSENT_TEXT,
            type: 'consent_choice',
            required: true,
            options: [
              { value: 'none', label: TESTIMONIAL_CONSENT_OPTIONS.none },
              { value: 'anonymous', label: TESTIMONIAL_CONSENT_OPTIONS.anonymous },
              { value: 'named', label: TESTIMONIAL_CONSENT_OPTIONS.named }
            ]
          }
        ]
      }
    });
  } catch (err) {
    console.error('GET /api/beneficiary-feedback/course/:courseId/form error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. POST /api/beneficiary-feedback/course/:courseId
 * Submit Beneficiary Feedback (Learner only)
 */
router.post('/course/:courseId', requireLearner, async (req, res) => {
  try {
    const { courseId } = req.params;
    const result = await submitBeneficiaryFeedback(courseId, req.user, req.body || {});
    res.status(200).json(result);
  } catch (err) {
    console.error('POST /api/beneficiary-feedback/course/:courseId error:', err);
    const statusCode = err.ineligible ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 4. GET /api/beneficiary-feedback/course/:courseId/my-feedback
 * Retrieve authenticated learner's own feedback submission
 */
router.get('/course/:courseId/my-feedback', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    const feedback = await getLearnerFeedback(courseId, cleanEmail);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'No feedback found for this course.'
      });
    }

    res.status(200).json({
      success: true,
      feedback
    });
  } catch (err) {
    console.error('GET /api/beneficiary-feedback/course/:courseId/my-feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. GET /api/beneficiary-feedback/admin
 * List all feedback submissions with filters & search (Admin only)
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { courseId, recommendation, consent, search, status } = req.query;
    const items = await getAllFeedbackAdmin({ courseId, recommendation, consent, search, status });
    res.status(200).json({
      success: true,
      feedback: items,
      totalCount: items.length
    });
  } catch (err) {
    console.error('GET /api/beneficiary-feedback/admin error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. GET /api/beneficiary-feedback/admin/:feedbackId
 * View single feedback details (Admin only)
 */
router.get('/admin/:feedbackId', requireAdmin, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const item = await getFeedbackById(feedbackId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Feedback record not found.' });
    }
    res.status(200).json({ success: true, feedback: item });
  } catch (err) {
    console.error('GET /api/beneficiary-feedback/admin/:feedbackId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. PATCH /api/beneficiary-feedback/admin/:feedbackId/consent-withdrawal
 * Record testimonial consent withdrawal (Admin only)
 */
router.patch('/admin/:feedbackId/consent-withdrawal', requireAdmin, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const updated = await recordConsentWithdrawal(feedbackId, req.user.email);

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Recorded Consent Withdrawal',
      category: AuditCategories.FEEDBACK,
      targetType: 'BeneficiaryFeedback',
      targetId: feedbackId,
      targetName: updated?.courseTitle || feedbackId,
      result: 'Success',
      description: `${req.adminUser?.name || req.adminUser?.email} recorded testimonial consent withdrawal for feedback (${feedbackId})`,
      metadata: { learnerEmail: updated?.learnerEmail, courseId: updated?.courseId },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Testimonial consent withdrawal recorded successfully',
      feedback: updated
    });
  } catch (err) {
    console.error('PATCH /api/beneficiary-feedback/admin/:feedbackId/consent-withdrawal error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 8. DELETE /api/beneficiary-feedback/admin/:feedbackId
 * Soft-archive feedback submission (Admin only)
 */
router.delete('/admin/:feedbackId', requireAdmin, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const archived = await archiveFeedback(feedbackId, req.user.email);

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Archived Beneficiary Feedback',
      category: AuditCategories.FEEDBACK,
      targetType: 'BeneficiaryFeedback',
      targetId: feedbackId,
      targetName: archived?.courseTitle || feedbackId,
      result: 'Success',
      description: `${req.adminUser?.name || req.adminUser?.email} archived beneficiary feedback (${feedbackId})`,
      req
    });

    res.status(200).json({
      success: true,
      message: 'Feedback archived successfully',
      feedback: archived
    });
  } catch (err) {
    console.error('DELETE /api/beneficiary-feedback/admin/:feedbackId error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
