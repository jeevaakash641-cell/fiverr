import express from 'express';
import {
  saveUserActivity,
  getUserHistory,
  getUserActivityStats,
  getRecentActivities,
  getActivitySummary,
  ActivityTypes
} from '../services/userHistoryService.js';

const router = express.Router();

/**
 * POST /api/history/track
 * Track a user activity
 */
router.post('/track', async (req, res) => {
  try {
    const {
      userId,
      userEmail,
      activityType,
      activityDetails,
      metadata
    } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'activityType']
      });
    }

    // Add request metadata
    const enrichedMetadata = {
      ...metadata,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    };

    const result = await saveUserActivity({
      userId,
      userEmail,
      activityType,
      activityDetails,
      metadata: enrichedMetadata
    });

    res.json({
      success: true,
      message: 'Activity tracked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({
      error: 'Failed to track activity',
      message: error.message
    });
  }
});

/**
 * POST /api/history/track-batch
 * Track multiple activities at once
 */
router.post('/track-batch', async (req, res) => {
  try {
    const { activities } = req.body;

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        error: 'activities must be a non-empty array'
      });
    }

    const results = [];
    const errors = [];

    for (const activity of activities) {
      try {
        const enrichedMetadata = {
          ...activity.metadata,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress
        };

        const result = await saveUserActivity({
          ...activity,
          metadata: enrichedMetadata
        });

        results.push(result);
      } catch (error) {
        errors.push({
          activity,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Tracked ${results.length} activities`,
      tracked: results.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error tracking batch activities:', error);
    res.status(500).json({
      error: 'Failed to track batch activities',
      message: error.message
    });
  }
});

/**
 * GET /api/history/:userId
 * Get user activity history
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 50,
      startDate,
      endDate,
      activityType,
      lastEvaluatedKey
    } = req.query;

    const result = await getUserHistory(userId, {
      limit: parseInt(limit),
      startDate,
      endDate,
      activityType,
      lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
    });

    res.json({
      success: true,
      userId,
      ...result
    });

  } catch (error) {
    console.error('Error getting user history:', error);
    res.status(500).json({
      error: 'Failed to get user history',
      message: error.message
    });
  }
});

/**
 * GET /api/history/:userId/stats
 * Get user activity statistics
 */
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const stats = await getUserActivityStats(userId, parseInt(days));

    res.json({
      success: true,
      userId,
      period: `${days} days`,
      stats
    });

  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({
      error: 'Failed to get activity stats',
      message: error.message
    });
  }
});

/**
 * GET /api/history/:userId/summary/:activityType
 * Get summary for specific activity type
 */
router.get('/:userId/summary/:activityType', async (req, res) => {
  try {
    const { userId, activityType } = req.params;
    const { days = 7 } = req.query;

    const summary = await getActivitySummary(userId, activityType, parseInt(days));

    res.json({
      success: true,
      userId,
      summary
    });

  } catch (error) {
    console.error('Error getting activity summary:', error);
    res.status(500).json({
      error: 'Failed to get activity summary',
      message: error.message
    });
  }
});

/**
 * GET /api/history/admin/recent
 * Get recent activities across all users (admin only)
 */
router.get('/admin/recent', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const result = await getRecentActivities(parseInt(limit));

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error getting recent activities:', error);
    res.status(500).json({
      error: 'Failed to get recent activities',
      message: error.message
    });
  }
});

/**
 * GET /api/history/activity-types
 * Get list of available activity types
 */
router.get('/activity-types', (req, res) => {
  res.json({
    success: true,
    activityTypes: ActivityTypes,
    categories: {
      learning: [
        ActivityTypes.AI_CHAT,
        ActivityTypes.QUIZ_ATTEMPT,
        ActivityTypes.VIDEO_WATCH,
        ActivityTypes.BOOK_READ,
        ActivityTypes.BOOK_DOWNLOAD,
        ActivityTypes.VISUALIZATION_VIEW
      ],
      study: [
        ActivityTypes.STUDY_SESSION,
        ActivityTypes.PREDICTION_VIEW,
        ActivityTypes.PERFORMANCE_CHECK
      ],
      teacher: [
        ActivityTypes.CONTENT_GENERATE,
        ActivityTypes.QUESTION_GENERATE,
        ActivityTypes.HOMEWORK_CREATE
      ],
      health: [
        ActivityTypes.HEALTH_LOG,
        ActivityTypes.DISCIPLINE_UPDATE,
        ActivityTypes.STREAK_UPDATE,
        ActivityTypes.REWARD_UNLOCK
      ],
      simulation: [
        ActivityTypes.CAREER_SIMULATE,
        ActivityTypes.DECISION_SIMULATE
      ],
      auth: [
        ActivityTypes.LOGIN,
        ActivityTypes.LOGOUT,
        ActivityTypes.PROFILE_UPDATE
      ]
    }
  });
});

/**
 * GET /api/history/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'User History Service',
    timestamp: new Date().toISOString()
  });
});

export default router;
