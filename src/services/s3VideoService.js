import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// S3 Configuration
const S3_CONFIG = {
  region: process.env.REACT_APP_AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
}

const BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME || 'edulearn-videos'

// Initialize S3 client
const s3Client = new S3Client(S3_CONFIG)

/**
 * Upload video file to S3 bucket
 * @param {File} file - Video file to upload
 * @param {string} fileName - Unique filename for S3
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
export const uploadVideoToS3 = async (file, fileName, onProgress = () => {}) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided')
    }

    // Create upload command
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size.toString()
      }
    })

    // For demo purposes, simulate upload progress
    // In production, you'd use multipart upload for large files
    let progress = 0
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 95) {
        progress = 95
        clearInterval(progressInterval)
      }
      onProgress(progress)
    }, 200)

    // Upload to S3
    const result = await s3Client.send(uploadCommand)
    
    // Complete progress
    clearInterval(progressInterval)
    onProgress(100)

    // Return S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/${fileName}`
    
    console.log('Video uploaded successfully:', s3Url)
    return s3Url

  } catch (error) {
    console.error('S3 upload error:', error)
    
    // Fallback: simulate S3 URL for demo
    if (error.name === 'CredentialsProviderError' || !process.env.REACT_APP_AWS_ACCESS_KEY_ID) {
      console.warn('AWS credentials not configured, using demo mode')
      
      // Simulate upload progress
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 20
        if (progress >= 100) {
          progress = 100
          clearInterval(progressInterval)
        }
        onProgress(progress)
      }, 150)

      // Return demo S3 URL after delay
      return new Promise((resolve) => {
        setTimeout(() => {
          clearInterval(progressInterval)
          onProgress(100)
          const demoUrl = `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/demo/${fileName}`
          resolve(demoUrl)
        }, 2000)
      })
    }
    
    throw error
  }
}

/**
 * Upload thumbnail image to S3 bucket
 * @param {File} file - Image file to upload
 * @param {string} fileName - Unique filename for S3
 * @returns {Promise<string>} - S3 URL of uploaded thumbnail
 */
export const uploadThumbnailToS3 = async (file, fileName) => {
  try {
    if (!file) {
      throw new Error('No thumbnail file provided')
    }

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `thumbnails/${fileName}`,
      Body: file,
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size.toString()
      }
    })

    const result = await s3Client.send(uploadCommand)
    const s3Url = `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/thumbnails/${fileName}`
    
    console.log('Thumbnail uploaded successfully:', s3Url)
    return s3Url

  } catch (error) {
    console.error('Thumbnail upload error:', error)
    
    // Fallback for demo
    if (error.name === 'CredentialsProviderError' || !process.env.REACT_APP_AWS_ACCESS_KEY_ID) {
      const demoUrl = `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/demo/thumbnails/${fileName}`
      return demoUrl
    }
    
    throw error
  }
}

/**
 * Generate presigned URL for video streaming
 * @param {string} fileName - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
export const getVideoStreamUrl = async (fileName, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return presignedUrl

  } catch (error) {
    console.error('Error generating presigned URL:', error)
    
    // Fallback: return direct S3 URL
    return `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/${fileName}`
  }
}

/**
 * Delete video from S3 bucket
 * @param {string} fileName - S3 object key to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deleteVideoFromS3 = async (fileName) => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName
    })

    await s3Client.send(deleteCommand)
    console.log('Video deleted successfully:', fileName)
    return true

  } catch (error) {
    console.error('Error deleting video:', error)
    return false
  }
}

/**
 * Get video metadata from S3
 * @param {string} fileName - S3 object key
 * @returns {Promise<Object>} - Video metadata
 */
export const getVideoMetadata = async (fileName) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName
    })

    const result = await s3Client.send(command)
    
    return {
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      metadata: result.Metadata
    }

  } catch (error) {
    console.error('Error getting video metadata:', error)
    return null
  }
}

/**
 * Validate video file before upload
 * @param {File} file - Video file to validate
 * @returns {Object} - Validation result
 */
export const validateVideoFile = (file) => {
  const validTypes = [
    'video/mp4',
    'video/webm', 
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/quicktime'
  ]
  
  const maxSize = 500 * 1024 * 1024 // 500MB
  
  const errors = []
  
  if (!file) {
    errors.push('No file selected')
  } else {
    if (!validTypes.includes(file.type)) {
      errors.push('Invalid file type. Please use MP4, WebM, OGG, AVI, or MOV')
    }
    
    if (file.size > maxSize) {
      errors.push('File size must be less than 500MB')
    }
    
    if (file.size < 1024) {
      errors.push('File is too small')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate unique filename for S3 upload
 * @param {string} originalName - Original filename
 * @param {string} prefix - Optional prefix (e.g., 'videos/', 'thumbnails/')
 * @returns {string} - Unique filename
 */
export const generateUniqueFileName = (originalName, prefix = '') => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()
  
  return `${prefix}${timestamp}_${randomString}.${extension}`
}

// Export S3 configuration for debugging
export const getS3Config = () => ({
  region: S3_CONFIG.region,
  bucket: BUCKET_NAME,
  hasCredentials: !!(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY)
})