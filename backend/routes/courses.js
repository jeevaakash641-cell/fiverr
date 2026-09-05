/**
 * Course API Routes — One Community Ely Online Training Centre
 */

import express from 'express';
import {
  createCourse,
  getAllCourses,
  getPublishedCourses,
  getCourseById,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  deleteMultipleCourses,
  deleteAllCourses,
  validateCoursePayload,
  VALID_STATUSES
} from '../services/courseService.js';
import { requireAdmin } from '../middleware/auth.js';
import { recordAdminAction, AuditCategories } from '../services/adminAuditService.js';

const router = express.Router();

/**
 * 1. POST /api/courses
 * Create a new course (Admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const errors = validateCoursePayload(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    const createdBy = req.adminUser?.email || req.body.createdBy || 'admin';
    const course = await createCourse(req.body, createdBy);

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Created Course',
      category: AuditCategories.COURSES_LESSONS,
      targetType: 'Course',
      targetId: course.courseId,
      targetName: course.title,
      result: 'Success',
      description: `${req.adminUser?.name || createdBy} created new course "${course.title}" (${course.courseId})`,
      metadata: { category: course.category, difficulty: course.difficultyLevel },
      req
    });

    console.log(`✅ Course created by ${createdBy}:`, course.courseId, course.title);
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (err) {
    console.error('POST /api/courses error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create course: ' + err.message
    });
  }
});

/**
 * 2. GET /api/courses/admin
 * List all courses for Admin (Includes draft, published, unpublished, archived)
 * (Declared before /:courseId to prevent route conflict)
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const courses = await getAllCourses({ status, category, search });
    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (err) {
    console.error('GET /api/courses/admin error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve courses: ' + err.message,
      courses: []
    });
  }
});

/**
 * 3. GET /api/courses/published
 * List only published courses for learners / public
 * (Declared before /:courseId to prevent route conflict)
 */
router.get('/published', async (req, res) => {
  try {
    const { category, search } = req.query;
    const courses = await getPublishedCourses({ category, search });
    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (err) {
    console.error('GET /api/courses/published error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve published courses: ' + err.message,
      courses: []
    });
  }
});

/**
 * 4. GET /api/courses/:courseId
 * Retrieve single course details
 */
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: `Course "${courseId}" not found`
      });
    }

    // Direct-route protection: draft, unpublished, or archived courses are blocked for learners
    if (course.status !== 'published') {
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
          error: 'This course is not currently published or available to learners'
        });
      }
    }

    res.json({
      success: true,
      course
    });
  } catch (err) {
    console.error(`GET /api/courses/${req.params.courseId} error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve course: ' + err.message
    });
  }
});

/**
 * 5. PUT /api/courses/:courseId
 * Update course details (Admin only)
 */
router.put('/:courseId', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const errors = validateCoursePayload(req.body, true);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    const updated = await updateCourse(req.params.courseId, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Edited Course',
      category: AuditCategories.COURSES_LESSONS,
      targetType: 'Course',
      targetId: updated.courseId,
      targetName: updated.title,
      result: 'Success',
      description: `${req.adminUser?.name || req.adminUser?.email} updated course "${updated.title}" (${updated.courseId})`,
      changedFields: Object.keys(req.body),
      req
    });

    console.log(`✅ Course updated:`, updated.courseId, updated.title);
    res.json({
      success: true,
      message: 'Course updated successfully',
      course: updated
    });
  } catch (err) {
    console.error(`PUT /api/courses/${req.params.courseId} error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to update course: ' + err.message
    });
  }
});

/**
 * 6. PATCH /api/courses/:courseId/status
 * Change course status: draft | published | unpublished | archived (Admin only)
 */
