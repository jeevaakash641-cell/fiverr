import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { detectLanguage, translateToEnglish, translateFromEnglish } from '../services/translateService.js';
import { getBedrockResponse } from '../services/bedrockService.js';
import { storeChatSession } from '../services/s3Service.js';

const router = express.Router();

// Supported Indian language codes for translation
const SUPPORTED_INDIAN_LANGS = new Set(['hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'or', 'as', 'ur']);

// Minimum confidence to trust language detection
const MIN_CONFIDENCE = 0.85;

/**
 * POST /api/chat
 * Main chat endpoint with translation and AI response
 */
router.post('/', async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: 'Missing required fields', message: 'Both message and userId are required' });
    }

    // Step 1: Detect language
    const detectedLanguage = await detectLanguage(message);
    console.log(`🌐 Detected: ${detectedLanguage.name} (${detectedLanguage.code}) confidence: ${detectedLanguage.confidence}`);

    // Only translate if:
    // - It's a known Indian language (not random European language)
    // - Confidence is high enough
    // - It's not already English
    const shouldTranslate = 
      detectedLanguage.code !== 'en' &&
      SUPPORTED_INDIAN_LANGS.has(detectedLanguage.code) &&
      detectedLanguage.confidence >= MIN_CONFIDENCE;

    // Step 2: Translate to English if needed
    let translatedMessage = message;
    if (shouldTranslate) {
      translatedMessage = await translateToEnglish(message, detectedLanguage.code);
      console.log(`🔄 Translated to English: ${translatedMessage}`);
    }

    // Step 3: Get AI response
    const aiResponseEnglish = await getBedrockResponse(translatedMessage);

    // Step 4: Translate response back only if we translated the input
    let finalResponse = aiResponseEnglish;
    if (shouldTranslate) {
      finalResponse = await translateFromEnglish(aiResponseEnglish, detectedLanguage.code);
      console.log(`🔄 Translated back to ${detectedLanguage.name}`);
    }

    // Step 5: Store session (fire and forget — don't block response)
    storeChatSession(userId, {
      sessionId: uuidv4(),
      userId,
      timestamp: new Date().toISOString(),
      language: { code: detectedLanguage.code, name: detectedLanguage.name, confidence: detectedLanguage.confidence },
      userMessage: { original: message, translated: translatedMessage },
      aiResponse: { english: aiResponseEnglish, translated: finalResponse }
    }).catch(err => console.error('S3 store error (non-fatal):', err));

    res.json({
      success: true,
      response: finalResponse,
      language: { code: shouldTranslate ? detectedLanguage.code : 'en', name: shouldTranslate ? detectedLanguage.name : 'English' },
      sessionId: uuidv4()
    });

  } catch (error) {
    console.error('❌ Chat endpoint error:', error);
    res.status(500).json({ error: 'Chat processing failed', message: error.message });
  }
});

export default router;
