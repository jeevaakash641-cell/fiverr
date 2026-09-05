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
    
    console.log('📦 S3 Books Client initialized:', {
      region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1',
      bucket: process.env.S3_BUCKET_NAME || 'edulearn-books-storage'
    });
  }
  return s3Client;
}

/**
 * List all books from S3 bucket
 */
export async function listBooks() {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    
    console.log('📚 Listing ALL objects from bucket:', bucketName);
    
    // First, try without prefix to see all objects
    const command = new ListObjectsV2Command({
      Bucket: bucketName
      // No prefix - list everything
    });
    
    const response = await client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('⚠️ No objects found in S3 bucket at all');
      return [];
    }
    
    console.log(`📖 Found ${response.Contents.length} total objects in S3`);
    console.log('📁 Sample keys:', response.Contents.slice(0, 5).map(item => item.Key));
    
    // Parse book metadata from S3 object keys and metadata
    const books = await Promise.all(
      response.Contents
        .filter(item => {
          // Filter out folders, chat history
          if (!item.Key || item.Key.endsWith('/') || item.Key.includes('chat-history/')) return false;
          const ext = item.Key.substring(item.Key.lastIndexOf('.')).toLowerCase();
          const validExts = [
            '.pdf', '.epub', '.doc', '.docx', '.txt', '.ppt', '.pptx', 
            '.rtf', '.md', '.csv', '.xlsx', '.xls',
            '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico'
          ];
          return validExts.includes(ext);
        })
        .map(async (item) => {
          // Extract book info from key
          // Expected format: state/Class-X/Subject/BookName.ext
          const keyParts = item.Key.split('/');
          const fileName = keyParts[keyParts.length - 1];
          const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
          const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
          
          // Try to get metadata from S3 object
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
          
          // Extract state from path (first folder)
          let state = 'All States';
          if (keyParts.length >= 1) {
            const stateFolder = keyParts[0].toLowerCase();
            // Map folder names to state names
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
          
          // Extract class from path (second folder)
          let classNum = metadata.class || '1';
          if (keyParts.length >= 2) {
            const classMatch = keyParts[1].match(/Class-?(\d+)/i);
            if (classMatch) {
              classNum = classMatch[1];
            }
          }
          
          // Extract subject from path (third folder) or metadata
          let subject = metadata.subject || 'General';
          if (keyParts.length >= 3) {
            const subjectFolder = keyParts[2];
            if (subjectFolder && !subjectFolder.match(/Class-?\d+/i)) {
              subject = subjectFolder.replace(/-/g, ' ').replace(/_/g, ' ');
              // Capitalize first letter of each word
              subject = subject.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ');
            }
          }
          
          // If subject is still Generic, try to extract from filename
          if (subject === 'General' && fileNameWithoutExt) {
            const lowerFileName = fileNameWithoutExt.toLowerCase();
            if (lowerFileName.includes('tamil')) subject = 'Tamil';
            else if (lowerFileName.includes('english')) subject = 'English';
            else if (lowerFileName.includes('math')) subject = 'Mathematics';
            else if (lowerFileName.includes('science')) subject = 'Science';
            else if (lowerFileName.includes('social')) subject = 'Social Science';
            else if (lowerFileName.includes('evs') || lowerFileName.includes('environmental')) subject = 'Environmental Science (EVS)';
          }
          
          // Determine language
          const language = metadata.language || 
                          (subject.toLowerCase().includes('tamil') ? 'Tamil' : 
                           subject.toLowerCase().includes('hindi') ? 'Hindi' :
                           subject.toLowerCase().includes('telugu') ? 'Telugu' :
                           subject.toLowerCase().includes('kannada') ? 'Kannada' : 'English');
          
          // Check if mother tongue subject
          const isMotherTongue = subject.toLowerCase().includes('tamil') || 
                                subject.toLowerCase().includes('hindi') ||
                                subject.toLowerCase().includes('telugu') ||
                                subject.toLowerCase().includes('kannada') ||
                                subject.toLowerCase().includes('malayalam') ||
                                subject.toLowerCase().includes('marathi');
          
          // Format file size
          const sizeInMB = (item.Size / (1024 * 1024)).toFixed(2);
          const sizeStr = sizeInMB + ' MB';
          
          return {
            id: item.Key,
            key: item.Key,
            title: metadata.title || fileNameWithoutExt.replace(/-/g, ' ').replace(/_/g, ' '),
            author: metadata.author || 'Unknown',
            fileName: fileName,
            subject: subject,
            class: classNum,
            state: state,
            board: 'State Board',
            medium: metadata.medium || 'both',
            language: language,
            isMotherTongue: isMotherTongue,
            type: metadata.type || 'textbook',
            term: metadata.term || '',
            description: metadata.description || `${subject} textbook for Class ${classNum}`,
            size: sizeStr,
            pages: metadata.pages || 'Unknown',
            format: fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'EPUB',
            lastModified: item.LastModified,
            uploadedBy: metadata.uploadedby || metadata.uploadedBy || 'admin',
            uploadedAt: metadata.uploadedat || metadata.uploadedAt || item.LastModified,
            // Add URLs for viewing and downloading
            downloadUrl: `/api/books/${encodeURIComponent(item.Key)}`,
            viewUrl: `/book-viewer/${encodeURIComponent(item.Key)}`,
            // Additional metadata
            isbn: metadata.isbn || '',
            publisher: metadata.publisher || '',
            publishYear: metadata.publishyear || metadata.publishYear || '',
            isRealBook: true,
            originalFileName: fileName
          };
        })
    );
    
    console.log('✅ Processed books:', books.length);
    if (books.length > 0) {
      console.log('📊 Books by subject:', books.reduce((acc, book) => {
        acc[book.subject] = (acc[book.subject] || 0) + 1;
        return acc;
      }, {}));
      console.log('📚 Sample book:', books[0]);
    }
    
    return books;
  } catch (error) {
    console.error('❌ Error listing books from S3:', error);
    throw error;
  }
}

