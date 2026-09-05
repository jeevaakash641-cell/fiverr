import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
    console.log('📦 S3 client initialized:', {
      region: process.env.S3_REGION || process.env.AWS_REGION,
      bucket: process.env.S3_BUCKET_NAME
    });
  }
  return s3Client;
}

/**
 * Store chat session in S3
 */
export async function storeChatSession(userId, chatData) {
  try {
    const client = getS3Client();
    const timestamp = new Date().toISOString();
    const key = `chat-history/${userId}/${timestamp}.json`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(chatData, null, 2),
      ContentType: 'application/json'
    });
    
    await client.send(command);
    
    console.log(`✅ Chat stored in S3: ${key}`);
    return { success: true, key };
  } catch (error) {
    console.error('❌ S3 storage error:', error);
    throw new Error(`Failed to store chat: ${error.message}`);
  }
}
