import { getBedrockResponse } from './bedrockService.js';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

let bedrockClient = null;

function getBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
  }
  return bedrockClient;
}

/**
 * Helper function to call Bedrock with structured prompts
 */
async function callBedrockStructured(prompt) {
  try {
    const client = getBedrockClient();
    
    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'google.gemma-3-12b-it',
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 2000,
        temperature: 0.7,
        topP: 0.9
      }
    });

    const response = await client.send(command);
    const resultText = response.output?.message?.content?.[0]?.text || '{}';
    let cleaned = resultText
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('❌ Bedrock structured call error:', error);
    throw new Error(`AI service error: ${error.message}`);
  }
}

/**
 * Calculates deterministic base score using mathematical analysis
 * This provides a reference point for AI to refine
 */
function calculateBaseScore(studentData) {
  const marks = studentData.current_marks || {};
  const studyTime = studentData.study_time_hours || {};
  const attendance = studentData.attendance_percent || 0;
  const assignmentCompletion = studentData.assignment_completion || 0;

  // 1. Calculate average marks
  const markValues = Object.values(marks);
  const averageMarks = markValues.length > 0
    ? markValues.reduce((sum, mark) => sum + mark, 0) / markValues.length
    : 0;

  // 2. Calculate attendance boost/penalty
  // Attendance above 85% adds up to +5 points
  // Attendance below 75% subtracts up to -10 points
  let attendanceBoost = 0;
  if (attendance >= 85) {
    attendanceBoost = ((attendance - 85) / 15) * 5; // 0 to +5
  } else if (attendance < 75) {
    attendanceBoost = ((attendance - 75) / 10) * 10; // -10 to 0
  }

  // 3. Calculate study consistency score
  // Measures if student studies all subjects evenly
  const studyHours = Object.values(studyTime);
  let consistencyScore = 0;
  if (studyHours.length > 0) {
    const avgStudyTime = studyHours.reduce((sum, h) => sum + h, 0) / studyHours.length;
    const variance = studyHours.reduce((sum, h) => sum + Math.pow(h - avgStudyTime, 2), 0) / studyHours.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = more consistent = better
    // Consistency adds 0 to +5 points
    consistencyScore = Math.max(0, 5 - (stdDev * 2));
  }

  // 4. Calculate assignment completion boost
  // Completion above 85% adds up to +5 points
  // Completion below 70% subtracts up to -5 points
  let assignmentBoost = 0;
  if (assignmentCompletion >= 85) {
    assignmentBoost = ((assignmentCompletion - 85) / 15) * 5; // 0 to +5
  } else if (assignmentCompletion < 70) {
    assignmentBoost = ((assignmentCompletion - 70) / 20) * 5; // -5 to 0
  }

  // 5. Calculate total study time factor
  // More study time generally correlates with better performance
  const totalStudyHours = studyHours.reduce((sum, h) => sum + h, 0);
  let studyTimeBoost = 0;
  if (totalStudyHours > 0) {
    // Optimal study time is around 2-3 hours per subject
    const optimalTotal = Object.keys(marks).length * 2.5;
    if (totalStudyHours >= optimalTotal) {
      studyTimeBoost = 3; // Good study time
    } else if (totalStudyHours >= optimalTotal * 0.7) {
      studyTimeBoost = 1; // Moderate study time
    } else {
      studyTimeBoost = -2; // Insufficient study time
    }
  }

  // Calculate base score
  let baseScore = averageMarks + attendanceBoost + consistencyScore + assignmentBoost + studyTimeBoost;
  
  // Ensure score is within valid range
  baseScore = Math.max(0, Math.min(100, baseScore));

  return {
    base_score: Math.round(baseScore * 10) / 10, // Round to 1 decimal
    components: {
      average_marks: Math.round(averageMarks * 10) / 10,
      attendance_boost: Math.round(attendanceBoost * 10) / 10,
      consistency_score: Math.round(consistencyScore * 10) / 10,
      assignment_boost: Math.round(assignmentBoost * 10) / 10,
      study_time_boost: Math.round(studyTimeBoost * 10) / 10
    },
    total_study_hours: Math.round(totalStudyHours * 10) / 10
  };
}

/**
 * Predicts exam score based on current performance and study patterns
 * Uses hybrid deterministic + AI model for improved accuracy
 */