/**
 * Get presigned URL for a book
 */
export async function getBookUrl(key, expiresIn = 3600) {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const url = await getSignedUrl(client, command, { expiresIn });
    console.log('✅ Generated presigned URL for:', key);
    
    return url;
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    throw error;
  }
}

/**
 * Upload a book to S3
 */
export async function uploadBook(file, metadata) {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    
    // Create S3 key based on metadata
    // Format: state/Class-X/Subject/filename.pdf
    const stateFolder = metadata.state.toLowerCase().replace(/\s+/g, '');
    const classFolder = `Class-${metadata.class}`;
    const subjectFolder = metadata.subject.replace(/\s+/g, '-');
    
    // Use original filename or create one from title
    const fileName = file.originalname || `${metadata.title.replace(/\s+/g, '-')}.pdf`;
    
    const key = `${stateFolder}/${classFolder}/${subjectFolder}/${fileName}`;
    
    console.log('📤 Uploading book to S3:', {
      bucket: bucketName,
      key: key,
      size: file.size,
      type: file.mimetype
    });
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'application/pdf',
      Metadata: {
        title: metadata.title,
        author: metadata.author,
        subject: metadata.subject,
        class: metadata.class.toString(),
        type: metadata.type,
        state: metadata.state,
        medium: metadata.medium,
        language: metadata.language,
        term: metadata.term || '',
        description: metadata.description || '',
        isbn: metadata.isbn || '',
        publisher: metadata.publisher || '',
        publishYear: metadata.publishYear || '',
        uploadedBy: metadata.uploadedBy || '',
        uploadedAt: new Date().toISOString()
      }
    });
    
    await client.send(command);
    
    console.log('✅ Book uploaded successfully to S3:', key);
    
    return {
      success: true,
      key: key,
      bucket: bucketName,
      url: `s3://${bucketName}/${key}`,
      metadata: metadata
    };
    
  } catch (error) {
    console.error('❌ Error uploading book to S3:', error);
    throw error;
  }
}

/**
 * Delete a book from S3
 */
export async function deleteBook(key) {
  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
    
    console.log('🗑️ Deleting book from S3 bucket:', bucketName, 'Key:', key);
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const response = await client.send(command);
    console.log('✅ Book successfully deleted from S3:', key);
    
    return {
      success: true,
      key: key,
      response: response
    };
  } catch (error) {
    console.error('❌ Error deleting book from S3:', error);
    throw error;
  }
}

