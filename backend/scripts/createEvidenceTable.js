import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
  }
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_EVIDENCE || 'OneCommunityElyEvidence';

async function setupTable() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`✅ Table "${TABLE_NAME}" already exists`);
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      console.log(`Creating table "${TABLE_NAME}"...`);
      await client.send(new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [{ AttributeName: 'evidenceId', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'evidenceId', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
      }));
      console.log(`✅ Table "${TABLE_NAME}" created successfully`);
    } else {
      console.warn(`Could not check or create table "${TABLE_NAME}":`, err.message);
    }
  }
}

setupTable();
