/**
 * Module API Routes — One Community Ely Online Training Centre
 */

import express from 'express';
import {
  getModuleById,
  updateModule,
  updateModuleStatus,
  validateModulePayload,
  VALID_MODULE_STATUSES
} from '../services/moduleService.js';
import {
  createLesson,
  getLessonsByModule,
  reorderLessons,
  validateLessonPayload
} from '../services/lessonService.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * 1. GET /api/modules/:moduleId
 */
router.get('/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleItem = await getModuleById(moduleId);
    if (!moduleItem) {
      return res.status(404).json({ success: false, error: `Module "${moduleId}" not found` });
    }

    // Direct-route protection: draft, unpublished, or archived modules are blocked for learners
    if (moduleItem.status !== 'published') {
      const authHeader = req.headers['authorization'];
      let isAdmin = false;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { verifyFirebaseIdToken } = await import('../services/firebaseAuthService.js');
          const { getUserByEmail } = await import('../services/userService.js');
          const decoded = await verifyFirebaseIdToken(authHeader.split('Bearer ')[1].trim());
          if (decoded?.email) {
            const user = await getUserByEmail(decoded.email);
            if (user?.userType === 'teacher' || user?.userType === 'admin' || user?.role === 'admin' || user?.email === 'admin@onecommunityely.com') {
              isAdmin = true;
            }
          }
        } catch {}
      }

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'This module is not currently published or available to learners'
        });
      }
    }

    res.json({ success: true, module: moduleItem });
  } catch (err) {
    console.error(`GET /api/modules/${req.params.moduleId} error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. PUT /api/modules/:moduleId
 * Update module details (Admin only)
 */
router.put('/:moduleId', requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const errors = validateModulePayload(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    const updated = await updateModule(moduleId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Module "${moduleId}" not found` });
    }

    res.json({
      success: true,
      message: 'Module updated successfully',
      module: updated
    });
  } catch (err) {
    console.error(`PUT /api/modules/${req.params.moduleId} error:`, err);
    res.status(500).json({ success: false, error: 'Failed to update module: ' + err.message });
  }
});

/**
 * 3. PATCH /api/modules/:moduleId/status
 * Publish, unpublish or archive module (Admin only)
 */
router.patch('/:moduleId/status', requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_MODULE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: "${status}". Must be one of: ${VALID_MODULE_STATUSES.join(', ')}`
      });
    }

    const updated = await updateModuleStatus(moduleId, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Module "${moduleId}" not found` });
    }

    res.json({
      success: true,
      message: `Module status updated to ${status}`,
      module: updated
    });
  } catch (err) {
    console.error(`PATCH /api/modules/${req.params.moduleId}/status error:`, err);
    res.status(500).json({ success: false, error: 'Failed to update module status: ' + err.message });
  }
});

/**
 * 4. POST /api/modules/:moduleId/lessons
 * Create a new lesson inside a module (Admin only)
 */
router.post('/:moduleId/lessons', requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleItem = await getModuleById(moduleId);
    if (!moduleItem) {
      return res.status(404).json({ success: false, error: `Module "${moduleId}" not found` });
    }

    const errors = validateLessonPayload(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    const createdBy = req.adminUser?.email || req.body.createdBy || 'admin';
    const lesson = await createLesson(moduleItem.courseId, moduleId, req.body, createdBy);

    console.log(`✅ Lesson created in module ${moduleId}:`, lesson.lessonId, lesson.title);
    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      lesson
    });
  } catch (err) {
    console.error(`POST /api/modules/${req.params.moduleId}/lessons error:`, err);
    res.status(500).json({ success: false, error: 'Failed to create lesson: ' + err.message });
  }
});

/**
 * 5. GET /api/modules/:moduleId/lessons/admin
 * Get all lessons in a module for Admin (Admin only)
 */
router.get('/:moduleId/lessons/admin', requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const lessons = await getLessonsByModule(moduleId, true);
    res.json({
      success: true,
      count: lessons.length,
      lessons
    });
  } catch (err) {
    console.error(`GET /api/modules/${req.params.moduleId}/lessons/admin error:`, err);
    res.status(500).json({ success: false, error: 'Failed to retrieve lessons: ' + err.message, lessons: [] });
  }
});

/**
 * 6. PATCH /api/modules/:moduleId/lessons/reorder
 * Reorder lessons within a module (Admin only)
 */
router.patch('/:moduleId/lessons/reorder', requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { lessonIds } = req.body;

    if (!Array.isArray(lessonIds)) {
      return res.status(400).json({ success: false, error: 'lessonIds array is required' });
    }

    const updated = await reorderLessons(moduleId, lessonIds);
    res.json({
      success: true,
      message: 'Lessons reordered successfully',
      lessons: updated
    });
  } catch (err) {
    console.error(`PATCH /api/modules/${req.params.moduleId}/lessons/reorder error:`, err);
    res.status(500).json({ success: false, error: 'Failed to reorder lessons: ' + err.message });
  }
});

export default router;
