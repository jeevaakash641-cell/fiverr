import express from 'express';
import { getBedrockResponse, CLEAR_EXPLANATION_PROMPT } from '../services/bedrockService.js';

const router = express.Router();

/**
 * POST /api/ai/ask
 * Fast AI endpoint — skips language detection and translation.
 * Used by Math Calculator, Subject Helper, AI Assistant for English prompts.
 * Accepts optional maxTokens, systemPrompt, context, and history overrides.
 */
router.post('/ask', async (req, res) => {
  try {
    const { message, systemPrompt, maxTokens, context, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const response = await getBedrockResponse(message, {
      maxTokens: maxTokens || 1500,
      temperature: 0.7,
      systemPrompt: systemPrompt || CLEAR_EXPLANATION_PROMPT,
      context: context || null,
      history: Array.isArray(history) ? history : []
    });

    res.json({ success: true, response });
  } catch (error) {
    console.error('❌ AI ask error:', error);
    res.status(500).json({ error: 'AI request failed', message: error.message });
  }
});

export default router;
