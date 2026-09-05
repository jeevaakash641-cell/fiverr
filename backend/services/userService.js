/**
 * User Service — stores and retrieves users from DynamoDB
 * Table: EduLearnUsers (partition key: email)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'EduLearnUsers';

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

export const inMemoryUsers = new Map();

export const DEFAULT_ADMIN_RECORD = {
  id: 'admin_demo_01',
  name: 'Ely Admin',
  email: 'admin@onecommunityely.com',
  userType: 'teacher',
  role: 'admin',
  isBanned: false,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z'
};

inMemoryUsers.set('admin@onecommunityely.com', DEFAULT_ADMIN_RECORD);

/** Create or overwrite a user in DynamoDB */
export async function saveUser(userData) {
  const cleanEmail = userData.email?.toLowerCase().trim();
  const item = {
    ...userData,
    email: cleanEmail,
    updatedAt: new Date().toISOString(),
    createdAt: userData.createdAt || new Date().toISOString(),
  };
  // Never store raw password in DynamoDB
  delete item.password;
  inMemoryUsers.set(cleanEmail, item);

  try {
    const client = getClient();
    await client.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  } catch (err) {
    console.warn(`[userService] DynamoDB saveUser error for ${cleanEmail}, saved in memory:`, err.message);
  }
  return item;
}

/** Get user with memory fallback */
export async function getUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = String(email).toLowerCase().trim();

  // If this is the Ely Admin account, ensure default admin profile is available
  if (cleanEmail === 'admin@onecommunityely.com' && !inMemoryUsers.has(cleanEmail)) {
    inMemoryUsers.set(cleanEmail, DEFAULT_ADMIN_RECORD);
  }

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { email: cleanEmail },
    }));
    if (result.Item) {
      if (cleanEmail === 'admin@onecommunityely.com') {
        result.Item.userType = result.Item.userType || 'teacher';
        result.Item.role = result.Item.role || 'admin';
      }
      inMemoryUsers.set(cleanEmail, result.Item);
      return result.Item;
    }
  } catch (err) {
    // Rely on memory fallback
  }

  return inMemoryUsers.get(cleanEmail) || null;
}

/** Update specific fields on a user */
export async function updateUser(email, updates) {
  const client = getClient();
  // Never update password via this path
  delete updates.password;

  const entries = Object.entries(updates)
  if (!entries.length) return null;

  const updateExpr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ')
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]))
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]))

  const result = await client.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { email },
    UpdateExpression: updateExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes || null;
}

/** Delete a user by email */
export async function deleteUser(email) {
  const client = getClient();
  await client.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { email } }));
  return true;
}

/** Get all users for admin reporting (passwords stripped) */
export async function getAllUsersAdmin() {
  const map = new Map();
  for (const [em, u] of inMemoryUsers.entries()) {
    map.set(em, u);
  }

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = result.Items || [];
    for (const u of items) {
      if (u.email) {
        map.set(u.email.toLowerCase(), u);
      }
    }
  } catch (err) {
    console.warn('[userService] DynamoDB scan failed in getAllUsersAdmin, using memory:', err.message);
  }

  return Array.from(map.values()).map(user => {
    const safe = { ...user };
    delete safe.password;
    return safe;
  });
}

export default { saveUser, getUserByEmail, updateUser, deleteUser, getAllUsersAdmin };

