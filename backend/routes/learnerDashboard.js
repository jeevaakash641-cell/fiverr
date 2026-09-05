/**
 * Learner Dashboard Routes
 * One Community Ely Online Training Centre
 */

import express from 'express';
import { getLearnerDashboardSummary } from '../services/learnerDashboardService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/learner-dashboard/summary
 * Authoritative summary of all learner progress, next actions, pending tasks, certificates & achievements
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const result = await getLearnerDashboardSummary(req.user);
    res.status(200).json(result);
  } catch (err) {
    console.error('GET /api/learner-dashboard/summary error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to load learner dashboard summary'
    });
  }
});

export default router;
