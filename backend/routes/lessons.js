/**
 * Lesson API Routes — One Community Ely Online Training Centre
 */

import express from 'express';
import {
  getLessonById,
  updateLesson,
  updateLessonStatus,
  moveLesson,
  validateLessonPayload,
  VALID_LESSON_STATUSES
} from '../services/lessonService.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * 1. GET /api/lessons/:lessonId
 * Retrieve single lesson details
 */
router.get('/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, error: `Lesson "${lessonId}" not found` });
    }

    // Direct-route protection: draft, unpublished, or archived lessons are blocked for learners
    if (lesson.status !== 'published') {
      // Check if requester has admin privileges
      const authHeader = req.headers['authorization'];
      let isAdmin = false;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { verifyFirebaseIdToken } = await import('../services/firebaseAuthService.js');
          const { getUserByEmail } = await import('../services/userService.js');
          const decoded = await verifyFirebaseIdToken(authHeader.split('Bearer ')[1].trim());
          if (decoded?.email) {
            const user = await getUserByEmail(decoded.email);
            if (user?.userType === 'teacher' || user?.userType === 'admin') {
              isAdmin = true;
            }
          }
        } catch {}
      }

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'This lesson is not currently published or available to learners'
        });
      }
    }

    res.json({ success: true, lesson });
  } catch (err) {
    console.error(`GET /api/lessons/${req.params.lessonId} error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. PUT /api/lessons/:lessonId
 * Update lesson details (Admin only)
 */
router.put('/:lessonId', requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const errors = validateLessonPayload(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    const updated = await updateLesson(lessonId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Lesson "${lessonId}" not found` });
    }

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      lesson: updated
    });
  } catch (err) {
    console.error(`PUT /api/lessons/${req.params.lessonId} error:`, err);
    res.status(500).json({ success: false, error: 'Failed to update lesson: ' + err.message });
  }
});

/**
 * 3. PATCH /api/lessons/:lessonId/status
 * Publish, unpublish, or archive lesson (Admin only)
 */
router.patch('/:lessonId/status', requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_LESSON_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: "${status}". Must be one of: ${VALID_LESSON_STATUSES.join(', ')}`
      });
    }

    const updated = await updateLessonStatus(lessonId, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Lesson "${lessonId}" not found` });
    }

    res.json({
      success: true,
      message: `Lesson status updated to ${status}`,
      lesson: updated
    });
  } catch (err) {
    console.error(`PATCH /api/lessons/${req.params.lessonId}/status error:`, err);
    res.status(500).json({ success: false, error: 'Failed to update lesson status: ' + err.message });
  }
});

/**
 * 4. PATCH /api/lessons/:lessonId/move
 * Move lesson to another module in the SAME course (Admin only)
 */
router.patch('/:lessonId/move', requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { targetModuleId, targetCourseId } = req.body;

    if (!targetModuleId) {
      return res.status(400).json({
        success: false,
        error: 'targetModuleId is required'
      });
    }

    const updated = await moveLesson(lessonId, targetModuleId, targetCourseId);
    res.json({
      success: true,
      message: 'Lesson moved successfully to target module',
      lesson: updated
    });
  } catch (err) {
    console.error(`PATCH /api/lessons/${req.params.lessonId}/move error:`, err);
    res.status(400).json({
      success: false,
      error: 'Failed to move lesson: ' + err.message
    });
  }
});

export default router;
