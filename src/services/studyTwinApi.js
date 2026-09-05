import { API_BASE_URL } from '../config.js';

/**
 * AI Study Twin API Service
 * Provides functions to interact with the Study Twin backend endpoints
 */

/**
 * Predicts exam score based on current performance and study patterns
 * 
 * @param {Object} studentData - Student performance data
 * @param {Object} studentData.current_marks - Current marks by subject (e.g., {math: 65, science: 72})
 * @param {Object} studentData.study_time_hours - Daily study time by subject (e.g., {math: 2, science: 1.5})
 * @param {number} studentData.attendance_percent - Attendance percentage (0-100)
 * @param {number} studentData.assignment_completion - Assignment completion percentage (0-100)
 * @returns {Promise<Object>} Prediction result with score, confidence, and range
 * 
 * @example
 * const result = await predictStudyScore({
 *   current_marks: { math: 65, science: 72, english: 80 },
 *   study_time_hours: { math: 2, science: 1.5, english: 1 },
 *   attendance_percent: 85,
 *   assignment_completion: 90
 * });
 * // Returns: { success: true, prediction: { predicted_score: 75.5, confidence: "high", ... } }
 */
export async function predictStudyScore(studentData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/study-twin/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to predict study score');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error predicting study score:', error);
    throw error;
  }
}

/**
 * Analyzes risk subjects and provides actionable recommendations
 * 
 * @param {Object} studentData - Student performance data
 * @param {Object} studentData.current_marks - Current marks by subject (e.g., {math: 45, science: 72})
 * @param {Object} studentData.study_time_hours - Daily study time by subject (e.g., {math: 1, science: 2})
 * @param {Object} studentData.weak_topics - Weak topics by subject (e.g., {math: ["algebra", "geometry"]})
 * @returns {Promise<Object>} Risk analysis with subjects, risk levels, and recommendations
 * 
 * @example
 * const result = await getRiskSubjects({
 *   current_marks: { math: 45, science: 72, english: 55 },
 *   study_time_hours: { math: 1, science: 2, english: 1 },
 *   weak_topics: { math: ["algebra", "geometry"], english: ["grammar"] }
 * });
 * // Returns: { success: true, risk_subjects: [{ subject: "math", risk_level: "high", ... }] }
 */
export async function getRiskSubjects(studentData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/study-twin/risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to analyze risk subjects');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error analyzing risk subjects:', error);
    throw error;
  }
}

/**
 * Simulates improvement scenarios based on increased study effort
 * 
 * @param {Object} studentData - Current student performance data
 * @param {Object} studentData.current_marks - Current marks by subject
 * @param {Object} studentData.study_time_hours - Current study time by subject
 * @param {Object} improvementPlan - Proposed improvement plan
 * @param {Object} improvementPlan.increased_study_time - New study time by subject
 * @param {Array<string>} improvementPlan.focus_on_topics - Topics to focus on
 * @returns {Promise<Object>} Simulation result with projected scores and timeline
 * 
 * @example
 * const result = await simulateImprovement(
 *   {
 *     current_marks: { math: 65, science: 72 },
 *     study_time_hours: { math: 2, science: 1.5 }
 *   },
 *   {
 *     increased_study_time: { math: 3, science: 2.5 },
 *     focus_on_topics: ["algebra", "physics"]
 *   }
 * );
 * // Returns: { success: true, simulation: { projected_scores: {...}, timeline: "4-6 weeks", ... } }
 */
export async function simulateImprovement(studentData, improvementPlan) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/study-twin/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        student_data: studentData,
        improvement_scenario: improvementPlan
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to simulate improvement');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error simulating improvement:', error);
    throw error;
  }
}
