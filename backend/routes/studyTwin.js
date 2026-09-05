import express from 'express';
import { predictExamScore, analyzeRiskSubjects, simulateImprovement } from '../services/studyTwinService.js';
import { savePrediction, saveRiskAnalysis, saveSimulation, getPredictionHistory, getPredictionStats } from '../services/predictionStorageService.js';

const router = express.Router();

/**
 * POST /api/study-twin/predict
 * Predicts exam score based on current performance
 */
router.post('/predict', async (req, res) => {
  try {
    const studentData = req.body;
    
    // Validation
    if (!studentData.current_marks || !studentData.study_time_hours) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'current_marks and study_time_hours are required'
      });
    }

    console.log('📊 Predicting exam score for student data:', studentData);

    const prediction = await predictExamScore(studentData);

    // Save to DynamoDB (non-blocking, don't fail if DB fails)
    const studentId = studentData.studentId || studentData.userId || 'anonymous';
    savePrediction(studentId, {
      prediction: prediction,
      studentData: studentData
    }).catch(err => {
      console.error('⚠️ Failed to save prediction to DB (non-critical):', err.message);
    });

    res.json({
      success: true,
      prediction
    });

  } catch (error) {
    console.error('❌ Predict endpoint error:', error);
    res.status(500).json({
      error: 'Prediction failed',
      message: error.message
    });
  }
});

/**
 * POST /api/study-twin/risk
 * Analyzes risk subjects and provides recommendations
 */
router.post('/risk', async (req, res) => {
  try {
    const studentData = req.body;
    
    // Validation
    if (!studentData.current_marks) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'current_marks is required'
      });
    }

    console.log('⚠️ Analyzing risk subjects for student data:', studentData);

    const riskAnalysis = await analyzeRiskSubjects(studentData);

    // Save to DynamoDB (non-blocking)
    const studentId = studentData.studentId || studentData.userId || 'anonymous';
    saveRiskAnalysis(studentId, {
      risk_subjects: riskAnalysis,
      studentData: studentData
    }).catch(err => {
      console.error('⚠️ Failed to save risk analysis to DB (non-critical):', err.message);
    });

    res.json({
      success: true,
      risk_subjects: riskAnalysis
    });

  } catch (error) {
    console.error('❌ Risk analysis endpoint error:', error);
    res.status(500).json({
      error: 'Risk analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/study-twin/simulate
 * Simulates improvement scenarios
 */
router.post('/simulate', async (req, res) => {
  try {
    const { student_data, improvement_scenario } = req.body;
    
    // Validation
    if (!student_data || !improvement_scenario) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'student_data and improvement_scenario are required'
      });
    }

    if (!student_data.current_marks || !improvement_scenario.increased_study_time) {
      return res.status(400).json({
        error: 'Invalid data structure',
        message: 'student_data must have current_marks, improvement_scenario must have increased_study_time'
      });
    }

    console.log('🎯 Simulating improvement scenario:', { student_data, improvement_scenario });

    const simulation = await simulateImprovement(student_data, improvement_scenario);

    // Save to DynamoDB (non-blocking)
    const studentId = student_data.studentId || student_data.userId || 'anonymous';
    saveSimulation(studentId, {
      simulation: simulation,
      studentData: student_data,
      improvementScenario: improvement_scenario
    }).catch(err => {
      console.error('⚠️ Failed to save simulation to DB (non-critical):', err.message);
    });

    res.json({
      success: true,
      simulation
    });

  } catch (error) {
    console.error('❌ Simulation endpoint error:', error);
    res.status(500).json({
      error: 'Simulation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/study-twin/history/:studentId
 * Retrieves prediction history for a student
 */
router.get('/history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    if (!studentId || studentId === 'undefined' || studentId === 'null') {
      return res.status(400).json({
        error: 'Invalid student ID',
        message: 'studentId is required'
      });
    }

    console.log('📜 Fetching prediction history for:', studentId);

    const history = await getPredictionHistory(studentId, limit);
    const stats = await getPredictionStats(studentId);

    res.json({
      success: true,
      studentId,
      history,
      stats,
      count: history.length
    });

  } catch (error) {
    console.error('❌ History endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      message: error.message
    });
  }
});

/**
 * GET /api/study-twin/stats/:studentId
 * Retrieves prediction statistics for a student
 */
router.get('/stats/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId || studentId === 'undefined' || studentId === 'null') {
      return res.status(400).json({
        error: 'Invalid student ID',
        message: 'studentId is required'
      });
    }

    console.log('📈 Fetching prediction stats for:', studentId);

    const stats = await getPredictionStats(studentId);

    res.json({
      success: true,
      studentId,
      stats
    });

  } catch (error) {
    console.error('❌ Stats endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve stats',
      message: error.message
    });
  }
});

export default router;
