import express from 'express';
import {
  generateEducationalMaterials,
  generateQuestionPaper,
  generateSimplifiedNotes,
  generateHomework
} from '../services/teacherAssistantService.js';

const router = express.Router();

/**
 * POST /api/teacher-assistant/generate
 * Generate comprehensive educational materials (questions, notes, homework)
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('📚 Teacher Assistant - Generate materials request');
    console.log('Request body:', req.body);

    const { topic, gradeLevel, difficulty, weakAreas } = req.body;

    // Validation
    if (!topic || !gradeLevel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'topic and gradeLevel are required'
      });
    }

    // Set defaults
    const params = {
      topic,
      gradeLevel,
      difficulty: difficulty || 'medium',
      weakAreas: weakAreas || []
    };

    // Generate materials
    const materials = await generateEducationalMaterials(params);

    res.json({
      success: true,
      data: materials,
      metadata: {
        topic,
        gradeLevel,
        difficulty: params.difficulty,
        weakAreas: params.weakAreas,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating materials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate educational materials',
      message: error.message
    });
  }
});

/**
 * POST /api/teacher-assistant/questions
 * Generate question paper only
 */
router.post('/questions', async (req, res) => {
  try {
    console.log('📝 Teacher Assistant - Generate questions request');

    const { topic, gradeLevel, difficulty, questionCount } = req.body;

    if (!topic || !gradeLevel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'topic and gradeLevel are required'
      });
    }

    const questions = await generateQuestionPaper({
      topic,
      gradeLevel,
      difficulty: difficulty || 'medium',
      questionCount: questionCount || 5
    });

    res.json({
      success: true,
      data: {
        questionPaper: questions,
        totalQuestions: questions.length,
        totalMarks: questions.reduce((sum, q) => sum + (q.marks || 0), 0)
      },
      metadata: {
        topic,
        gradeLevel,
        difficulty: difficulty || 'medium',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate questions',
      message: error.message
    });
  }
});

/**
 * POST /api/teacher-assistant/notes
 * Generate simplified notes only
 */
router.post('/notes', async (req, res) => {
  try {
    console.log('📖 Teacher Assistant - Generate notes request');

    const { topic, gradeLevel, weakAreas } = req.body;

    if (!topic || !gradeLevel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'topic and gradeLevel are required'
      });
    }

    const notes = await generateSimplifiedNotes({
      topic,
      gradeLevel,
      weakAreas: weakAreas || []
    });

    res.json({
      success: true,
      data: {
        simplifiedNotes: notes,
        wordCount: notes.split(/\s+/).length
      },
      metadata: {
        topic,
        gradeLevel,
        weakAreas: weakAreas || [],
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate notes',
      message: error.message
    });
  }
});

/**
 * POST /api/teacher-assistant/homework
 * Generate homework assignments only
 */
router.post('/homework', async (req, res) => {
  try {
    console.log('📚 Teacher Assistant - Generate homework request');

    const { topic, gradeLevel } = req.body;

    if (!topic || !gradeLevel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'topic and gradeLevel are required'
      });
    }

    const homework = await generateHomework({
      topic,
      gradeLevel
    });

    res.json({
      success: true,
      data: {
        homework,
        totalQuestions: {
          easy: homework.easy?.length || 0,
          medium: homework.medium?.length || 0,
          hard: homework.hard?.length || 0
        }
      },
      metadata: {
        topic,
        gradeLevel,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating homework:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate homework',
      message: error.message
    });
  }
});

/**
 * GET /api/teacher-assistant/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Teacher Assistant',
    status: 'operational',
    endpoints: {
      generate: 'POST /api/teacher-assistant/generate',
      questions: 'POST /api/teacher-assistant/questions',
      notes: 'POST /api/teacher-assistant/notes',
      homework: 'POST /api/teacher-assistant/homework'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
