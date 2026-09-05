/**
 * Admin Impact Reporting Routes
 * Base path: /api/impact-reports
 * All endpoints require verified Administrator privileges.
 */

import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  parseFilters,
  getOverviewReport,
  getLearnerActivityReport,
  getCoursePerformanceReport,
  getQuizResultsReport,
  getOutcomesReport,
  getFeedbackReport,
  getCertificatesReport,
  getEvidenceImpactReport,
  generateCsvExport
} from '../services/impactReportingService.js';

const router = express.Router();

// Apply requireAdmin middleware to all reporting routes
router.use(requireAdmin);

/**
 * Helper error wrapper for filter parsing and execution
 */
function handleReportRequest(reportFn) {
  return async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const data = await reportFn(filters);
      res.json({
        success: true,
        data
      });
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({
        success: false,
        error: err.message
      });
    }
  };
}

/**
 * 1. GET /overview
 */
router.get('/overview', handleReportRequest(getOverviewReport));

/**
 * 2. GET /learners
 */
router.get('/learners', handleReportRequest(getLearnerActivityReport));

/**
 * 3. GET /courses
 */
router.get('/courses', handleReportRequest(getCoursePerformanceReport));

/**
 * 4. GET /quizzes
 */
router.get('/quizzes', handleReportRequest(getQuizResultsReport));

/**
 * 5. GET /outcomes
 */
router.get('/outcomes', handleReportRequest(getOutcomesReport));

/**
 * 6. GET /feedback
 */
router.get('/feedback', handleReportRequest(getFeedbackReport));

/**
 * 7. GET /certificates
 */
router.get('/certificates', handleReportRequest(getCertificatesReport));

/**
 * 8. GET /evidence
 */
router.get('/evidence', handleReportRequest(getEvidenceImpactReport));

/**
 * 9. GET /export/csv
 * Query params: type (learners|courses|quizzes|outcomes|feedback|certificates)
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Export type parameter is required (learners, courses, quizzes, outcomes, feedback, certificates)'
      });
    }

    const filters = parseFilters(req.query);
    const csvContent = await generateCsvExport(type, filters);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `one_community_ely_${type}_report_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
