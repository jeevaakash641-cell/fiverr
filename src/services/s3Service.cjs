const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// S3 Configuration from environment variables
const S3_CONFIG = {
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'edulearn-books';

// Initialize S3 client
const s3Client = new S3Client(S3_CONFIG);

/**
 * Upload file to S3 bucket
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Unique filename for S3
 * @param {string} contentType - MIME type of the file
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Upload result with S3 URL
 */
const uploadToS3 = async (fileBuffer, fileName, contentType, metadata = {}) => {
  try {
    // Generate unique key with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `books/${metadata.state || 'general'}/${metadata.class || 'misc'}/${timestamp}_${sanitizedFileName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    });

    await s3Client.send(uploadCommand);

    const fileUrl = `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/${s3Key}`;

    return {
      success: true,
      fileName: s3Key,
      fileUrl: fileUrl,
      bucket: BUCKET_NAME,
      region: S3_CONFIG.region
    };

  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
};

/**
 * Generate presigned URL for secure file access
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
const getSignedFileUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    // Fallback: return direct S3 URL
    return `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/${s3Key}`;
  }
};

/**
 * Delete file from S3 bucket
 * @param {string} s3Key - S3 object key to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromS3 = async (s3Key) => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    await s3Client.send(deleteCommand);
    console.log('File deleted successfully from S3:', s3Key);
    return true;

  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
};

module.exports = {
  uploadToS3,
  getSignedFileUrl,
  deleteFromS3
};
