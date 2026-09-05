import express from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/auth.js';
import { generateCourseFromDocument } from '../services/courseGenerationService.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF or DOCX for automatic course generation
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Automatic course generation is currently available for PDF and DOCX files only.'));
    }
  }
});

/**
 * POST /api/resources/generate-course
 * Upload document to S3 and generate Draft course hierarchy (Admin only)
 */
router.post('/generate-course', requireAdmin, (req, res, next) => {
  upload.single('bookFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No document file provided for course generation'
      });
    }

    const {
      title,
      author,
      subject,
      class: bookClass,
      type,
      state,
      medium,
      language,
      description,
      isbn,
      publisher,
      publishYear,
      courseTitle,
      includeExtractedText,
      attachOriginalDocument
    } = req.body;

    const metadata = {
      title: title || req.file.originalname,
      author: author || 'One Community Ely',
      subject: subject || 'Work & Life Skills',
      class: bookClass || 'All',
      type: type || 'guide',
      state: state || 'All',
      medium: medium || 'both',
      language: language || 'English',
      description: description || '',
      isbn: isbn || '',
      publisher: publisher || 'One Community Ely',
      publishYear: publishYear || new Date().getFullYear().toString()
    };

    const options = {
      courseTitle: courseTitle || title || req.file.originalname,
      includeExtractedText: includeExtractedText !== 'false' && includeExtractedText !== false,
      attachOriginalDocument: attachOriginalDocument !== 'false' && attachOriginalDocument !== false
    };

    const adminEmail = req.adminUser?.email || 'admin@onecommunityely.com';

    const result = await generateCourseFromDocument(req.file, metadata, options, adminEmail);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        resourceUploaded: result.resourceUploaded || false,
        resource: result.resource || null,
        error: result.error || 'Course generation failed',
        message: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Draft Course Generated Successfully',
      ...result
    });
  } catch (err) {
    console.error('POST /api/resources/generate-course error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate draft course: ' + err.message
    });
  }
});

export default router;
