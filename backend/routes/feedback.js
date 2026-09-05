import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { sendFeedbackEmail } from '../services/emailService.js';

const router = express.Router();
const TABLE = process.env.DYNAMODB_FEEDBACK_TABLE || 'EduLearnFeedback';

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

/** POST /api/feedback — submit feedback */
router.post('/', async (req, res) => {
  try {
    const { userName, userEmail, userType, rating, category, message } = req.body;
    if (!rating || !message) return res.status(400).json({ error: 'rating and message are required' });

    const item = {
      id: uuidv4(),
      userName: userName || 'Anonymous',
      userEmail: userEmail || 'anonymous',
      userType: userType || 'student',
      rating: Number(rating),
      category: category || 'general',
      message,
      createdAt: new Date().toISOString(),
    };

    await getClient().send(new PutCommand({ TableName: TABLE, Item: item }));

    // Send email notification (non-blocking)
    sendFeedbackEmail(item).catch(() => {});

    res.json({ success: true, id: item.id });
  } catch (err) {
    console.error('Feedback save error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/feedback — get all feedback (public reviews) */
router.get('/', async (req, res) => {
  try {
    const result = await getClient().send(new ScanCommand({ TableName: TABLE }));
    const items = (result.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, feedback: items });
  } catch (err) {
    console.error('Feedback fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/feedback/:id — delete a review (teacher/admin only) */
router.delete('/:id', async (req, res) => {
  try {
    await getClient().send(new DeleteCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    res.json({ success: true });
  } catch (err) {
    console.error('Feedback delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
