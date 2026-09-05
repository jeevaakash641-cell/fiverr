/**
 * Run once to create the EduLearnUsers DynamoDB table.
 * Usage: node backend/scripts/createUsersTable.js
 */
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'EduLearnUsers';

async function run() {
  // Check if exists
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`✅ Table "${TABLE_NAME}" already exists.`);
    return;
  } catch (e) {
    if (e.name !== 'ResourceNotFoundException') throw e;
  }

  await client.send(new CreateTableCommand({
    TableName: TABLE_NAME,
    KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'email', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
    Tags: [{ Key: 'Project', Value: 'AI-Bharat' }],
  }));

  console.log(`✅ Table "${TABLE_NAME}" created successfully.`);
}

run().catch(console.error);
