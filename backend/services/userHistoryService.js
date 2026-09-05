import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const docClient = DynamoDBDocumentClient.from(client);
const HISTORY_TABLE = process.env.DYNAMODB_HISTORY_TABLE || 'UserHistory';

/**
 * Activity Types that can be tracked
 */
export const ActivityTypes = {
  // Learning Activities
  AI_CHAT: 'ai_chat',
  QUIZ_ATTEMPT: 'quiz_attempt',
  VIDEO_WATCH: 'video_watch',
  BOOK_READ: 'book_read',
  BOOK_DOWNLOAD: 'book_download',
  VISUALIZATION_VIEW: 'visualization_view',
  
  // Study Activities
  STUDY_SESSION: 'study_session',
  PREDICTION_VIEW: 'prediction_view',
  PERFORMANCE_CHECK: 'performance_check',
  
  // Teacher Activities
  CONTENT_GENERATE: 'content_generate',
  QUESTION_GENERATE: 'question_generate',
  HOMEWORK_CREATE: 'homework_create',
  
  // Health & Discipline
  HEALTH_LOG: 'health_log',
  DISCIPLINE_UPDATE: 'discipline_update',
  STREAK_UPDATE: 'streak_update',
  REWARD_UNLOCK: 'reward_unlock',
  
  // Career & Simulation
  CAREER_SIMULATE: 'career_simulate',
  DECISION_SIMULATE: 'decision_simulate',
  
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  PROFILE_UPDATE: 'profile_update'
};

/**
 * Save user activity to DynamoDB
 */
export async function saveUserActivity(activityData) {
  try {
    const {
      userId,
      userEmail,
      activityType,
      activityDetails = {},
      metadata = {}
    } = activityData;

    if (!userId || !activityType) {
      throw new Error('userId and activityType are required');
    }

    const timestamp = new Date().toISOString();
    const activityId = uuidv4();

    const item = {
      userId,
      activityId,
      timestamp,
      activityType,
      userEmail: userEmail || 'unknown',
      activityDetails,
      metadata: {
        ...metadata,
        userAgent: metadata.userAgent || 'unknown',
        ipAddress: metadata.ipAddress || 'unknown',
        platform: metadata.platform || 'web'
      },
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year retention
    };

    const command = new PutCommand({
      TableName: HISTORY_TABLE,
      Item: item
    });

    await docClient.send(command);
    
    console.log(`✅ Activity saved: ${activityType} for user ${userId}`);
    return { success: true, activityId, timestamp };

  } catch (error) {
    console.error('❌ Error saving user activity:', error);
    throw error;
  }
}

/**
 * Get user activity history
 */
export async function getUserHistory(userId, options = {}) {
  try {
    const {
      limit = 50,
      startDate,
      endDate,
      activityType,
      lastEvaluatedKey
    } = options;

    let filterExpression = '';
    let expressionAttributeValues = {
      ':userId': userId
    };
    let expressionAttributeNames = {};

    // Add date range filter
    if (startDate && endDate) {
      filterExpression = '#timestamp BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
      expressionAttributeNames['#timestamp'] = 'timestamp';
    }

    // Add activity type filter
    if (activityType) {
      if (filterExpression) {
        filterExpression += ' AND activityType = :activityType';
      } else {
        filterExpression = 'activityType = :activityType';
      }
      expressionAttributeValues[':activityType'] = activityType;
    }

    const params = {
      TableName: HISTORY_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // Sort by timestamp descending
      Limit: limit
    };

    if (filterExpression) {
      params.FilterExpression = filterExpression;
    }

    if (Object.keys(expressionAttributeNames).length > 0) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    return {
      items: result.Items || [],
      count: result.Count || 0,
      lastEvaluatedKey: result.LastEvaluatedKey
    };

  } catch (error) {
    console.error('❌ Error getting user history:', error);
    throw error;
  }
}

/**
 * Get activity statistics for a user
 */
export async function getUserActivityStats(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await getUserHistory(userId, {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      limit: 1000
    });

    const stats = {
      totalActivities: result.count,
      activityBreakdown: {},
      dailyActivity: {},
      mostActiveDay: null,
      mostCommonActivity: null
    };

    // Calculate activity breakdown
    result.items.forEach(item => {
      // Activity type count
      stats.activityBreakdown[item.activityType] = 
        (stats.activityBreakdown[item.activityType] || 0) + 1;

      // Daily activity count
      const date = item.timestamp.split('T')[0];
      stats.dailyActivity[date] = (stats.dailyActivity[date] || 0) + 1;
    });

    // Find most active day
    let maxActivities = 0;
    Object.entries(stats.dailyActivity).forEach(([date, count]) => {
      if (count > maxActivities) {
        maxActivities = count;
        stats.mostActiveDay = { date, count };
      }
    });

    // Find most common activity
    let maxCount = 0;
    Object.entries(stats.activityBreakdown).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        stats.mostCommonActivity = { type, count };
      }
    });

    return stats;

  } catch (error) {
    console.error('❌ Error getting activity stats:', error);
    throw error;
  }
}

/**
 * Get recent activities across all users (admin function)
 */
export async function getRecentActivities(limit = 100) {
  try {
    const command = new ScanCommand({
      TableName: HISTORY_TABLE,
      Limit: limit
    });

    const result = await docClient.send(command);

    // Sort by timestamp descending
    const sortedItems = (result.Items || []).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    return {
      items: sortedItems,
      count: result.Count || 0
    };

  } catch (error) {
    console.error('❌ Error getting recent activities:', error);
    throw error;
  }
}

/**
 * Delete old user history (cleanup function)
 */
export async function cleanupOldHistory(daysToKeep = 365) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    console.log(`🧹 Cleaning up history older than ${cutoffDate.toISOString()}`);
    
    // Note: This is a simplified version. In production, you'd want to use
    // DynamoDB TTL (Time To Live) feature which is more efficient
    
    return { success: true, message: 'Cleanup scheduled (use DynamoDB TTL)' };

  } catch (error) {
    console.error('❌ Error cleaning up history:', error);
    throw error;
  }
}

/**
 * Get activity summary by type
 */
export async function getActivitySummary(userId, activityType, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await getUserHistory(userId, {
      activityType,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      limit: 1000
    });

    return {
      activityType,
      count: result.count,
      items: result.items,
      period: `${days} days`
    };

  } catch (error) {
    console.error('❌ Error getting activity summary:', error);
    throw error;
  }
}

export default {
  saveUserActivity,
  getUserHistory,
  getUserActivityStats,
  getRecentActivities,
  cleanupOldHistory,
  getActivitySummary,
  ActivityTypes
};
