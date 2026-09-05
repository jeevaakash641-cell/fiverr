/**
 * Notification API Routes — One Community Ely Online Training Centre
 * Endpoints for authenticated learners to retrieve and manage their notifications.
 */

import express from 'express';
import {
  getLearnerNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/notificationService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * 1. GET /api/notifications
 * Fetch all notifications for the authenticated learner
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const learnerEmail = req.user.email;
    const notifications = await getLearnerNotifications(learnerEmail, unreadOnly);
    const unreadCount = notifications.filter(n => !n.read).length;

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read
 */
router.patch('/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const learnerEmail = req.user.email;

    const updated = await markNotificationAsRead(notificationId, learnerEmail);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Notification not found or access denied.' });
    }

    res.status(200).json({
      success: true,
      notification: updated
    });
  } catch (err) {
    console.error('PATCH /api/notifications/:notificationId/read error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 3. POST /api/notifications/read-all
 * Mark all notifications for the learner as read
 */
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const learnerEmail = req.user.email;
    const count = await markAllNotificationsAsRead(learnerEmail);

    res.status(200).json({
      success: true,
      message: `Marked ${count} notifications as read.`
    });
  } catch (err) {
    console.error('POST /api/notifications/read-all error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
