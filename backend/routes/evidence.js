/**
 * Evidence Library Routes — One Community Ely Online Training Centre
 * Secure Admin-only routes for recording and managing community activity evidence.
 */

import express from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/auth.js';
import {
  createEvidenceRecord,
  getEvidenceById,
  listEvidenceRecords,
  updateEvidenceRecord,
  updateEvidenceStatus,
  deleteEvidenceRecord,
  addEvidenceAttachment,
  removeEvidenceAttachment,
  getEvidenceAttachmentDownload
} from '../services/evidenceService.js';
import {
  generateAllAutomaticEvidence,
  refreshAutomaticEvidenceRecord,
  updateAutomaticEvidenceNotes,
  getAutomaticEvidenceExport
} from '../services/automaticEvidenceService.js';
import { recordAdminAction, AuditCategories } from '../services/adminAuditService.js';

const router = express.Router();

// Multer memory storage configuration for attachments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'video/mp4',
      'video/webm'
    ];
    if (allowedMimes.includes((file.mimetype || '').toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: Images (JPEG, PNG, WebP), Documents (PDF, DOC, DOCX), and small Videos (MP4, WebM).`));
    }
  }
});

// Protect all evidence routes with Admin verification
router.use(requireAdmin);

/**
 * 1. GET /api/evidence
 * List evidence records with search, filter, sort, and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      source,
      search,
      category,
      status,
      startDate,
      endDate,
      sort,
      page,
      limit
    } = req.query;

    const result = await listEvidenceRecords({
      source,
      search,
      category,
      status,
      startDate,
      endDate,
      sort,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      records: result.records,
      evidence: result.records,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('GET /api/evidence error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --- AUTOMATIC EVIDENCE ROUTES ---
 */

/**
 * GET /api/evidence/automatic
 * List only automatically generated platform evidence
 */
router.get('/automatic', async (req, res) => {
  try {
    const result = await listEvidenceRecords({
      ...req.query,
      source: 'automatic'
    });

    res.status(200).json({
      success: true,
      records: result.records,
      evidence: result.records,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('GET /api/evidence/automatic error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/evidence/automatic/generate
 * Scan platform activity and generate/update all automatic evidence records
 */
router.post('/automatic/generate', async (req, res) => {
  try {
    const summaries = await generateAllAutomaticEvidence(req.body || {}, req.user);

    await recordAdminAction({
      admin: req.user,
      action: 'Generated Automatic Evidence',
      category: AuditCategories.EVIDENCE_LIBRARY,
      targetType: 'EvidenceSummary',
      targetName: `Generated ${summaries.length} Summaries`,
      result: 'Success',
      description: `${req.user?.name || req.user?.email} generated and refreshed ${summaries.length} automatic platform evidence records`,
      metadata: { count: summaries.length },
      req
    });

    res.status(200).json({
      success: true,
      message: `Generated and refreshed ${summaries.length} automatic platform evidence summaries.`,
      summaries,
      count: summaries.length
    });
  } catch (err) {
    console.error('POST /api/evidence/automatic/generate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/evidence/automatic/refresh
 * Refresh a single automatic evidence record or all automatic records
 */
router.post('/automatic/refresh', async (req, res) => {
  try {
    const { evidenceId } = req.body || {};
    const result = await refreshAutomaticEvidenceRecord(evidenceId, req.user);

    await recordAdminAction({
      admin: req.user,
      action: 'Refreshed Automatic Evidence',
      category: AuditCategories.EVIDENCE_LIBRARY,
      targetType: 'EvidenceRecord',
      targetId: evidenceId || 'all',
      targetName: result?.activityTitle || 'Automatic Evidence',
      result: 'Success',
      description: `${req.user?.name || req.user?.email} refreshed automatic evidence record (${evidenceId || 'all'})`,
      req
    });

    res.status(200).json({
      success: true,
      message: 'Automatic evidence refreshed successfully from platform activity.',
      evidence: result
    });
  } catch (err) {
    console.error('POST /api/evidence/automatic/refresh error:', err);
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/evidence/automatic/:evidenceId/export
 * Download CSV export for a specific automatic evidence record
 */
router.get('/automatic/:evidenceId/export', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const csvContent = await getAutomaticEvidenceExport(evidenceId);
    const filename = `automatic-evidence-${evidenceId}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('GET /api/evidence/automatic/:evidenceId/export error:', err);
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/evidence/automatic/:evidenceId/notes
 * Admin review: update notes, outcome summary, status, attachments, and external links
 */
router.patch('/automatic/:evidenceId/notes', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const updated = await updateAutomaticEvidenceNotes(evidenceId, req.body || {}, req.user);
    res.status(200).json({
      success: true,
      message: 'Automatic evidence notes and review saved successfully.',
      evidence: updated
    });
  } catch (err) {
    console.error('PATCH /api/evidence/automatic/:evidenceId/notes error:', err);
    const status = err.statusCode || (err.message.includes('not found') ? 404 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/evidence/automatic/:evidenceId
 * Retrieve a single automatic evidence record
 */
router.get('/automatic/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const record = await getEvidenceById(evidenceId);
    if (!record || record.source !== 'automatic') {
      return res.status(404).json({ success: false, error: 'Automatic evidence record not found.' });
    }
    res.status(200).json({
      success: true,
      evidence: record
    });
  } catch (err) {
    console.error('GET /api/evidence/automatic/:evidenceId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --- MANUAL EVIDENCE CONVENIENCE ROUTES ---
 */

/**
 * GET /api/evidence/manual
 * List only manually created community evidence records
 */
router.get('/manual', async (req, res) => {
  try {
    const result = await listEvidenceRecords({
      ...req.query,
      source: 'manual'
    });
    res.status(200).json({
      success: true,
      records: result.records,
      evidence: result.records,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('GET /api/evidence/manual error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/evidence/manual
 * Create a new manual evidence record
 */
router.post('/manual', async (req, res) => {
  try {
    const record = await createEvidenceRecord({ ...req.body, source: 'manual' }, req.user);
    res.status(201).json({
      success: true,
      message: 'Manual community evidence record created successfully.',
      evidence: record
    });
  } catch (err) {
    console.error('POST /api/evidence/manual error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/evidence
 * Create a new evidence record
 */
router.post('/', async (req, res) => {
  try {
    const record = await createEvidenceRecord(req.body, req.user);

    await recordAdminAction({
      admin: req.user,
      action: 'Created Manual Evidence',
      category: AuditCategories.EVIDENCE_LIBRARY,
      targetType: 'EvidenceRecord',
      targetId: record.evidenceId,
      targetName: record.activityTitle,
      result: 'Success',
      description: `${req.user?.name || req.user?.email} created manual evidence "${record.activityTitle}" (${record.evidenceId})`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Evidence record created successfully.',
      evidence: record
    });
  } catch (err) {
    console.error('POST /api/evidence error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/evidence/:evidenceId
 * Retrieve a single evidence record
 */
router.get('/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const record = await getEvidenceById(evidenceId);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Evidence record not found.' });
    }

    res.status(200).json({
      success: true,
      evidence: record
    });
  } catch (err) {
    console.error('GET /api/evidence/:evidenceId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. PUT /api/evidence/:evidenceId
 * Update an evidence record with optimistic locking / versioning
 */
router.put('/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const updated = await updateEvidenceRecord(evidenceId, req.body, req.user);

    await recordAdminAction({
      admin: req.user,
      action: 'Edited Evidence Record',
      category: AuditCategories.EVIDENCE_LIBRARY,
      targetType: 'EvidenceRecord',
      targetId: updated.evidenceId,
      targetName: updated.activityTitle,
      result: 'Success',
      description: `${req.user?.name || req.user?.email} updated evidence record "${updated.activityTitle}"`,
      changedFields: Object.keys(req.body),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Evidence record updated successfully.',
      evidence: updated
    });
  } catch (err) {
    console.error('PUT /api/evidence/:evidenceId error:', err);
    const status = err.statusCode || (err.message.includes('not found') ? 404 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * 5. PATCH /api/evidence/:evidenceId/status
 * Archive, restore, or change status of an evidence record
 */
router.patch('/:evidenceId/status', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }

    const updated = await updateEvidenceStatus(evidenceId, status, req.user);

    await recordAdminAction({
      admin: req.user,
      action: status === 'archived' ? 'Archived Evidence' : 'Updated Evidence Status',
      category: AuditCategories.EVIDENCE_LIBRARY,
      targetType: 'EvidenceRecord',
      targetId: updated.evidenceId,
      targetName: updated.activityTitle,
      result: 'Success',
      description: `${req.user?.name || req.user?.email} changed evidence status of "${updated.activityTitle}" to ${status}`,
      metadata: { newStatus: status },
      req
    });

    res.status(200).json({
      success: true,
      message: `Evidence record status changed to ${status}.`,
      evidence: updated
    });
  } catch (err) {
    console.error('PATCH /api/evidence/:evidenceId/status error:', err);
    const status = err.statusCode || (err.message.includes('not found') ? 404 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * 6. DELETE /api/evidence/:evidenceId
 * Permanently delete an evidence record (and clean up S3 attachments)
 */
router.delete('/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const result = await deleteEvidenceRecord(evidenceId, req.user);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('DELETE /api/evidence/:evidenceId error:', err);
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * 7. POST /api/evidence/:evidenceId/attachments
 * Upload and attach file (Image, PDF, DOCX, Video) to evidence record
 */
router.post('/:evidenceId/attachments', upload.single('file'), async (req, res) => {
  try {
    const { evidenceId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File upload is required.' });
    }

    const description = req.body.description || '';
    const attachment = await addEvidenceAttachment(evidenceId, req.file, description, req.user);

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded and linked successfully.',
      attachment
    });
  } catch (err) {
    console.error('POST /api/evidence/:evidenceId/attachments error:', err);
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * 8. DELETE /api/evidence/:evidenceId/attachments/:attachmentId
 * Remove attachment from evidence record
 */
router.delete('/:evidenceId/attachments/:attachmentId', async (req, res) => {
  try {
    const { evidenceId, attachmentId } = req.params;
    const result = await removeEvidenceAttachment(evidenceId, attachmentId, req.user);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('DELETE /api/evidence/:evidenceId/attachments/:attachmentId error:', err);
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * 9. GET /api/evidence/:evidenceId/attachments/:attachmentId/download
 * Authenticated download or redirect for an attachment
 */
router.get('/:evidenceId/attachments/:attachmentId/download', async (req, res) => {
  try {
    const { evidenceId, attachmentId } = req.params;
    const result = await getEvidenceAttachmentDownload(evidenceId, attachmentId);

    if (result.type === 'redirect') {
      return res.redirect(result.url);
    }

    // Direct buffer response
    const filename = result.filename || 'attachment';
    const safeAsciiFilename = filename.replace(/[^\x20-\x7E]/g, '');
    res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(result.buffer);
  } catch (err) {
    console.error('GET /api/evidence/:evidenceId/attachments/:attachmentId/download error:', err);
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

export default router;
