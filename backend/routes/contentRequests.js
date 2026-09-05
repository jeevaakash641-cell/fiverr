/**
 * Content Request Routes
 * One Community Ely Online Training Centre
 * Endpoints for learners requesting missing/mismatched quizzes & assessments,
 * and administrators reviewing & fulfilling them.
 */

import express from 'express';
import {
  createContentRequest,
  getLearnerContentRequests,
  getAllContentRequestsAdmin,
  updateContentRequestStatus
} from '../services/contentRequestService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { recordAdminAction, AuditCategories } from '../services/adminAuditService.js';

const router = express.Router();

/**
 * 1. POST /api/content-requests
 * Authenticated learner submits a request for a quiz or assessment
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { courseId, courseTitle, requestType, note } = req.body;
    const learnerEmail = req.user.email;
    const learnerName = req.user.name || req.user.displayName || learnerEmail.split('@')[0];

    const result = await createContentRequest({
      learnerEmail,
      learnerName,
      courseId,
      courseTitle,
      requestType,
      note
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('POST /api/content-requests error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 2. GET /api/content-requests/my
 * Authenticated learner retrieves their own submitted requests
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const items = await getLearnerContentRequests(req.user.email, courseId || null);
    res.status(200).json({ success: true, requests: items });
  } catch (err) {
    console.error('GET /api/content-requests/my error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/content-requests/admin
 * Admin retrieves all content requests with optional filters
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { status, requestType, courseId, search } = req.query;
    const items = await getAllContentRequestsAdmin({ status, requestType, courseId, search });
    res.status(200).json({ success: true, requests: items, totalCount: items.length });
  } catch (err) {
    console.error('GET /api/content-requests/admin error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. PATCH /api/content-requests/admin/:requestId
 * Admin updates request status (fulfilled / dismissed / pending)
 */
router.patch('/admin/:requestId', requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminNote } = req.body;
    const adminEmail = req.user.email;

    const updated = await updateContentRequestStatus(requestId, status, adminEmail, adminNote);

    await recordAdminAction({
      admin: req.user,
      action: 'Updated Content Request Status',
      category: AuditCategories.LEARNER_MANAGEMENT,
      targetType: 'ContentRequest',
      targetId: requestId,
      targetName: updated?.courseTitle || requestId,
      result: 'Success',
      description: `${req.user?.name || adminEmail} updated content request (${requestId}) status to "${status}"`,
      metadata: { newStatus: status, learnerEmail: updated?.learnerEmail, requestType: updated?.requestType },
      req
    });

    res.status(200).json({ success: true, request: updated, message: `Request updated to "${status}".` });
  } catch (err) {
    console.error('PATCH /api/content-requests/admin/:requestId error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
