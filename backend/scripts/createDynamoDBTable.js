/**
 * Script to create DynamoDB table for Study Twin predictions
 * Run: node scripts/createDynamoDBTable.js
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  CreateTableCommand, 
  DescribeTableCommand,
  UpdateTimeToLiveCommand
} from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TABLE_NAME = 'StudyTwinPredictions';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
  }
});

async function createTable() {
  try {
    console.log('🔨 Creating DynamoDB table:', TABLE_NAME);
    console.log('📍 Region:', process.env.AWS_REGION || 'us-east-1');

    // Check if table already exists
    try {
      const describeCommand = new DescribeTableCommand({
        TableName: TABLE_NAME
      });
      await client.send(describeCommand);
      console.log('✅ Table already exists:', TABLE_NAME);
      return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      // Table doesn't exist, continue with creation
    }

    // Create table
    const createCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'studentId', KeyType: 'HASH' },  // Partition key
        { AttributeName: 'createdAt', KeyType: 'RANGE' }  // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'studentId', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'N' }
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
      Tags: [
        { Key: 'Application', Value: 'AI-Bharat' },
        { Key: 'Feature', Value: 'StudyTwin' },
        { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
      ]
    });

    const response = await client.send(createCommand);
    console.log('✅ Table created successfully!');
    console.log('📊 Table ARN:', response.TableDescription.TableArn);
    console.log('⏳ Table Status:', response.TableDescription.TableStatus);

    // Wait for table to be active
    console.log('⏳ Waiting for table to become active...');
    let tableActive = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!tableActive && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const describeCommand = new DescribeTableCommand({
        TableName: TABLE_NAME
      });
      const describeResponse = await client.send(describeCommand);
      
      if (describeResponse.Table.TableStatus === 'ACTIVE') {
        tableActive = true;
        console.log('✅ Table is now ACTIVE');
      } else {
        attempts++;
        console.log(`⏳ Still waiting... (${attempts}/${maxAttempts})`);
      }
    }

    if (!tableActive) {
      console.log('⚠️ Table creation timeout. Check AWS Console.');
      return;
    }

    // Enable TTL for automatic cleanup
    console.log('🕐 Enabling TTL (Time To Live) for automatic cleanup...');
    const ttlCommand = new UpdateTimeToLiveCommand({
      TableName: TABLE_NAME,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'ttl'
      }
    });

    await client.send(ttlCommand);
    console.log('✅ TTL enabled! Items will auto-delete after 90 days.');

    console.log('\n🎉 Setup complete!');
    console.log('\nTable Details:');
    console.log('  Name:', TABLE_NAME);
    console.log('  Partition Key: studentId (String)');
    console.log('  Sort Key: createdAt (Number - timestamp)');
    console.log('  Billing: Pay per request');
    console.log('  TTL: Enabled (90 days)');
    console.log('\nYou can now use the Study Twin API with DynamoDB persistence!');

  } catch (error) {
    console.error('❌ Error creating table:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check AWS credentials in .env file');
    console.error('2. Verify AWS_REGION is set correctly');
    console.error('3. Ensure IAM user has DynamoDB permissions');
    console.error('4. Check AWS Console for more details');
    process.exit(1);
  }
}

// Run the script
createTable();
