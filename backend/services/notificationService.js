/**
 * Notification Service — One Community Ely Online Training Centre
 * Handles in-app notifications for learners and administrators.
 * Table: EduLearnNotifications (PK: notificationId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const NOTIFICATIONS_TABLE = process.env.DYNAMODB_TABLE_NOTIFICATIONS || 'EduLearnNotifications';

let docClient = null;

function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
    docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return docClient;
}

// In-memory fallback store for offline / test resilience
export const inMemoryNotifications = new Map();

/**
 * Create a learner notification (Idempotent by requestId + contentId or custom key)
 */
export async function createNotification({
  recipientId,
  type = 'requested_content_available',
  requestId = '',
  contentType = 'quiz', // 'quiz' | 'baseline_assessment' | 'after_assessment' | 'system'
  contentId = '',
  courseId = '',
  title = '',
  message = '',
  actionUrl = ''
}) {
  if (!recipientId) {
    throw new Error('Recipient identifier (learner email) is required.');
  }

  const cleanRecipient = String(recipientId).toLowerCase().trim();

  // Deduplication check: check if an identical unread notification already exists
  const allNotifications = await getLearnerNotifications(cleanRecipient, false);
  const duplicate = allNotifications.find(n => 
    n.type === type &&
    ((requestId && n.requestId === requestId) || (contentId && n.contentId === contentId))
  );

  if (duplicate) {
    return duplicate;
  }

  const now = new Date().toISOString();
  const notificationId = `notif_${Date.now()}_${randomUUID().substring(0, 8)}`;

  const notificationItem = {
    notificationId,
    recipientId: cleanRecipient,
    type,
    requestId: requestId || '',
    contentType,
    contentId: contentId || '',
    courseId: courseId || '',
    title: String(title || 'New Content Available').trim(),
    message: String(message || '').trim(),
    actionUrl: actionUrl || '',
    read: false,
    createdAt: now,
    readAt: null
  };

  inMemoryNotifications.set(notificationId, notificationItem);

  try {
    const client = getClient();
    await client.send(
      new PutCommand({
        TableName: NOTIFICATIONS_TABLE,
        Item: notificationItem
      })
    );
  } catch (err) {
    console.warn(`[notificationService] DynamoDB put failed for ${NOTIFICATIONS_TABLE}, using memory:`, err.message);
  }

  return notificationItem;
}

/**
 * Get notifications for a learner
 */
export async function getLearnerNotifications(recipientId, unreadOnly = false) {
  if (!recipientId) return [];
  const cleanRecipient = String(recipientId).toLowerCase().trim();

  let items = Array.from(inMemoryNotifications.values());

  try {
    const client = getClient();
    const result = await client.send(
      new ScanCommand({
        TableName: NOTIFICATIONS_TABLE
      })
    );
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryNotifications.set(it.notificationId, it));
    }
  } catch (err) {
    // Rely on memory
  }

  items = items.filter(n => n.recipientId === cleanRecipient);

  if (unreadOnly) {
    items = items.filter(n => !n.read);
  }

  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId, recipientId) {
  if (!notificationId || !recipientId) return null;
  const cleanRecipient = String(recipientId).toLowerCase().trim();

  let item = inMemoryNotifications.get(notificationId);

  try {
    const client = getClient();
    const result = await client.send(
      new GetCommand({
        TableName: NOTIFICATIONS_TABLE,
        Key: { notificationId }
      })
    );
    if (result.Item) {
      item = result.Item;
    }
  } catch (err) {
    // Rely on memory
  }

  if (!item || item.recipientId !== cleanRecipient) {
    return null;
  }

  const now = new Date().toISOString();
  item.read = true;
  item.readAt = now;

  inMemoryNotifications.set(notificationId, item);

  try {
    const client = getClient();
    await client.send(
      new UpdateCommand({
        TableName: NOTIFICATIONS_TABLE,
        Key: { notificationId },
        UpdateExpression: 'SET #r = :r, readAt = :now',
        ExpressionAttributeNames: { '#r': 'read' },
        ExpressionAttributeValues: {
          ':r': true,
          ':now': now
        }
      })
    );
  } catch (err) {
    console.warn(`[notificationService] DynamoDB update failed for ${notificationId}:`, err.message);
  }

  return item;
}

/**
 * Mark all notifications for a learner as read
 */
export async function markAllNotificationsAsRead(recipientId) {
  if (!recipientId) return 0;
  const cleanRecipient = String(recipientId).toLowerCase().trim();

  const userNotifs = await getLearnerNotifications(cleanRecipient, true);
  const now = new Date().toISOString();

  await Promise.all(
    userNotifs.map(async (n) => {
      n.read = true;
      n.readAt = now;
      inMemoryNotifications.set(n.notificationId, n);

      try {
        const client = getClient();
        await client.send(
          new UpdateCommand({
            TableName: NOTIFICATIONS_TABLE,
            Key: { notificationId: n.notificationId },
            UpdateExpression: 'SET #r = :r, readAt = :now',
            ExpressionAttributeNames: { '#r': 'read' },
            ExpressionAttributeValues: {
              ':r': true,
              ':now': now
            }
          })
        );
      } catch (err) {
        // ignore
      }
    })
  );

  return userNotifs.length;
}
