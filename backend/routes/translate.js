/**
 * Translation API Routes
 * Handles text translation requests
 */

import express from 'express';
import { translateText, batchTranslate } from '../services/translateService.js';

const router = express.Router();

/**
 * POST /api/translate
 * Translate text to target language
 */
router.post('/', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    // Validate input
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required'
      });
    }

    // If target is same as source, return original text
    if (targetLanguage === sourceLanguage) {
      return res.json({
        success: true,
        translatedText: text,
        sourceLanguage,
        targetLanguage
      });
    }

    // Translate
    const result = await translateText(text, targetLanguage, sourceLanguage);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/translate/batch
 * Translate multiple texts
 */
router.post('/batch', async (req, res) => {
  try {
    const { texts, targetLanguage, sourceLanguage = 'en' } = req.body;

    // Validate input
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({
        success: false,
        error: 'Texts array is required'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required'
      });
    }

    // Translate all texts
    const translations = await batchTranslate(texts, targetLanguage, sourceLanguage);

    res.json({
      success: true,
      translations,
      sourceLanguage,
      targetLanguage
    });

  } catch (error) {
    console.error('Batch translation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch translation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/translate/health
 * Health check for translation service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AWS Translate',
    region: process.env.AWS_REGION || 'us-east-1'
  });
});

export default router;
