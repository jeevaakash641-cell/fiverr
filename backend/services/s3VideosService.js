import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    console.log('🎥 S3 Videos Client initialized:', {
      region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1',
      bucket: process.env.S3_BUCKET_NAME || 'edulearn-books-storage'
    });
  }
  return s3Client;
}

/**
 * List all videos from S3 bucket
 */
export async function listVideos() {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    
    console.log('🎥 Listing videos from bucket:', bucketName);
    
    // First check if there are ANY objects in the bucket
    const allObjectsCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 10
    });
    
    const allObjectsResponse = await client.send(allObjectsCommand);
    console.log('📦 Total objects in bucket:', allObjectsResponse.Contents?.length || 0);
    if (allObjectsResponse.Contents && allObjectsResponse.Contents.length > 0) {
      console.log('📁 Sample keys:', allObjectsResponse.Contents.slice(0, 5).map(item => item.Key));
    }
    
    // List objects with videos/ prefix
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'videos/'
    });
    
    const response = await client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('⚠️ No videos found in S3 bucket');
      return [];
    }
    
    console.log(`🎥 Found ${response.Contents.length} objects in videos folder`);
    
    // Parse video metadata from S3 objects
    const videos = await Promise.all(
      response.Contents
        .filter(item => {
          // Filter out folders and non-video files
          return item.Key && 
                 !item.Key.endsWith('/') && 
                 item.Key !== 'videos/' &&
                 (item.Key.toLowerCase().endsWith('.mp4') || 
                  item.Key.toLowerCase().endsWith('.webm') ||
                  item.Key.toLowerCase().endsWith('.mov') ||
                  item.Key.toLowerCase().endsWith('.avi') ||
                  item.Key.toLowerCase().endsWith('.mkv'));
        })
        .map(async (item) => {
          // Get metadata from S3 object
          let metadata = {};
          try {
            const headCommand = new HeadObjectCommand({
              Bucket: bucketName,
              Key: item.Key
            });
            const headResponse = await client.send(headCommand);
            metadata = headResponse.Metadata || {};
          } catch (error) {
            console.log('⚠️ Could not fetch metadata for:', item.Key);
          }
          
          // Extract info from key: videos/state/Class-X/Subject/filename.mp4
          const keyParts = item.Key.split('/');
          const fileName = keyParts[keyParts.length - 1];
          const fileNameWithoutExt = fileName.replace(/\.(mp4|webm|mov|avi|mkv)$/i, '');
          
          // Extract state
          let state = 'All States';
          if (keyParts.length >= 2) {
            const stateFolder = keyParts[1].toLowerCase();
            const stateMap = {
              'tamilnadu': 'Tamil Nadu',
              'andhrapradesh': 'Andhra Pradesh',
              'telangana': 'Telangana',
              'karnataka': 'Karnataka',
              'kerala': 'Kerala',
              'maharashtra': 'Maharashtra',
              'gujarat': 'Gujarat',
              'rajasthan': 'Rajasthan',
              'madhyapradesh': 'Madhya Pradesh',
              'uttarpradesh': 'Uttar Pradesh',
              'bihar': 'Bihar',
              'jharkhand': 'Jharkhand',
              'chhattisgarh': 'Chhattisgarh',
              'uttarakhand': 'Uttarakhand',
              'himachalpradesh': 'Himachal Pradesh',
              'haryana': 'Haryana',
              'punjab': 'Punjab',
              'westbengal': 'West Bengal',
              'odisha': 'Odisha',
              'assam': 'Assam'
            };
            state = stateMap[stateFolder] || 'All States';
          }
          
          // Extract class from folder structure first, then metadata
          let classNum = '1'; // default
          if (keyParts.length >= 3) {
            const classMatch = keyParts[2].match(/Class-?(\d+)/i);
            if (classMatch) {
              classNum = classMatch[1];
            }
          }
          // Only use metadata if folder structure didn't have class info
          if (classNum === '1' && metadata.class) {
            classNum = metadata.class;
          }
          
          // Extract subject
          let subject = metadata.subject || 'General';
          if (keyParts.length >= 4) {
            const subjectFolder = keyParts[3];
            if (subjectFolder && !subjectFolder.match(/Class-?\d+/i)) {
              subject = subjectFolder.replace(/-/g, ' ').replace(/_/g, ' ');
              subject = subject.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ');
            }
          }
          
          // Format file size
          const sizeInMB = (item.Size / (1024 * 1024)).toFixed(2);
          const sizeStr = sizeInMB + ' MB';
          
          // Get video format
          const format = fileName.split('.').pop().toUpperCase();
          
          return {
            id: item.Key,
            key: item.Key,
            title: metadata.title || fileNameWithoutExt.replace(/-/g, ' ').replace(/_/g, ' '),
            description: metadata.description || `${subject} video for Class ${classNum}`,
            subject: subject,
            class: classNum,
            state: state,
            board: 'State Board',
            medium: metadata.medium || 'both',
            language: metadata.language || 'English',
            fileName: fileName,
            size: sizeStr,
            sizeBytes: item.Size,
            format: format,
            duration: metadata.duration || 'Unknown',
            thumbnail: metadata.thumbnail || null,
            uploadedBy: metadata.uploadedby || metadata.uploadedBy || 'admin',
            uploadedAt: metadata.uploadedat || metadata.uploadedAt || item.LastModified,
            lastModified: item.LastModified,
            // URLs for streaming and downloading
            streamUrl: `/api/videos/${encodeURIComponent(item.Key)}`,
            downloadUrl: `/api/videos/${encodeURIComponent(item.Key)}/download`,
            // Additional metadata
            topic: metadata.topic || '',
            chapter: metadata.chapter || '',
            term: metadata.term || '',
            type: 'video'
          };
        })
    );
    
    console.log('✅ Processed videos:', videos.length);
    if (videos.length > 0) {
      console.log('📊 Videos by subject:', videos.reduce((acc, video) => {
        acc[video.subject] = (acc[video.subject] || 0) + 1;
        return acc;
      }, {}));
    }
    
    return videos;
  } catch (error) {
    console.error('❌ Error listing videos from S3:', error);
    throw error;
  }
}

