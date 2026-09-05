const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// S3 Configuration
const S3_CONFIG = {
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'edulearn-books-storage';

// Initialize S3 client
const s3Client = new S3Client(S3_CONFIG);

/**
 * Save history entry to S3
 * @param {string} userId - User ID
 * @param {string} type - History type (book_view, quiz_attempt, ai_conversation)
 * @param {Object} data - History data
 * @returns {Promise<Object>} - Result
 */
const saveHistoryToS3 = async (userId, type, data) => {
  try {
    const timestamp = Date.now();
    const s3Key = `history/${userId}/${type}/${timestamp}_${data.id}.json`;

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
      Metadata: {
        userId: userId,
        type: type,
        timestamp: new Date().toISOString()
      }
    });

    await s3Client.send(uploadCommand);

    return {
      success: true,
      s3Key: s3Key,
      historyId: data.id
    };

  } catch (error) {
    console.error('S3 history save error:', error);
    throw new Error(`Failed to save history to S3: ${error.message}`);
  }
};

/**
 * Get history entries from S3
 * @param {string} userId - User ID
 * @param {string} type - History type (optional)
 * @param {number} limit - Max number of entries
 * @returns {Promise<Array>} - History entries
 */
const getHistoryFromS3 = async (userId, type = null, limit = 20) => {
  try {
    const prefix = type ? `history/${userId}/${type}/` : `history/${userId}/`;

    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: limit * 2 // Get more to account for filtering
    });

    const listResult = await s3Client.send(listCommand);

    if (!listResult.Contents || listResult.Contents.length === 0) {
      return [];
    }

    // Sort by last modified (newest first)
    const sortedObjects = listResult.Contents
      .sort((a, b) => b.LastModified - a.LastModified)
      .slice(0, limit);

    // Fetch content for each object
    const historyEntries = await Promise.all(
      sortedObjects.map(async (obj) => {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: obj.Key
          });

          const result = await s3Client.send(getCommand);
          const bodyString = await streamToString(result.Body);
          return JSON.parse(bodyString);
        } catch (error) {
          console.error(`Error fetching ${obj.Key}:`, error);
          return null;
        }
      })
    );

    return historyEntries.filter(entry => entry !== null);

  } catch (error) {
    console.error('S3 history fetch error:', error);
    return [];
  }
};

/**
 * Delete history entry from S3
 * @param {string} userId - User ID
 * @param {string} historyId - History entry ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteHistoryFromS3 = async (userId, historyId) => {
  try {
    // List all objects for this user to find the matching history ID
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `history/${userId}/`
    });

    const listResult = await s3Client.send(listCommand);

    if (!listResult.Contents) {
      return false;
    }

    // Find the object with matching history ID
    const matchingObject = listResult.Contents.find(obj => 
      obj.Key.includes(historyId)
    );

    if (!matchingObject) {
      return false;
    }

    // Delete the object
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: matchingObject.Key
    });

    await s3Client.send(deleteCommand);
    console.log('History deleted from S3:', matchingObject.Key);
    return true;

  } catch (error) {
    console.error('Error deleting history from S3:', error);
    throw new Error(`Failed to delete history from S3: ${error.message}`);
  }
};

/**
 * Clear all history for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of entries deleted
 */
const clearUserHistoryFromS3 = async (userId) => {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `history/${userId}/`
    });

    const listResult = await s3Client.send(listCommand);

    if (!listResult.Contents || listResult.Contents.length === 0) {
      return 0;
    }

    // Delete all objects
    const deletePromises = listResult.Contents.map(obj => {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: obj.Key
      });
      return s3Client.send(deleteCommand);
    });

    await Promise.all(deletePromises);
    console.log(`Cleared ${listResult.Contents.length} history entries for user ${userId}`);
    return listResult.Contents.length;

  } catch (error) {
    console.error('Error clearing user history from S3:', error);
    throw new Error(`Failed to clear history from S3: ${error.message}`);
  }
};

/**
 * Get history statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Statistics
 */
const getHistoryStatistics = async (userId) => {
  try {
    const [books, quizzes, aiChats] = await Promise.all([
      getHistoryFromS3(userId, 'book_view', 100),
      getHistoryFromS3(userId, 'quiz_attempt', 100),
      getHistoryFromS3(userId, 'ai_conversation', 100)
    ]);

    // Calculate statistics
    const totalBooksViewed = books.length;
    const totalQuizzesTaken = quizzes.length;
    const totalAIConversations = aiChats.length;

    const averageQuizScore = quizzes.length > 0
      ? Math.round(quizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) / quizzes.length)
      : 0;

    const totalStudyTime = Math.round(
      (books.reduce((sum, book) => sum + (book.duration || 0), 0) +
       aiChats.reduce((sum, chat) => sum + (chat.duration || 0), 0)) / 60
    );

    // Most viewed subject
    const subjectCounts = {};
    books.forEach(book => {
      subjectCounts[book.bookSubject] = (subjectCounts[book.bookSubject] || 0) + 1;
    });
    quizzes.forEach(quiz => {
      subjectCounts[quiz.subject] = (subjectCounts[quiz.subject] || 0) + 1;
    });

    const subjects = Object.entries(subjectCounts);
    const mostViewedSubject = subjects.length > 0
      ? subjects.reduce((max, curr) => curr[1] > max[1] ? curr : max)[0]
      : 'None';

    return {
      totalBooksViewed,
      totalQuizzesTaken,
      totalAIConversations,
      averageQuizScore,
      totalStudyTime,
      mostViewedSubject,
      recentActivity: {
        booksThisWeek: books.filter(b => isWithinDays(b.timestamp, 7)).length,
        quizzesThisWeek: quizzes.filter(q => isWithinDays(q.timestamp, 7)).length,
        aiChatsThisWeek: aiChats.filter(c => isWithinDays(c.timestamp, 7)).length
      }
    };

  } catch (error) {
    console.error('Error calculating statistics:', error);
    return null;
  }
};

/**
 * Helper: Convert stream to string
 */
const streamToString = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};

/**
 * Helper: Check if timestamp is within X days
 */
const isWithinDays = (timestamp, days) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
};

module.exports = {
  saveHistoryToS3,
  getHistoryFromS3,
  deleteHistoryFromS3,
  clearUserHistoryFromS3,
  getHistoryStatistics
};
