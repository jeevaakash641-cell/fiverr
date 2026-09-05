import express from 'express';
import { getBedrockResponse } from '../services/bedrockService.js';

const router = express.Router();

const QUIZ_SYSTEM_PROMPT = `You are a quiz generator for Indian school students. Return ONLY a valid JSON array. No markdown, no code blocks, no explanation. Just the raw JSON array starting with [ and ending with ].`;

// Languages that are themselves regional language subjects
const REGIONAL_LANGUAGE_SUBJECTS = [
  'Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam', 'Bengali',
  'Marathi', 'Gujarati', 'Punjabi', 'Odia', 'Assamese', 'Urdu',
  'Sanskrit', 'Mizo', 'Manipuri', 'Konkani', 'Nepali',
  'Regional Language', 'Language I (Regional)', 'Language I'
];

/**
 * Determine the language questions should be asked in.
 * Rule:
 *   - If subject IS a regional language → always use that language
 *   - Otherwise → use the student's medium language (e.g. Tamil Medium → Tamil)
 *   - If medium is English → use English
 */
function resolveQuestionLanguage(subject, language, stateLanguage) {
  const subjectClean = (subject || '').trim();

  // Check if the subject itself is a regional language
  const isRegionalSubject = REGIONAL_LANGUAGE_SUBJECTS.some(
    lang => subjectClean.toLowerCase() === lang.toLowerCase()
  );

  if (isRegionalSubject) {
    // Use the subject name as the language (e.g. subject "Tamil" → questions in Tamil)
    // If subject is generic "Regional Language", fall back to stateLanguage
    if (subjectClean.toLowerCase().includes('regional') || subjectClean.toLowerCase().includes('language i')) {
      return stateLanguage || 'Tamil';
    }
    return subjectClean;
  }

  // For all other subjects, use the student's medium language
  return language || 'English';
}

/**
 * POST /api/quiz/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { subject, numQuestions, difficulty, language, description } = req.body;

    if (!subject || !numQuestions) {
      return res.status(400).json({ error: 'subject and numQuestions are required' });
    }

    const diff = difficulty || 'medium';
    const count = Math.min(parseInt(numQuestions), 20);
    const questionLang = language || 'English';

    const prompt = `Generate ${count} ${diff} difficulty multiple-choice quiz questions to test a learner's knowledge and practical understanding of "${subject}"${description ? ` (${description})` : ''}.

Language: ${questionLang}
Requirements:
- Questions must be practical, clear, realistic, and engaging for adult learners & community members.
- Questions should test real-world scenarios, best practices, and core concepts in ${subject}.
- Each question must have exactly 4 distinct options (A, B, C, D).
- "correct" is the 0-based index (0, 1, 2, or 3) of the correct option.
- "explanation" should be 1-2 helpful sentences explaining why the answer is correct and providing a useful takeaway.

Return ONLY a valid JSON array starting with [ and ending with ]:
[{"id":1,"question":"...","options":["option1","option2","option3","option4"],"correct":0,"explanation":"..."}]`;

    const raw = await getBedrockResponse(prompt, {
      maxTokens: 1600,
      temperature: 0.4,
      systemPrompt: `You are an expert training educator and quiz generator for community education and professional development. Return ONLY a valid JSON array. No markdown, no code blocks.`,
    });

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in AI response');

    const questions = JSON.parse(match[0]);
    const valid = questions.filter(q =>
      q.question &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correct === 'number' &&
      q.correct >= 0 && q.correct < 4
    );

    if (!valid.length) throw new Error('No valid questions generated');

    res.json({ success: true, questions: valid, language: questionLang });
  } catch (error) {
    console.error('❌ Quiz generation error:', error);
    res.status(500).json({ error: 'Quiz generation failed', message: error.message });
  }
});

export default router;
