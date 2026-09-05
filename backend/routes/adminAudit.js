/**
 * Admin Audit Routes — One Community Ely Online Training Centre
 * Endpoints for querying administrative audit logs, statistics, and generating CSV exports.
 */

import express from 'express';
import {
  queryAdminAuditLogs,
  getAdminAuditStats,
  recordAdminAction,
  AuditCategories
} from '../services/adminAuditService.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * 1. GET /api/admin/audit-logs
 * Paginated, filtered, searchable admin audit logs
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      category = 'all',
      adminEmail = 'all',
      result = 'all',
      search = '',
      rangePreset = 'all',
      startDate = '',
      endDate = '',
      sortBy = 'newest',
      page = 1,
      limit = 20
    } = req.query;

    const resultData = await queryAdminAuditLogs({
      category,
      adminEmail,
      result,
      search,
      rangePreset,
      startDate,
      endDate,
      sortBy,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });

    res.json(resultData);
  } catch (err) {
    console.error('GET /api/admin/audit-logs error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin audit logs: ' + err.message
    });
  }
});

/**
 * 2. GET /api/admin/audit-logs/stats
 * Overview KPI metrics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const statsData = await getAdminAuditStats();
    res.json(statsData);
  } catch (err) {
    console.error('GET /api/admin/audit-logs/stats error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin audit stats: ' + err.message
    });
  }
});

/**
 * 3. GET /api/admin/audit-logs/export-csv
 * Generates downloadable CSV with CSV Formula Injection protection
 */
router.get('/export-csv', requireAdmin, async (req, res) => {
  try {
    const {
      category = 'all',
      adminEmail = 'all',
      result = 'all',
      search = '',
      rangePreset = 'all',
      startDate = '',
      endDate = ''
    } = req.query;

    // Fetch matching logs without pagination limit (up to 5000 records)
    const resultData = await queryAdminAuditLogs({
      category,
      adminEmail,
      result,
      search,
      rangePreset,
      startDate,
      endDate,
      sortBy: 'newest',
      page: 1,
      limit: 5000
    });

    const logs = resultData.logs || [];

    // Audit the export action itself
    await recordAdminAction({
      admin: req.adminUser,
      action: 'Exported Admin Activity History CSV',
      category: AuditCategories.REPORTS,
      targetType: 'AuditLog',
      targetName: `CSV Export (${logs.length} records)`,
      result: 'Success',
      description: `${req.adminUser?.name || req.adminUser?.email} exported filtered admin audit history CSV with ${logs.length} records.`,
      metadata: { filterCategory: category, filterResult: result, recordCount: logs.length },
      req
    });

    // CSV header row
    const headers = [
      'Date & Time (UTC)',
      'Admin Name',
      'Admin Email',
      'Action',
      'Category',
      'Target Type',
      'Target Name',
      'Result',
      'Description',
      'Changed Fields',
      'Request ID',
      'IP Address'
    ];

    // Helper to sanitize CSV field to prevent formula injection (=, +, -, @, \t, \r)
    const safeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      // Neutralize formula injection
      if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@') || str.startsWith('\t')) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = logs.map(l => {
      return [
        safeCsvCell(l.timestamp),
        safeCsvCell(l.adminNameSnapshot),
        safeCsvCell(l.adminEmailSnapshot),
        safeCsvCell(l.action),
        safeCsvCell(l.category),
        safeCsvCell(l.targetType),
        safeCsvCell(l.targetNameSnapshot),
        safeCsvCell(l.result),
        safeCsvCell(l.description),
        safeCsvCell((l.changedFields || []).join(', ')),
        safeCsvCell(l.requestId),
        safeCsvCell(l.ipAddress || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `one_community_ely_admin_audit_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('GET /api/admin/audit-logs/export-csv error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audit CSV: ' + err.message
    });
  }
});

/**
 * 4. POST /api/admin/audit-logs/log-event
 * Client-initiated authorized admin events (Login, Logout, UI view of sensitive report)
 */
router.post('/log-event', requireAdmin, async (req, res) => {
  try {
    const {
      action,
      category = AuditCategories.ADMINS_SETTINGS,
      targetType = 'System',
      targetId = '',
      targetName = '',
      result = 'Success',
      description = '',
      changedFields = [],
      metadata = {}
    } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: 'action is required' });
    }

    const recorded = await recordAdminAction({
      admin: req.adminUser,
      action,
      category,
      targetType,
      targetId,
      targetName,
      result,
      description,
      changedFields,
      metadata,
      req
    });

    res.status(201).json({
      success: true,
      auditId: recorded?.auditId
    });
  } catch (err) {
    console.error('POST /api/admin/audit-logs/log-event error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to record event: ' + err.message
    });
  }
});

export default router;