router.patch('/:courseId/status', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const updated = await updateCourseStatus(courseId, status);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Course "${courseId}" not found`
      });
    }

    let statusAction = 'Updated Course Status';
    if (status === 'published') statusAction = 'Published Course';
    else if (status === 'unpublished') statusAction = 'Unpublished Course';
    else if (status === 'archived') statusAction = 'Archived Course';
    else if (status === 'draft') statusAction = 'Set Course to Draft';

    await recordAdminAction({
      admin: req.adminUser,
      action: statusAction,
      category: AuditCategories.COURSES_LESSONS,
      targetType: 'Course',
      targetId: updated.courseId,
      targetName: updated.title,
      result: 'Success',
      description: `${req.adminUser?.name || req.adminUser?.email} changed status of "${updated.title}" to ${status}`,
      metadata: { newStatus: status },
      req
    });

    console.log(`✅ Course status changed:`, courseId, '->', status);
    res.json({
      success: true,
      message: `Course status updated to ${status}`,
      course: updated
    });
  } catch (err) {
    console.error(`PATCH /api/courses/${req.params.courseId}/status error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to update course status: ' + err.message
    });
  }
});

/**
 * 6a. DELETE /api/courses/all
 * Delete ALL courses and their cascade contents (Admin only)
 * (Declared before /:courseId)
 */
router.delete('/all', requireAdmin, async (req, res) => {
  try {
    const count = await deleteAllCourses();
    console.log(`⚠️ All courses deleted by admin (${count} courses removed)`);
    res.json({
      success: true,
      message: `All ${count} courses and their contents were permanently deleted.`,
      deletedCount: count
    });
  } catch (err) {
    console.error('DELETE /api/courses/all error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all courses: ' + err.message
    });
  }
});

/**
 * 6b. POST /api/courses/bulk-delete
 * Delete multiple specified courses (Admin only)
 */
router.post('/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { courseIds } = req.body;
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'courseIds array is required and must not be empty'
      });
    }

    const deleted = await deleteMultipleCourses(courseIds);
    console.log(`✅ Bulk deleted ${deleted.length} courses`);
    res.json({
      success: true,
      message: `Successfully deleted ${deleted.length} courses.`,
      deletedCount: deleted.length,
      deletedCourses: deleted
    });
  } catch (err) {
    console.error('POST /api/courses/bulk-delete error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete courses: ' + err.message
    });
  }
});

/**
 * 6c. DELETE /api/courses/:courseId
 * Delete a single course and its contents (Admin only)
 */
router.delete('/:courseId', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const deleted = await deleteCourse(courseId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Course "${courseId}" not found`
      });
    }

    console.log(`✅ Course deleted:`, courseId, deleted.title);
    res.json({
      success: true,
      message: `Course "${deleted.title}" deleted successfully.`,
      course: deleted
    });
  } catch (err) {
    console.error(`DELETE /api/courses/${req.params.courseId} error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course: ' + err.message
    });
  }
});

/**
 * 7. POST /api/courses/:courseId/modules
 * Create a new module inside a course (Admin only)
 */
router.post('/:courseId/modules', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { validateModulePayload, createModule } = await import('../services/moduleService.js');
    
    const errors = validateModulePayload(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    const createdBy = req.adminUser?.email || req.body.createdBy || 'admin';
    const moduleItem = await createModule(courseId, req.body, createdBy);

    console.log(`✅ Module created in course ${courseId}:`, moduleItem.moduleId, moduleItem.title);
    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      module: moduleItem
    });
  } catch (err) {
    console.error(`POST /api/courses/${req.params.courseId}/modules error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to create module: ' + err.message
    });
  }
});

/**
 * 8. GET /api/courses/:courseId/modules/admin
 * Get all modules in a course for Admin (Includes all statuses)
 */
router.get('/:courseId/modules/admin', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { getModulesByCourse } = await import('../services/moduleService.js');
    const modules = await getModulesByCourse(courseId, true);

    res.json({
      success: true,
      count: modules.length,
      modules
    });
  } catch (err) {
    console.error(`GET /api/courses/${req.params.courseId}/modules/admin error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve modules: ' + err.message,
      modules: []
    });
  }
});

/**
 * 9. PATCH /api/courses/:courseId/modules/reorder
 * Reorder modules within a course (Admin only)
 */
