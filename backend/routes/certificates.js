/**
 * Certificate of Completion Routes
 * One Community Ely Online Training Centre
 */

import express from 'express';
import multer from 'multer';
import {
  checkCertificateEligibility,
  issueCertificate,
  getCertificateById,
  getLearnerCertificates,
  getAllCertificatesAdmin,
  revokeCertificate,
  verifyCertificatePublic,
  generateCertificatePDF,
  getActiveCertificateTemplate,
  saveCertificateTemplate,
  resetCertificateTemplate,
  formatCertificateFileName
} from '../services/certificateService.js';
import { requireAuth, requireAdmin, requireLearner } from '../middleware/auth.js';
import { recordAdminAction, AuditCategories } from '../services/adminAuditService.js';

const router = express.Router();

const templateUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Supported formats: PNG, JPG, JPEG, WebP, SVG, and PDF documents.'));
    }
  }
});

/**
 * 1. GET /api/certificates/course/:courseId/eligibility
 * Check if learner meets all requirements to issue a certificate
 */
router.get('/course/:courseId/eligibility', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const cleanEmail = req.user.email;

    const result = await checkCertificateEligibility(courseId, cleanEmail);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('GET /api/certificates/course/:courseId/eligibility error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/certificates/course/:courseId/issue and POST /api/certificates/issue
 * Issue certificate of completion (Learner only, idempotent)
 */
router.post('/course/:courseId/issue', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const result = await issueCertificate(courseId, req.user);
    res.status(200).json({
      success: true,
      alreadyIssued: result.alreadyIssued,
      newlyIssued: result.newlyIssued,
      certificate: result.certificate,
      message: result.alreadyIssued
        ? 'Your existing certificate has been retrieved.'
        : 'Congratulations! Your certificate of completion has been issued.'
    });
  } catch (err) {
    console.error('POST /api/certificates/course/:courseId/issue error:', err);
    const statusCode = err.ineligible ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      requirements: err.requirements
    });
  }
});

router.post('/issue', requireAuth, async (req, res) => {
  try {
    const courseId = req.body?.courseId || req.query?.courseId;
    if (!courseId) {
      return res.status(400).json({ success: false, error: 'courseId is required' });
    }
    const result = await issueCertificate(courseId, req.user);
    res.status(200).json({
      success: true,
      alreadyIssued: result.alreadyIssued,
      newlyIssued: result.newlyIssued,
      certificate: result.certificate,
      message: result.alreadyIssued
        ? 'Your existing certificate has been retrieved.'
        : 'Congratulations! Your certificate of completion has been issued.'
    });
  } catch (err) {
    console.error('POST /api/certificates/issue error:', err);
    const statusCode = err.ineligible ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      requirements: err.requirements
    });
  }
});

/**
 * 3. GET /api/certificates/my-certificates
 * List all certificates for authenticated learner
 */
router.get('/my-certificates', requireAuth, async (req, res) => {
  try {
    const cleanEmail = req.user.email;
    const certs = await getLearnerCertificates(cleanEmail);
    res.status(200).json({
      success: true,
      certificates: certs,
      count: certs.length
    });
  } catch (err) {
    console.error('GET /api/certificates/my-certificates error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET /api/certificates/verify/:certificateNumber
 * Public, safe verification endpoint (No Auth required)
 */
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;
    const result = await verifyCertificatePublic(certificateNumber);
    res.status(200).json({
      success: true,
      verification: result
    });
  } catch (err) {
    console.error('GET /api/certificates/verify/:certificateNumber error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. GET /api/certificates/admin
 * List all certificates for Admin with filters & search
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { courseId, status, search } = req.query;
    const certs = await getAllCertificatesAdmin({ courseId, status, search });
    res.status(200).json({
      success: true,
      certificates: certs,
      totalCount: certs.length
    });
  } catch (err) {
    console.error('GET /api/certificates/admin error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. PATCH /api/certificates/admin/:certificateId/revoke
 * Revoke certificate with required audit reason (Admin only)
 */
router.patch('/admin/:certificateId/revoke', requireAdmin, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { reason } = req.body || {};
    const updated = await revokeCertificate(certificateId, reason, req.user.email);

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Revoked Certificate',
      category: AuditCategories.CERTIFICATES,
      targetType: 'Certificate',
      targetId: certificateId,
      targetName: updated?.certificateNumber || certificateId,
      result: 'Success',
      description: `${req.adminUser?.name || req.adminUser?.email} revoked certificate (${updated?.certificateNumber || certificateId}). Reason: ${reason || 'N/A'}`,
      metadata: { learnerEmail: updated?.learnerEmail, courseId: updated?.courseId, reason },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Certificate has been revoked successfully.',
      certificate: updated
    });
  } catch (err) {
    console.error('PATCH /api/certificates/admin/:certificateId/revoke error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 7. GET /api/certificates/template
 * Retrieve active certificate template info and preview data
 */
router.get('/template', async (req, res) => {
  try {
    const template = getActiveCertificateTemplate();
    res.status(200).json({
      success: true,
      template
    });
  } catch (err) {
    console.error('GET /api/certificates/template error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. POST /api/certificates/template/upload
 * Admin: Upload a custom certificate demo/template file
 */
router.post('/template/upload', requireAdmin, templateUpload.single('templateFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please select a certificate template file to upload.'
      });
    }

    const result = saveCertificateTemplate({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.email
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('POST /api/certificates/template/upload error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 9. DELETE /api/certificates/template
 * Admin: Reset certificate template to system default
 */
router.delete('/template', requireAdmin, async (req, res) => {
  try {
    const result = resetCertificateTemplate();
    res.status(200).json(result);
  } catch (err) {
    console.error('DELETE /api/certificates/template error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 10. GET /api/certificates/:certificateId
 * View single certificate metadata
 */
router.get('/:certificateId', requireAuth, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const cert = await getCertificateById(certificateId);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    // Ownership check: must be owner or Admin
    const isOwner = cert.learnerEmail === req.user.email;
    const isAdmin = ['admin', 'teacher'].includes(req.user.userType) || req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied to this certificate.' });
    }

    res.status(200).json({
      success: true,
      certificate: cert
    });
  } catch (err) {
    console.error('GET /api/certificates/:certificateId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 11. GET /api/certificates/:certificateId/download
 * Download official certificate PDF buffer with dynamic filename based on User, Course and Date
 */
router.get('/:certificateId/download', requireAuth, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const cert = await getCertificateById(certificateId);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    // Ownership check: must be owner or Admin
    const isOwner = cert.learnerEmail === req.user.email;
    const isAdmin = ['admin', 'teacher'].includes(req.user.userType) || req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied to this certificate.' });
    }

    // Check if revoked
    if (cert.status === 'revoked' && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'This certificate has been revoked and cannot be downloaded.'
      });
    }

    // Always generate fresh PDF using active template with dynamic learner, course and date fields
    const pdfBuffer = await generateCertificatePDF(cert);

    const filename = formatCertificateFileName(cert, 'pdf');
    const safeAsciiFilename = filename.replace(/[^\x20-\x7E]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('GET /api/certificates/:certificateId/download error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
