/**
 * Help Topics API Routes — One Community Ely
 * Manages "What would you most like help with?" learner dropdown options
 */

import express from 'express';
import {
  getAllHelpTopics,
  getHelpTopicById,
  createHelpTopic,
  updateHelpTopic,
  deleteHelpTopic
} from '../services/helpTopicService.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * 1. GET /api/help-topics
 * Fetch active help topics for learners (Public)
 */
router.get('/', async (req, res) => {
  try {
    const topics = await getAllHelpTopics(false);
    res.json({
      success: true,
      topics
    });
  } catch (err) {
    console.error('GET /api/help-topics error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help topics: ' + err.message
    });
  }
});

/**
 * 2. GET /api/help-topics/admin
 * Fetch all help topics including inactive ones (Admin only)
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const topics = await getAllHelpTopics(true);
    res.json({
      success: true,
      topics
    });
  } catch (err) {
    console.error('GET /api/help-topics/admin error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin help topics: ' + err.message
    });
  }
});

/**
 * 3. POST /api/help-topics
 * Create a new help topic (Admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { label, category, description, keywords, orderIndex, isActive } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Topic label is required'
      });
    }

    const createdBy = req.adminUser?.email || 'admin';
    const topic = await createHelpTopic({
      label,
      category,
      description,
      keywords,
      orderIndex,
      isActive
    }, createdBy);

    console.log(`✅ Help topic created:`, topic.topicId, topic.label);
    res.status(201).json({
      success: true,
      message: 'Help topic created successfully',
      topic
    });
  } catch (err) {
    console.error('POST /api/help-topics error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create help topic: ' + err.message
    });
  }
});

/**
 * 4. PUT /api/help-topics/:topicId
 * Update an existing help topic (Admin only)
 */
router.put('/:topicId', requireAdmin, async (req, res) => {
  try {
    const { topicId } = req.params;
    const updated = await updateHelpTopic(topicId, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Topic "${topicId}" not found`
      });
    }

    console.log(`✅ Help topic updated:`, topicId, updated.label);
    res.json({
      success: true,
      message: 'Help topic updated successfully',
      topic: updated
    });
  } catch (err) {
    console.error(`PUT /api/help-topics/${req.params.topicId} error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to update help topic: ' + err.message
    });
  }
});

/**
 * 5. DELETE /api/help-topics/:topicId
 * Delete a help topic (Admin only)
 */
router.delete('/:topicId', requireAdmin, async (req, res) => {
  try {
    const { topicId } = req.params;
    const deleted = await deleteHelpTopic(topicId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Topic "${topicId}" not found`
      });
    }

    console.log(`✅ Help topic deleted:`, topicId, deleted.label);
    res.json({
      success: true,
      message: `Help topic "${deleted.label}" deleted successfully`,
      topic: deleted
    });
  } catch (err) {
    console.error(`DELETE /api/help-topics/${req.params.topicId} error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete help topic: ' + err.message
    });
  }
});

export default router;
