import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  CreateTableCommand, 
  DescribeTableCommand,
  UpdateTimeToLiveCommand
} from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const TABLE_NAME = process.env.DYNAMODB_HISTORY_TABLE || 'UserHistory';

async function createUserHistoryTable() {
  try {
    console.log(`📊 Creating DynamoDB table: ${TABLE_NAME}`);

    // Check if table already exists
    try {
      const describeCommand = new DescribeTableCommand({
        TableName: TABLE_NAME
      });
      await client.send(describeCommand);
      console.log(`✅ Table ${TABLE_NAME} already exists`);
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
        { AttributeName: 'userId', KeyType: 'HASH' },  // Partition key
        { AttributeName: 'timestamp', KeyType: 'RANGE' } // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' },
        { AttributeName: 'activityType', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'ActivityTypeIndex',
          KeySchema: [
            { AttributeName: 'activityType', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: {
            ProjectionType: 'ALL'
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      Tags: [
        { Key: 'Project', Value: 'AI-Bharat' },
        { Key: 'Purpose', Value: 'UserActivityTracking' }
      ]
    });

    const result = await client.send(createCommand);
    console.log('✅ Table created successfully');
    console.log('Table ARN:', result.TableDescription.TableArn);

    // Wait for table to be active
    console.log('⏳ Waiting for table to be active...');
    await waitForTableActive(TABLE_NAME);

    // Enable TTL for automatic data expiration
    console.log('🕐 Enabling TTL (Time To Live)...');
    const ttlCommand = new UpdateTimeToLiveCommand({
      TableName: TABLE_NAME,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'ttl'
      }
    });

    await client.send(ttlCommand);
    console.log('✅ TTL enabled - items will auto-expire after 1 year');

    console.log('\n🎉 User History table setup complete!');
    console.log('\nTable Details:');
    console.log(`  Name: ${TABLE_NAME}`);
    console.log(`  Region: ${process.env.AWS_REGION}`);
    console.log(`  Partition Key: userId`);
    console.log(`  Sort Key: timestamp`);
    console.log(`  GSI: ActivityTypeIndex`);
    console.log(`  TTL: Enabled (1 year retention)`);

  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

async function waitForTableActive(tableName, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const result = await client.send(command);
      
      if (result.Table.TableStatus === 'ACTIVE') {
        console.log('✅ Table is now active');
        return;
      }
      
      console.log(`⏳ Table status: ${result.Table.TableStatus}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error checking table status:', error);
      throw error;
    }
  }
  
  throw new Error('Table did not become active in time');
}

// Run the script
createUserHistoryTable()
  .then(() => {
    console.log('\n✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
