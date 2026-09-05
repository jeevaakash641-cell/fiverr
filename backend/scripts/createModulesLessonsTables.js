import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
  },
});

async function ensureTable(tableName, keyAttribute) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`✅ Table "${tableName}" already exists in DynamoDB.`);
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      console.log(`Creating DynamoDB table "${tableName}"...`);
      await client.send(new CreateTableCommand({
        TableName: tableName,
        KeySchema: [{ AttributeName: keyAttribute, KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: keyAttribute, AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      }));
      console.log(`✅ Table "${tableName}" created successfully.`);
    } else {
      console.error(`❌ Error checking table "${tableName}":`, err.message);
    }
  }
}

const modulesTable = process.env.DYNAMODB_TABLE_MODULES || 'EduLearnModules';
const lessonsTable = process.env.DYNAMODB_TABLE_LESSONS || 'EduLearnLessons';

console.log('Ensuring DynamoDB tables for Modules & Lessons...');
await ensureTable(modulesTable, 'moduleId');
await ensureTable(lessonsTable, 'lessonId');
console.log('All required tables verified.');
