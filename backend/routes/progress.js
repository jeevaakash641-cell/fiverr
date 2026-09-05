/**
 * Course Progress API Routes — One Community Ely Online Training Centre
 * Strictly enforces verified Bearer token authentication and authoritative backend progress tracking.
 */

import express from 'express';
import {
  startCourse,
  getCourseProgress,
  recordLessonVisit,
  completeLesson,
  getCourseResumePosition,
  getLearnerAllCoursesProgress,
  calculateCourseProgress
} from '../services/progressService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * 1. POST /api/progress/courses/:courseId/start
 * Start a selected course for the authenticated learner
 */
router.post('/courses/:courseId/start', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const progress = await startCourse(courseId, req.user);

    res.status(200).json({
      success: true,
      message: 'Course started successfully',
      progress
    });
  } catch (err) {
    console.error('POST /api/progress/courses/:courseId/start error:', err);
    if (err.baselineRequired) {
      return res.status(403).json({
        success: false,
        baselineRequired: true,
        assessmentId: err.assessmentId,
        courseId: err.courseId,
        error: err.message
      });
    }
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 2. GET /api/progress/courses/:courseId
 * Retrieve course progress for the authenticated learner
 */
router.get('/courses/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const progress = await getCourseProgress(courseId, req.user.email);

    if (!progress) {
      // Calculate total lessons for unstarted course representation
      const calc = await calculateCourseProgress(courseId, []);
      return res.json({
        success: true,
        progress: {
          courseId,
          learnerEmail: req.user.email,
          status: 'not_started',
          progressPercentage: 0,
          completedLessonsCount: 0,
          totalRequiredLessons: calc.totalCount,
          completedLessonIds: [],
          startedAt: null,
          completedAt: null
        }
      });
    }

    res.json({
      success: true,
      progress
    });
  } catch (err) {
    console.error('GET /api/progress/courses/:courseId error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 3. GET /api/progress/my-courses
 * Retrieve all selected courses and their progress for the authenticated learner
 * Categorized into: inProgress, notStarted, completed
 */
router.get('/my-courses', requireAuth, async (req, res) => {
  try {
    const data = await getLearnerAllCoursesProgress(req.user.email);
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error('GET /api/progress/my-courses error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 4. POST /api/progress/courses/:courseId/visit
 * Record lesson visit: updates current position and last accessed time
 */
router.post('/courses/:courseId/visit', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId, moduleId } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        error: 'lessonId is required in request body'
      });
    }

    const progress = await recordLessonVisit(courseId, lessonId, moduleId, req.user);

    res.json({
      success: true,
      progress
    });
  } catch (err) {
    console.error('POST /api/progress/courses/:courseId/visit error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 5. POST /api/progress/courses/:courseId/lessons/:lessonId/complete
 * Mark a lesson complete with quiz verification & backend progress recalculation
 */
router.post('/courses/:courseId/lessons/:lessonId/complete', requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const result = await completeLesson(courseId, lessonId, req.user);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('POST /api/progress/courses/:courseId/lessons/:lessonId/complete error:', err);
    const statusCode = err.quizRequired ? 400 : (err.message.includes('Unpublished') ? 403 : 400);
    res.status(statusCode).json({
      success: false,
      error: err.message,
      quizRequired: Boolean(err.quizRequired),
      incompleteQuiz: err.incompleteQuiz || null
    });
  }
});

/**
 * 6. GET /api/progress/courses/:courseId/resume
 * Resolve exact resume position for "Continue Learning"
 */
router.get('/courses/:courseId/resume', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const resumeInfo = await getCourseResumePosition(courseId, req.user.email);

    res.json({
      success: true,
      ...resumeInfo
    });
  } catch (err) {
    console.error('GET /api/progress/courses/:courseId/resume error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 7. POST /api/progress/courses/:courseId/recalculate
 * Re-evaluate completion status against current published course structure
 */
router.post('/courses/:courseId/recalculate', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const currentProgress = await getCourseProgress(courseId, req.user.email);
    const completedLessonIds = currentProgress?.completedLessonIds || [];

    const calc = await calculateCourseProgress(courseId, completedLessonIds);

    res.json({
      success: true,
      calculation: calc
    });
  } catch (err) {
    console.error('POST /api/progress/courses/:courseId/recalculate error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
