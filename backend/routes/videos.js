import express from 'express';
import multer from 'multer';
import { listVideos, getVideoUrl, uploadVideo, deleteVideo } from '../services/s3VideosService.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for video uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    
    const hasValidType = allowedTypes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
    
    if (hasValidType || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (MP4, WebM, MOV, AVI, MKV)'));
    }
  }
});

// GET /api/videos - List all videos from S3
router.get('/', async (req, res) => {
  try {
    console.log('🎥 Fetching videos from S3...');
    const videos = await listVideos();
    console.log(`✅ Found ${videos.length} videos in S3`);
    res.json(videos);
  } catch (error) {
    console.error('❌ Error fetching videos:', error);
    res.status(500).json({ 
      error: 'Failed to fetch videos',
      message: error.message 
    });
  }
});

// GET /api/videos/:key - Get presigned URL for streaming a video
router.get('/:key(*)/download', async (req, res) => {
  try {
    const key = req.params.key;
    console.log('📥 Getting download URL for video:', key);
    
    // Longer expiration for downloads (4 hours)
    const url = await getVideoUrl(key, 14400);
    
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json({ url, expiresIn: 14400 });
  } catch (error) {
    console.error('❌ Error getting video download URL:', error);
    res.status(500).json({ 
      error: 'Failed to get video download URL',
      message: error.message 
    });
  }
});

// GET /api/videos/:key - Get presigned URL for streaming a video
router.get('/:key(*)', async (req, res) => {
  try {
    const key = req.params.key;
    console.log('🎬 Getting stream URL for video:', key);
    
    // Longer expiration for streaming (4 hours)
    const url = await getVideoUrl(key, 14400);
    
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    res.json({ url, expiresIn: 14400 });
  } catch (error) {
    console.error('❌ Error getting video stream URL:', error);
    res.status(500).json({ 
      error: 'Failed to get video stream URL',
      message: error.message 
    });
  }
});

// POST /api/videos/upload - Upload a video to S3 (Admin only)
router.post('/upload', requireAdmin, upload.single('videoFile'), async (req, res) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🎥 VIDEO UPLOAD REQUEST RECEIVED');
    console.log('='.repeat(60));
    console.log('📁 File:', req.file ? {
      name: req.file.originalname,
      size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: req.file.mimetype,
      buffer: req.file.buffer ? `${req.file.buffer.length} bytes` : 'No buffer'
    } : 'No file');
    console.log('📝 Body:', req.body);
    console.log('🌐 Headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });

    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    if (!req.file.buffer) {
      console.error('❌ File buffer is empty');
      return res.status(400).json({ error: 'File buffer is empty' });
    }

    const {
      title,
      description,
      subject,
      class: videoClass,
      state,
      medium,
      language,
      topic,
      chapter,
      term,
      duration,
      uploadedBy
    } = req.body;

    console.log('✅ Extracted metadata:', {
      title,
      subject,
      class: videoClass,
      state,
      medium,
      language
    });

    // Validate required fields
    if (!title || !subject || !videoClass || !state) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'subject', 'class', 'state'],
        received: { title, subject, class: videoClass, state }
      });
    }

    console.log('🚀 Starting S3 upload...');

    // Upload to S3
    const result = await uploadVideo(req.file, {
      title,
      description: description || '',
      subject,
      class: videoClass,
      state,
      medium: medium || 'both',
      language: language || 'English',
      topic: topic || '',
      chapter: chapter || '',
      term: term || '',
      duration: duration || '',
      uploadedBy: uploadedBy || 'unknown'
    });

    console.log('✅ Video uploaded successfully:', result.key);
    console.log('='.repeat(60) + '\n');
    res.json({
      success: true,
      message: 'Video uploaded successfully',
      video: result
    });

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ VIDEO UPLOAD ERROR');
    console.error('='.repeat(60));
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    res.status(500).json({ 
      error: 'Failed to upload video',
      message: error.message,
      code: error.code,
      details: error.stack
    });
  }
});

// DELETE /api/videos/:key - Delete a video from S3 (Admin only)
router.delete('/:key(*)', requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    console.log('🗑️ Delete request for video:', key);
    
    const result = await deleteVideo(key);
    
    console.log('✅ Video deleted successfully');
    res.json({
      success: true,
      message: 'Video deleted successfully',
      result
    });
  } catch (error) {
    console.error('❌ Error deleting video:', error);
    res.status(500).json({ 
      error: 'Failed to delete video',
      message: error.message 
    });
  }
});

export default router;
