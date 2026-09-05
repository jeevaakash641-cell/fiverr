import express from 'express';
import { getBedrockResponse } from '../services/bedrockService.js';

const router = express.Router();

/**
 * POST /api/ai/ask
 * Fast AI endpoint — skips language detection and translation.
 * Used by Math Calculator, Subject Helper, AI Assistant for English prompts.
 * Accepts optional maxTokens and systemPrompt overrides.
 */
router.post('/ask', async (req, res) => {
  try {
    const { message, systemPrompt, maxTokens } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const response = await getBedrockResponse(message, {
      maxTokens: maxTokens || 1500,
      temperature: 0.7,
      systemPrompt: systemPrompt || `You are a helpful AI tutor for One Community Ely students (Classes 1-12). 
Provide clear, step-by-step explanations. Use simple language appropriate for the student's level.
For mathematics, show all working steps clearly. For other subjects, use examples and analogies.

CRITICAL QUIZ / EXAM RULE:
When a user asks for a quiz, exam, test, or practice questions:
- Provide ONLY the questions and multiple-choice options.
- NEVER include the answers, solutions, answer keys, or explanations in the same message!
- Ask the student to reply with their answers, and only evaluate and explain them after they submit their answers.`,
    });

    res.json({ success: true, response });
  } catch (error) {
    console.error('❌ AI ask error:', error);
    res.status(500).json({ error: 'AI request failed', message: error.message });
  }
});

export default router;
