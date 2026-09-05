/**
 * Student Data API — stores all student-specific data in DynamoDB
 * Replaces localStorage for: health, notes, discipline, streaks, points
 *
 * Table: EduLearnStudentData
 * Key: userId (email) + dataType (health/notes/streaks/points/automation)
 */
import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const router = express.Router();
const TABLE = process.env.DYNAMODB_STUDENT_DATA_TABLE || 'EduLearnStudentData';

let docClient = null;
function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
      },
    });
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

/** GET /api/student-data/:userId/:dataType */
router.get('/:userId/:dataType', async (req, res) => {
  try {
    const { userId, dataType } = req.params;
    const result = await getClient().send(new GetCommand({
      TableName: TABLE,
      Key: { userId: decodeURIComponent(userId), dataType },
    }));
    res.json({ success: true, data: result.Item?.data ?? null });
  } catch (err) {
    console.error('Get student data error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/student-data/:userId/:dataType — save/overwrite */
router.put('/:userId/:dataType', async (req, res) => {
  try {
    const { userId, dataType } = req.params;
    const { data } = req.body;
    await getClient().send(new PutCommand({
      TableName: TABLE,
      Item: {
        userId: decodeURIComponent(userId),
        dataType,
        data,
        updatedAt: new Date().toISOString(),
      },
    }));
    res.json({ success: true });
  } catch (err) {
    console.error('Put student data error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
