import express from 'express';
import { requireLearner } from '../middleware/auth.js';
import {
  saveCourseSelection,
  getLearnerSelections,
  checkLearnerCourseSelection
} from '../services/courseSelectionService.js';

const router = express.Router();

/**
 * 1. POST /api/course-selections
 * Learner selects a published course
 */
router.post('/', requireLearner, async (req, res) => {
  try {
    const { courseId, source, recommendationReason } = req.body || {};

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'courseId is required'
      });
    }

    const learnerEmail = req.learnerEmail;
    const result = await saveCourseSelection(
      learnerEmail,
      courseId.trim(),
      source,
      recommendationReason
    );

    res.status(201).json({
      success: true,
      message: result.alreadySelected
        ? 'Course is already in your selected list'
        : 'Course successfully selected!',
      selection: result
    });
  } catch (err) {
    console.error('POST /api/course-selections error:', err);
    const status = err.message.includes('not currently published') || err.message.includes('does not exist')
      ? 400
      : 500;
    res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 2. GET /api/course-selections/me
 * Retrieve all active course selections for the authenticated learner
 */
router.get('/me', requireLearner, async (req, res) => {
  try {
    const learnerEmail = req.learnerEmail;
    const selections = await getLearnerSelections(learnerEmail);

    res.json({
      success: true,
      selections
    });
  } catch (err) {
    console.error('GET /api/course-selections/me error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve course selections: ' + err.message
    });
  }
});

/**
 * 3. GET /api/course-selections/check/:courseId
 * Check if learner has already selected a specific course
 */
router.get('/check/:courseId', requireLearner, async (req, res) => {
  try {
    const { courseId } = req.params;
    const learnerEmail = req.learnerEmail;
    const result = await checkLearnerCourseSelection(learnerEmail, courseId);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('GET /api/course-selections/check/:courseId error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to check course selection: ' + err.message
    });
  }
});

export default router;
