import express from 'express';
import { getEmotionAwareResponse } from '../services/emotionAwareService.js';

const router = express.Router();

/**
 * POST /api/emotion-aware/chat
 * Get emotion-aware AI response
 */
router.post('/chat', async (req, res) => {
  try {
    const { question, emotion, confidence, userContext } = req.body;

    // Validation
    if (!question) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'question is required'
      });
    }

    if (!emotion) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'emotion is required'
      });
    }

    if (confidence === undefined || confidence === null) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'confidence is required'
      });
    }

    console.log('🎭 Emotion-aware chat request:', {
      question: question.substring(0, 50) + '...',
      emotion,
      confidence
    });

    const result = await getEmotionAwareResponse(question, emotion, confidence, userContext);

    res.json(result);

  } catch (error) {
    console.error('❌ Emotion-aware chat error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      message: error.message
    });
  }
});

export default router;