export async function predictExamScore(studentData) {
  // Calculate deterministic base score
  const calculation = calculateBaseScore(studentData);
  
  console.log('📊 Base score calculation:', calculation);

  const prompt = `You are an AI academic performance predictor with expertise in educational psychology. Analyze this student data and predict their likely exam score.

Student Performance Data:
- Current Marks: ${JSON.stringify(studentData.current_marks || {})}
- Daily Study Time (hours): ${JSON.stringify(studentData.study_time_hours || {})}
- Attendance: ${studentData.attendance_percent || 0}%
- Assignment Completion: ${studentData.assignment_completion || 0}%

Deterministic Base Score Analysis:
- Calculated Base Score: ${calculation.base_score}
- Average Current Marks: ${calculation.components.average_marks}
- Attendance Impact: ${calculation.components.attendance_boost > 0 ? '+' : ''}${calculation.components.attendance_boost}
- Study Consistency: +${calculation.components.consistency_score}
- Assignment Impact: ${calculation.components.assignment_boost > 0 ? '+' : ''}${calculation.components.assignment_boost}
- Study Time Impact: ${calculation.components.study_time_boost > 0 ? '+' : ''}${calculation.components.study_time_boost}
- Total Study Hours: ${calculation.total_study_hours}

IMPORTANT: Use the base_score (${calculation.base_score}) as a reference point, but apply your reasoning to adjust it based on:
1. Study patterns and consistency
2. Subject-specific performance trends
3. Attendance and engagement indicators
4. Assignment completion quality
5. Time management effectiveness

Your prediction should be within ±10 points of the base score unless there are strong reasons to deviate further.

Provide prediction in this JSON format:
{
    "predicted_score": <number 0-100>,
    "confidence": "<high/medium/low>",
    "prediction_range": {"min": <number>, "max": <number>},
    "reasoning": "<brief explanation of how you adjusted from base score>"
}

Only return valid JSON, no other text.`;

  return await callBedrockStructured(prompt);
}

/**
 * Calculates risk level deterministically for each subject
 */
function calculateRiskLevels(studentData) {
  const marks = studentData.current_marks || {};
  const studyTime = studentData.study_time_hours || {};
  const weakTopics = studentData.weak_topics || {};

  const riskAnalysis = {};

  Object.keys(marks).forEach(subject => {
    const score = marks[subject];
    const hours = studyTime[subject] || 0;
    const weakCount = (weakTopics[subject] || []).length;

    // Calculate risk score (0-100, higher = more risk)
    let riskScore = 0;

    // Score factor (weight: 50%)
    if (score < 40) riskScore += 50;
    else if (score < 50) riskScore += 40;
    else if (score < 60) riskScore += 30;
    else if (score < 70) riskScore += 15;

    // Study time factor (weight: 25%)
    if (hours < 1) riskScore += 25;
    else if (hours < 1.5) riskScore += 15;
    else if (hours < 2) riskScore += 5;

    // Weak topics factor (weight: 25%)
    if (weakCount >= 4) riskScore += 25;
    else if (weakCount >= 3) riskScore += 20;
    else if (weakCount >= 2) riskScore += 15;
    else if (weakCount >= 1) riskScore += 10;

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 35) riskLevel = 'medium';

    riskAnalysis[subject] = {
      risk_score: riskScore,
      risk_level: riskLevel,
      current_score: score,
      study_hours: hours,
      weak_topic_count: weakCount
    };
  });

  return riskAnalysis;
}

/**
 * Identifies subjects at risk and provides actionable insights
 * Uses hybrid deterministic + AI model
 */
export async function analyzeRiskSubjects(studentData) {
  // Calculate deterministic risk levels
  const riskAnalysis = calculateRiskLevels(studentData);
  
  console.log('⚠️ Risk analysis calculation:', riskAnalysis);

  // Filter to only at-risk subjects (medium or high risk)
  const atRiskSubjects = Object.entries(riskAnalysis)
    .filter(([_, data]) => data.risk_level !== 'low')
    .map(([subject, data]) => ({
      subject,
      ...data
    }));

  if (atRiskSubjects.length === 0) {
    return []; // No subjects at risk
  }

  const prompt = `You are an AI academic advisor. Analyze this student's performance and provide detailed recommendations for at-risk subjects.

Student Data:
- Current Marks: ${JSON.stringify(studentData.current_marks || {})}
- Study Time per Subject: ${JSON.stringify(studentData.study_time_hours || {})}
- Weak Topics: ${JSON.stringify(studentData.weak_topics || {})}

Deterministic Risk Analysis:
${atRiskSubjects.map(s => `- ${s.subject}: Risk Score ${s.risk_score}/100 (${s.risk_level} risk), Current: ${s.current_score}%, Study: ${s.study_hours}h, Weak Topics: ${s.weak_topic_count}`).join('\n')}

IMPORTANT: Use the calculated risk levels as a baseline, but apply your expertise to:
1. Identify specific weak areas that need attention
2. Provide actionable, personalized recommendations
3. Consider the relationship between study time and performance
4. Suggest realistic improvement strategies

For each at-risk subject, provide detailed analysis. Return JSON array:
[
    {
        "subject": "<subject_name>",
        "risk_level": "<high/medium/low>",
        "current_score": <number>,
        "weak_areas": ["<topic1>", "<topic2>"],
        "recommended_action": "<specific actionable advice>"
    }
]

Only return valid JSON array, no other text.`;

  return await callBedrockStructured(prompt);
}