/**
 * Get presigned URL for a video (for streaming/downloading)
 */
export async function getVideoUrl(key, expiresIn = 14400) { // 4 hours = 14400 seconds
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1';
    
    console.log('🔗 Generating presigned URL with config:', {
      bucket: bucketName,
      region: region,
      key: key
    });
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      // Add response headers for CORS and video streaming
      ResponseCacheControl: 'no-cache',
      ResponseContentType: 'video/mp4'
    });
    
    const url = await getSignedUrl(client, command, { 
      expiresIn,
      // Force the correct S3 endpoint format with region
      signingRegion: region,
      // These headers will be included in the presigned URL
      unhoistableHeaders: new Set(['x-amz-server-side-encryption'])
    });
    
    console.log('✅ Generated presigned URL for video:', key);
    console.log('   Expires in:', expiresIn, 'seconds (', Math.floor(expiresIn / 3600), 'hours)');
    console.log('   URL format check:', url.includes(region) ? '✅ Region in URL' : '⚠️ Region missing from URL');
    
    return url;
  } catch (error) {
    console.error('❌ Error generating presigned URL for video:', error);
    throw error;
  }
}

/**
 * Upload a video to S3
 */
export async function uploadVideo(file, metadata) {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    
    console.log('\n🚀 STARTING S3 UPLOAD');
    console.log('-'.repeat(60));
    
    // Create S3 key: videos/state/Class-X/Subject/filename.mp4
    const stateFolder = metadata.state.toLowerCase().replace(/\s+/g, '');
    const classFolder = `Class-${metadata.class}`;
    const subjectFolder = metadata.subject.replace(/\s+/g, '-');
    
    const fileName = file.originalname || `${metadata.title.replace(/\s+/g, '-')}.mp4`;
    const key = `videos/${stateFolder}/${classFolder}/${subjectFolder}/${fileName}`;
    
    console.log('📦 Upload Details:');
    console.log('   Bucket:', bucketName);
    console.log('   Region:', process.env.S3_REGION);
    console.log('   Key:', key);
    console.log('   File size:', `${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log('   Content type:', file.mimetype);
    console.log('   Buffer size:', file.buffer ? file.buffer.length : 'No buffer');
    
    // Determine content type
    let contentType = file.mimetype || 'video/mp4';
    if (fileName.endsWith('.webm')) contentType = 'video/webm';
    else if (fileName.endsWith('.mov')) contentType = 'video/quicktime';
    else if (fileName.endsWith('.avi')) contentType = 'video/x-msvideo';
    else if (fileName.endsWith('.mkv')) contentType = 'video/x-matroska';
    
    console.log('   Final content type:', contentType);
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: contentType,
      Metadata: {
        title: metadata.title,
        description: metadata.description || '',
        subject: metadata.subject,
        class: metadata.class.toString(),
        state: metadata.state,
        medium: metadata.medium,
        language: metadata.language,
        topic: metadata.topic || '',
        chapter: metadata.chapter || '',
        term: metadata.term || '',
        duration: metadata.duration || '',
        uploadedBy: metadata.uploadedBy || '',
        uploadedAt: new Date().toISOString()
      }
    });
    
    console.log('📤 Sending upload command to S3...');
    const response = await client.send(command);
    console.log('✅ S3 Response:', {
      ETag: response.ETag,
      VersionId: response.VersionId,
      ServerSideEncryption: response.ServerSideEncryption
    });
    
    console.log('✅ VIDEO UPLOADED SUCCESSFULLY TO S3');
    console.log('   Location: s3://' + bucketName + '/' + key);
    console.log('-'.repeat(60) + '\n');
    
    return {
      success: true,
      key: key,
      bucket: bucketName,
      url: `s3://${bucketName}/${key}`,
      metadata: metadata,
      etag: response.ETag
    };
    
  } catch (error) {
    console.error('\n❌ S3 UPLOAD FAILED');
    console.error('-'.repeat(60));
    console.error('Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
      console.error('Request ID:', error.$metadata.requestId);
    }
    console.error('-'.repeat(60) + '\n');
    throw error;
  }
}

/**
 * Delete a video from S3
 */
export async function deleteVideo(key) {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    
    console.log('🗑️ Deleting video from S3:', key);
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    await client.send(command);
    
    console.log('✅ Video deleted successfully:', key);
    
    return {
      success: true,
      key: key
    };
    
  } catch (error) {
    console.error('❌ Error deleting video from S3:', error);
    throw error;
  }
}
