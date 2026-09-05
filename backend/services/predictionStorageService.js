/**
 * Prediction Storage Service
 * Handles persistence of Study Twin predictions to AWS DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand,
  GetCommand 
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'StudyTwinPredictions';

let dynamoClient = null;
let docClient = null;

/**
 * Initialize DynamoDB client
 */
function getDynamoClient() {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });

    docClient = DynamoDBDocumentClient.from(dynamoClient);

    console.log('📦 DynamoDB client initialized:', {
      region: process.env.AWS_REGION,
      table: TABLE_NAME
    });
  }
  return docClient;
}

/**
 * Saves a prediction to DynamoDB
 * 
 * @param {string} studentId - Student identifier
 * @param {Object} predictionData - Prediction data to save
 * @param {Object} predictionData.prediction - Prediction result
 * @param {Object} predictionData.studentData - Student data used for prediction
 * @returns {Promise<Object>} Saved item
 */
export async function savePrediction(studentId, predictionData) {
  try {
    const client = getDynamoClient();
    const timestamp = Date.now();

    const item = {
      studentId,
      createdAt: timestamp,
      prediction: predictionData.prediction || null,
      studentData: predictionData.studentData || null,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    });

    await client.send(command);

    console.log('✅ Prediction saved to DynamoDB:', {
      studentId,
      timestamp,
      score: predictionData.prediction?.predicted_score
    });

    return item;
  } catch (error) {
    console.error('❌ Error saving prediction to DynamoDB:', error);
    // Don't throw - we want predictions to work even if DB fails
    return null;
  }
}

/**
 * Saves risk analysis to DynamoDB
 * 
 * @param {string} studentId - Student identifier
 * @param {Object} riskData - Risk analysis data
 * @returns {Promise<Object>} Saved item
 */
export async function saveRiskAnalysis(studentId, riskData) {
  try {
    const client = getDynamoClient();
    const timestamp = Date.now();

    const item = {
      studentId,
      createdAt: timestamp,
      type: 'risk_analysis',
      riskSubjects: riskData.risk_subjects || [],
      studentData: riskData.studentData || null,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    });

    await client.send(command);

    console.log('✅ Risk analysis saved to DynamoDB:', {
      studentId,
      timestamp,
      riskCount: riskData.risk_subjects?.length || 0
    });

    return item;
  } catch (error) {
    console.error('❌ Error saving risk analysis to DynamoDB:', error);
    return null;
  }
}

/**
 * Saves improvement simulation to DynamoDB
 * 
 * @param {string} studentId - Student identifier
 * @param {Object} simulationData - Simulation data
 * @returns {Promise<Object>} Saved item
 */
export async function saveSimulation(studentId, simulationData) {
  try {
    const client = getDynamoClient();
    const timestamp = Date.now();

    const item = {
      studentId,
      createdAt: timestamp,
      type: 'simulation',
      simulation: simulationData.simulation || null,
      studentData: simulationData.studentData || null,
      improvementScenario: simulationData.improvementScenario || null,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    });

    await client.send(command);

    console.log('✅ Simulation saved to DynamoDB:', {
      studentId,
      timestamp
    });

    return item;
  } catch (error) {
    console.error('❌ Error saving simulation to DynamoDB:', error);
    return null;
  }
}

/**
 * Retrieves prediction history for a student
 * 
 * @param {string} studentId - Student identifier
 * @param {number} limit - Maximum number of items to return (default: 10)
 * @returns {Promise<Array>} Array of predictions sorted by createdAt descending
 */
export async function getPredictionHistory(studentId, limit = 10) {
  try {
    const client = getDynamoClient();

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'studentId = :studentId',
      ExpressionAttributeValues: {
        ':studentId': studentId
      },
      ScanIndexForward: false, // Sort descending (newest first)
      Limit: limit
    });

    const response = await client.send(command);

    console.log('📊 Retrieved prediction history:', {
      studentId,
      count: response.Items?.length || 0
    });

    return response.Items || [];
  } catch (error) {
    console.error('❌ Error retrieving prediction history:', error);
    throw error;
  }
}

/**
 * Gets the latest prediction for a student
 * 
 * @param {string} studentId - Student identifier
 * @returns {Promise<Object|null>} Latest prediction or null
 */
export async function getLatestPrediction(studentId) {
  try {
    const history = await getPredictionHistory(studentId, 1);
    return history.length > 0 ? history[0] : null;
  } catch (error) {
    console.error('❌ Error retrieving latest prediction:', error);
    return null;
  }
}

/**
 * Gets prediction statistics for a student
 * 
 * @param {string} studentId - Student identifier
 * @returns {Promise<Object>} Statistics object
 */
export async function getPredictionStats(studentId) {
  try {
    const history = await getPredictionHistory(studentId, 100);

    if (history.length === 0) {
      return {
        totalPredictions: 0,
        averageScore: null,
        trend: null,
        lastPrediction: null
      };
    }

    // Filter only prediction items (not risk analysis or simulations)
    const predictions = history.filter(item => item.prediction);

    const scores = predictions
      .map(item => item.prediction?.predicted_score)
      .filter(score => score !== null && score !== undefined);

    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

    // Calculate trend (comparing first and last)
    let trend = null;
    if (scores.length >= 2) {
      const firstScore = scores[scores.length - 1];
      const lastScore = scores[0];
      if (lastScore > firstScore + 5) trend = 'improving';
      else if (lastScore < firstScore - 5) trend = 'declining';
      else trend = 'stable';
    }

    return {
      totalPredictions: predictions.length,
      averageScore: averageScore ? Math.round(averageScore * 10) / 10 : null,
      trend,
      lastPrediction: predictions[0] || null,
      firstPrediction: predictions[predictions.length - 1] || null
    };
  } catch (error) {
    console.error('❌ Error calculating prediction stats:', error);
    return {
      totalPredictions: 0,
      averageScore: null,
      trend: null,
      lastPrediction: null
    };
  }
}

/**
 * Deletes old predictions (cleanup utility)
 * Note: TTL should handle this automatically, but this is a manual option
 * 
 * @param {number} daysOld - Delete predictions older than this many days
 * @returns {Promise<number>} Number of items deleted
 */
export async function deleteOldPredictions(daysOld = 90) {
  try {
    const client = getDynamoClient();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    // Note: This is a simplified version. In production, you'd want to
    // scan and batch delete, or rely on TTL for automatic cleanup
    console.log(`🗑️ Cleanup: Would delete predictions older than ${daysOld} days (cutoff: ${cutoffTime})`);
    
    // TTL handles this automatically, so we just log
    return 0;
  } catch (error) {
    console.error('❌ Error deleting old predictions:', error);
    return 0;
  }
}