/**
 * Calculates projected improvement deterministically
 */
function calculateProjectedImprovement(studentData, improvementScenario) {
  const currentMarks = studentData.current_marks || {};
  const currentStudyTime = studentData.study_time_hours || {};
  const newStudyTime = improvementScenario.increased_study_time || {};

  const projections = {};

  Object.keys(currentMarks).forEach(subject => {
    const currentScore = currentMarks[subject];
    const currentHours = currentStudyTime[subject] || 0;
    const newHours = newStudyTime[subject] || currentHours;
    
    // Calculate study time increase percentage
    const increasePercent = currentHours > 0 
      ? ((newHours - currentHours) / currentHours) * 100 
      : 0;

    // Calculate potential improvement
    // Formula: improvement = (100 - current_score) * efficiency_factor
    // Efficiency decreases with higher scores (harder to improve from 90 than from 60)
    let efficiencyFactor = 0;
    
    if (increasePercent > 0) {
      // Base efficiency: 0.3 (30% of gap can be closed)
      efficiencyFactor = 0.3;
      
      // Adjust based on current score
      if (currentScore < 50) efficiencyFactor = 0.4; // Easier to improve from low scores
      else if (currentScore > 80) efficiencyFactor = 0.2; // Harder to improve from high scores
      
      // Adjust based on study time increase
      if (increasePercent >= 50) efficiencyFactor += 0.1; // Significant increase
      else if (increasePercent >= 25) efficiencyFactor += 0.05; // Moderate increase
    }

    const potentialGain = (100 - currentScore) * efficiencyFactor;
    const projectedScore = Math.min(95, currentScore + potentialGain); // Cap at 95

    projections[subject] = {
      current_score: currentScore,
      projected_score: Math.round(projectedScore * 10) / 10,
      improvement: Math.round(potentialGain * 10) / 10,
      improvement_percent: Math.round((potentialGain / currentScore) * 100 * 10) / 10,
      study_increase_percent: Math.round(increasePercent * 10) / 10
    };
  });

  // Calculate timeline based on average improvement needed
  const avgImprovement = Object.values(projections)
    .reduce((sum, p) => sum + p.improvement, 0) / Object.keys(projections).length;
  
  let timeline = '4-6 weeks';
  if (avgImprovement < 5) timeline = '2-3 weeks';
  else if (avgImprovement < 10) timeline = '3-4 weeks';
  else if (avgImprovement > 15) timeline = '6-8 weeks';

  return {
    projections,
    timeline,
    average_improvement: Math.round(avgImprovement * 10) / 10
  };
}

/**
 * Simulates what happens if student increases study effort
 * Uses hybrid deterministic + AI model
 */
export async function simulateImprovement(studentData, improvementScenario) {
  // Calculate deterministic projections
  const calculation = calculateProjectedImprovement(studentData, improvementScenario);
  
  console.log('🎯 Improvement calculation:', calculation);

  const prompt = `You are an AI study planner with expertise in learning optimization. Simulate the impact of increased study effort on exam scores.

Current Performance:
- Marks: ${JSON.stringify(studentData.current_marks || {})}
- Study Time: ${JSON.stringify(studentData.study_time_hours || {})}

Improvement Plan:
- New Study Time: ${JSON.stringify(improvementScenario.increased_study_time || {})}
- Focus Topics: ${JSON.stringify(improvementScenario.focus_on_topics || [])}

Deterministic Projection Analysis:
${Object.entries(calculation.projections).map(([subject, data]) => 
  `- ${subject}: ${data.current_score}% → ${data.projected_score}% (+${data.improvement}%, study +${data.study_increase_percent}%)`
).join('\n')}
- Estimated Timeline: ${calculation.timeline}
- Average Improvement: ${calculation.average_improvement} points

IMPORTANT: Use the calculated projections as a baseline, but apply your expertise to:
1. Consider the quality of study time, not just quantity
2. Account for focus topics and their difficulty
3. Evaluate the realism of the timeline
4. Identify key success factors
5. Assess probability of success

Your projections should be within ±5 points of the calculated values unless there are strong reasons to deviate.

Predict the outcome in this JSON format:
{
    "projected_scores": {"subject": <new_score>},
    "improvement_percent": {"subject": <percent_increase>},
    "timeline": "<estimated weeks>",
    "success_probability": "<high/medium/low>",
    "key_factors": ["<factor1>", "<factor2>"]
}

Only return valid JSON, no other text.`;

  return await callBedrockStructured(prompt);
}
