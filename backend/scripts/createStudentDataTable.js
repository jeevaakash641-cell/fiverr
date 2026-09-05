import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});

const TABLE = 'EduLearnStudentData';
try {
  await client.send(new DescribeTableCommand({ TableName: TABLE }));
  console.log('✅ Table already exists');
} catch {
  await client.send(new CreateTableCommand({
    TableName: TABLE,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'dataType', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'dataType', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  }));
  console.log('✅ EduLearnStudentData table created');
}
