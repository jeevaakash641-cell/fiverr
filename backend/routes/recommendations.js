import express from 'express';
import { getPublishedCourses } from '../services/courseService.js';
import { computeCourseRecommendations } from '../services/recommendationEngine.js';

const router = express.Router();

/**
 * POST /api/recommendations/courses
 * Compute deterministic course recommendations based on learner's interest
 */
router.post('/courses', async (req, res) => {
  try {
    const { learningInterest } = req.body || {};

    if (learningInterest && typeof learningInterest === 'string' && learningInterest.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Learning interest text must not exceed 500 characters'
      });
    }

    const publishedCourses = await getPublishedCourses();
    const result = computeCourseRecommendations(learningInterest || '', publishedCourses);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('POST /api/recommendations/courses error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to compute course recommendations: ' + err.message
    });
  }
});

export default router;
