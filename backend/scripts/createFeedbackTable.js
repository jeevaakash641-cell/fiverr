import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});

try {
  await client.send(new DescribeTableCommand({ TableName: 'EduLearnFeedback' }));
  console.log('✅ Table already exists');
} catch {
  await client.send(new CreateTableCommand({
    TableName: 'EduLearnFeedback',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  }));
  console.log('✅ EduLearnFeedback table created');
}