router.patch('/:courseId/modules/reorder', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleIds } = req.body;

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({
        success: false,
        error: 'moduleIds array is required'
      });
    }

    const { reorderModules } = await import('../services/moduleService.js');
    const updated = await reorderModules(courseId, moduleIds);

    res.json({
      success: true,
      message: 'Modules reordered successfully',
      modules: updated
    });
  } catch (err) {
    console.error(`PATCH /api/courses/${req.params.courseId}/modules/reorder error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder modules: ' + err.message
    });
  }
});

/**
 * 10. GET /api/courses/:courseId/content/admin
 * Admin full content hierarchy (course -> all modules -> all lessons)
 */
router.get('/:courseId/content/admin', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: `Course "${courseId}" not found` });
    }

    const { getModulesByCourse } = await import('../services/moduleService.js');
    const { getLessonsByCourse } = await import('../services/lessonService.js');

    const modules = await getModulesByCourse(courseId, true);
    const allLessons = await getLessonsByCourse(courseId, true);

    const fullStructure = modules.map(m => ({
      ...m,
      lessons: allLessons.filter(l => l.moduleId === m.moduleId).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    }));

    res.json({
      success: true,
      course,
      modules: fullStructure
    });
  } catch (err) {
    console.error(`GET /api/courses/${req.params.courseId}/content/admin error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to load course hierarchy: ' + err.message
    });
  }
});

/**
 * 11. GET /api/courses/:courseId/content
 * Public / Learner published content hierarchy (published course -> published modules -> published lessons)
 */
router.get('/:courseId/content', async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await getCourseById(courseId);

    // If course does not exist or is not published, return 404 for learners
    if (!course || course.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: `Course "${courseId}" is not published or does not exist`
      });
    }

    const { getModulesByCourse } = await import('../services/moduleService.js');
    const { getLessonsByCourse } = await import('../services/lessonService.js');

    // Only get published modules & lessons
    const publishedModules = await getModulesByCourse(courseId, false);
    const publishedLessons = await getLessonsByCourse(courseId, false);

    const hierarchy = publishedModules.map(m => ({
      ...m,
      lessons: publishedLessons.filter(l => l.moduleId === m.moduleId).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    }));

    res.json({
      success: true,
      course,
      modules: hierarchy
    });
  } catch (err) {
    console.error(`GET /api/courses/${req.params.courseId}/content error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve course content: ' + err.message
    });
  }
});

/**
 * 12. GET /api/courses/:courseId/overview
 * Learner overview of a published course with curriculum summary
 */
router.get('/:courseId/overview', async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await getCourseById(courseId);

    if (!course || course.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: `Course "${courseId}" is not published or does not exist`
      });
    }

    const { getModulesByCourse } = await import('../services/moduleService.js');
    const { getLessonsByCourse } = await import('../services/lessonService.js');

    const publishedModules = await getModulesByCourse(courseId, false);
    const publishedLessons = await getLessonsByCourse(courseId, false);

    let totalLessonsCount = 0;
    const curriculumOutline = publishedModules.map((m, idx) => {
      const moduleLessons = publishedLessons
        .filter(l => l.moduleId === m.moduleId)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((l, lIdx) => ({
          lessonId: l.lessonId,
          title: l.title,
          shortDescription: l.shortDescription,
          estimatedMinutes: l.estimatedMinutes,
          orderIndex: l.orderIndex ?? lIdx,
          hasVideo: Boolean(l.videoUrl),
          resourceCount: Array.isArray(l.attachedResources) ? l.attachedResources.length : 0
        }));

      totalLessonsCount += moduleLessons.length;

      return {
        moduleId: m.moduleId,
        title: m.title,
        description: m.description,
        orderIndex: m.orderIndex ?? idx,
        lessonCount: moduleLessons.length,
        lessons: moduleLessons
      };
    });

    res.json({
      success: true,
      course,
      totalModules: publishedModules.length,
      totalLessons: totalLessonsCount,
      modules: curriculumOutline
    });
  } catch (err) {
    console.error(`GET /api/courses/${req.params.courseId}/overview error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve course overview: ' + err.message
    });
  }
});

export default router;

