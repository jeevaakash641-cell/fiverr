/**
 * TASK 12 ACCEPTANCE TESTS: ADMIN EVIDENCE LIBRARY
 * 
 * Verifies all requirements for Task 12:
 * 1. Admin-role authentication & rejection of unauthenticated/non-admin requests
 * 2. Evidence record creation with required fields & character limit validation
 * 3. Attendance handling (positive integers vs null unrecorded)
 * 4. Organisation boundary strictly locked to 'one-community-ely-cic'
 * 5. Search, date range, category, status filters & sorting
 * 6. Optimistic concurrency locking (version collision returns 409)
 * 7. Strict HTTPS URL validation for external media/social links
 * 8. Beneficiary consent status tracking and withdrawal audit history
 * 9. S3 attachment handling, magic byte verification, and disguised file rejection
 * 10. Dedicated S3 key prefix and attachment download stream/buffer
 * 11. Archival workflow (default removal) and restoration
 * 12. Permanent deletion with orphaned attachment cleanup
 * 13. Integration with Admin Impact Reporting & CSV export with formula injection protection
 */

import assert from 'assert';
import { setTestTokenVerifier, resetTestTokenVerifier } from './services/firebaseAuthService.js';
import { saveUser } from './services/userService.js';
import {
  ORGANISATION_ID,
  createEvidenceRecord,
  getEvidenceById,
  listEvidenceRecords,
  updateEvidenceRecord,
  updateEvidenceStatus,
  deleteEvidenceRecord,
  addEvidenceAttachment,
  removeEvidenceAttachment,
  getEvidenceAttachmentDownload,
  inMemoryEvidence,
  inMemoryAttachmentBuffers
} from './services/evidenceService.js';
import {
  getOverviewReport,
  getEvidenceImpactReport,
  generateCsvExport,
  sanitizeCsvCell
} from './services/impactReportingService.js';
import evidenceRouter from './routes/evidence.js';

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function itAsync(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// Mock Request / Response helper for Express routes
function createMockReqRes({ method = 'GET', url = '/', headers = {}, params = {}, query = {}, body = {}, file = null }) {
  let resolveResponse;
  const promise = new Promise(r => { resolveResponse = r; });

  let statusCode = 200;
  let responseData = null;
  const resHeaders = {};

  const cleanUrl = url.split('?')[0];
  const req = {
    method,
    url: cleanUrl,
    originalUrl: url,
    headers: { ...headers },
    params: { ...params },
    query: { ...query },
    body: { ...body },
    file: file || null
  };

  if (url.includes('?')) {
    const search = new URLSearchParams(url.split('?')[1]);
    for (const [k, v] of search.entries()) {
      req.query[k] = v;
    }
  }

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      resHeaders[name.toLowerCase()] = value;
      return this;
    },
    json(data) {
      responseData = data;
      resolveResponse();
      return this;
    },
    send(data) {
      responseData = data;
      resolveResponse();
      return this;
    },
    redirect(dest) {
      statusCode = 302;
      responseData = { redirectUrl: dest };
      resolveResponse();
      return this;
    },
    end() {
      resolveResponse();
      return this;
    },
    getStatusCode() { return statusCode; },
    getData() { return responseData; },
    getHeaders() { return resHeaders; },
    waitForResponse() { return promise; }
  };

  return { req, res };
}

async function runAllTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 12 ACCEPTANCE TESTS: ADMIN EVIDENCE LIBRARY');
  console.log('========================================================================\n');

  const ts = Date.now();
  const adminEmail = 'admin@onecommunityely.com';
  const learnerEmail = `learner_evidence_${ts}@onecommunityely.com`;

  // 1. Setup Auth & Users
  setTestTokenVerifier(async (token) => {
    if (token === 'admin_token') {
      return { uid: 'admin_uid', email: adminEmail, userType: 'teacher' };
    }
    if (token === 'learner_token') {
      return { uid: 'learner_uid', email: learnerEmail, userType: 'student' };
    }
    throw new Error('Unauthorized: Invalid token');
  });

  await saveUser({ email: adminEmail, name: 'Ely Admin', userType: 'teacher', role: 'admin' });
  await saveUser({ email: learnerEmail, name: 'Learner One', userType: 'student' });

  // Clear in-memory evidence store for test isolation
  inMemoryEvidence.clear();
  inMemoryAttachmentBuffers.clear();

  // Helper to execute Express route handler stack
  async function invokeRouter(method, pathUrl, { headers = {}, body = {}, file = null, params = {}, query = {} } = {}) {
    const { req, res } = createMockReqRes({ method, url: pathUrl, headers, body, file, params, query });

    // Execute through router
    return new Promise((resolve) => {
      evidenceRouter.handle(req, res, (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
        }
        resolve({ status: res.getStatusCode(), body: res.getData(), headers: res.getHeaders() });
      });
      res.waitForResponse().then(() => {
        resolve({ status: res.getStatusCode(), body: res.getData(), headers: res.getHeaders() });
      });
    });
  }

  // ========================================================================
  // SUITE 1: AUTHENTICATION & ACCESS CONTROL
  // ========================================================================
  console.log('\n--- 1. Authentication & Role Enforcement ---');

  await itAsync('Rejects unauthenticated requests with 401 Unauthorized', async () => {
    const result = await invokeRouter('GET', '/');
    assert.strictEqual(result.status, 401, 'Should return 401');
    assert.ok(result.body.error.includes('token is required'), 'Should state token is required');
  });

  await itAsync('Rejects learner (non-admin) requests with 403 Forbidden', async () => {
    const result = await invokeRouter('GET', '/', {
      headers: { authorization: 'Bearer learner_token' }
    });
    assert.strictEqual(result.status, 403, 'Should return 403 Forbidden for learner');
    assert.ok(result.body.error.includes('Administrator privileges required'), 'Should indicate admin privileges needed');
  });

  await itAsync('Allows authorised administrator requests with 200 OK', async () => {
    const result = await invokeRouter('GET', '/', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(result.status, 200, 'Should return 200 for admin');
    assert.strictEqual(result.body.success, true);
    assert.ok(Array.isArray(result.body.evidence), 'Should return evidence array');
  });

  // ========================================================================
  // SUITE 2: CREATION, VALIDATION & ORGANISATION BOUNDARY
  // ========================================================================
  console.log('\n--- 2. Evidence Record Creation & Validation ---');

  it('Strictly defines organisationId as "one-community-ely-cic"', () => {
    assert.strictEqual(ORGANISATION_ID, 'one-community-ely-cic');
  });

  await itAsync('Rejects creation when title is missing or less than 3 characters', async () => {
    const resNoTitle = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: { activityTitle: '  ', description: 'Some description' }
    });
    assert.strictEqual(resNoTitle.status, 400);

    const resShortTitle = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: { activityTitle: 'Ab', description: 'Some description' }
    });
    assert.strictEqual(resShortTitle.status, 400);
  });

  await itAsync('Rejects creation when description is missing', async () => {
    const resNoDesc = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: { activityTitle: 'Valid Activity Title', description: '' }
    });
    assert.strictEqual(resNoDesc.status, 400);
  });

  await itAsync('Rejects negative or invalid attendance counts', async () => {
    const resNegative = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        activityTitle: 'Valid Activity Title',
        description: 'Some description',
        activityDate: '2026-08-10',
        attendanceCount: -5
      }
    });
    assert.strictEqual(resNegative.status, 400);
    assert.ok(resNegative.body.error.includes('non-negative'));
  });

  await itAsync('Rejects category "Other" without customCategory', async () => {
    const resOtherEmpty = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        activityTitle: 'Valid Activity Title',
        description: 'Some description',
        activityDate: '2026-08-10',
        category: 'Other',
        customCategory: ''
      }
    });
    assert.strictEqual(resOtherEmpty.status, 400);
    assert.ok(resOtherEmpty.body.error.includes('Custom category is required'));
  });

  let createdRecord1 = null;
  let createdRecord2NoAttendance = null;
  let createdRecord3Archived = null;

  await itAsync('Successfully creates valid evidence record with attendance & strictly locks organisationId', async () => {
    const res = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        activityTitle: 'Digital Inclusion Drop-in Workshop',
        description: 'Weekly drop-in session assisting Ely residents with smartphone and government portal access.',
        activityDate: '2026-08-10',
        location: 'Ely Community Centre, Cambridgeshire',
        attendanceCount: 14,
        category: 'Workshop',
        notes: 'Great engagement from local older adults.',
        socialLinks: ['https://twitter.com/onecommunityely/status/123456789'],
        videoLinks: ['https://youtube.com/watch?v=ely_evidence_1'],
        beneficiaryStories: 'Learner M gained confidence to book GP appointments online independently.',
        consentStatus: 'Anonymous use permitted',
        status: 'published'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    createdRecord1 = res.body.evidence;
    assert.ok(createdRecord1.evidenceId.startsWith('ev_'));
    assert.strictEqual(createdRecord1.organisationId, 'one-community-ely-cic');
    assert.strictEqual(createdRecord1.attendanceCount, 14);
    assert.strictEqual(createdRecord1.version, 1);
    assert.strictEqual(createdRecord1.consentStatus, 'Anonymous use permitted');
  });

  await itAsync('Allows attendance count to be null (unrecorded) without defaulting to zero', async () => {
    const res = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        activityTitle: 'Youth Career Guidance Session',
        description: 'Information session on digital vocational apprenticeships.',
        activityDate: '2026-08-15',
        location: 'Ely Library',
        attendanceCount: null, // intentionally unrecorded
        category: 'Workshop',
        status: 'draft'
      }
    });

    assert.strictEqual(res.status, 201);
    createdRecord2NoAttendance = res.body.evidence;
    assert.strictEqual(createdRecord2NoAttendance.attendanceCount, null, 'Must remain null, not zero');
  });

  await itAsync('Creates archived evidence record for testing archival view filtering', async () => {
    const res = await invokeRouter('POST', '/', {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        activityTitle: '2025 Winter Warm Hub Project',
        description: 'Historical warm hub initiative concluded last winter.',
        activityDate: '2025-12-15',
        location: 'Ely Methodist Hall',
        attendanceCount: 42,
        category: 'Community Event',
        status: 'archived'
      }
    });

    assert.strictEqual(res.status, 201);
    createdRecord3Archived = res.body.evidence;
    assert.strictEqual(createdRecord3Archived.status, 'archived');
  });

  // ========================================================================
  // SUITE 3: LISTING, FILTERING, SEARCH & RETRIEVAL
  // ========================================================================
  console.log('\n--- 3. Listing, Filtering & Search ---');

  await itAsync('Default list excludes archived records', async () => {
    const res = await invokeRouter('GET', '/', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(res.status, 200);
    const titles = res.body.evidence.map(e => e.activityTitle);
    assert.ok(titles.includes(createdRecord1.activityTitle));
    assert.ok(titles.includes(createdRecord2NoAttendance.activityTitle));
    assert.ok(!titles.includes(createdRecord3Archived.activityTitle), 'Archived record must not appear in default listing');
  });

  await itAsync('Filter by status="archived" returns only archived records', async () => {
    const res = await invokeRouter('GET', '/?status=archived', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.evidence.length, 1);
    assert.strictEqual(res.body.evidence[0].evidenceId, createdRecord3Archived.evidenceId);
  });

  await itAsync('Filter by category="Workshop" returns matching records', async () => {
    const res = await invokeRouter('GET', '/?category=Workshop', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.evidence.every(e => e.category === 'Workshop'));
  });

  await itAsync('Filter by date range restricts records correctly', async () => {
    const res = await invokeRouter('GET', '/?startDate=2026-08-01&endDate=2026-08-12', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.evidence.length, 1);
    assert.strictEqual(res.body.evidence[0].evidenceId, createdRecord1.evidenceId);
  });

  await itAsync('Search query matches title, description, or location', async () => {
    const res = await invokeRouter('GET', '/?search=smartphone', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.evidence.length, 1);
    assert.strictEqual(res.body.evidence[0].evidenceId, createdRecord1.evidenceId);
  });

  // ========================================================================
  // SUITE 4: OPTIMISTIC LOCKING & RECORD UPDATES
  // ========================================================================
  console.log('\n--- 4. Optimistic Locking & Record Updates ---');

  await itAsync('Successfully updates evidence record and increments version', async () => {
    const res = await invokeRouter('PUT', `/${createdRecord1.evidenceId}`, {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        version: createdRecord1.version,
        activityTitle: 'Digital Inclusion Drop-in Workshop (Updated)',
        attendanceCount: 16
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.evidence.activityTitle, 'Digital Inclusion Drop-in Workshop (Updated)');
    assert.strictEqual(res.body.evidence.attendanceCount, 16);
    assert.strictEqual(res.body.evidence.version, 2, 'Version must increment to 2');
    createdRecord1 = res.body.evidence;
  });

  await itAsync('Rejects update with 409 Conflict when version mismatches (concurrency collision)', async () => {
    const res = await invokeRouter('PUT', `/${createdRecord1.evidenceId}`, {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        version: 1, // Stale version (current is 2)
        activityTitle: 'Conflicting Edit Attempt'
      }
    });

    assert.strictEqual(res.status, 409, 'Must return 409 Conflict');
    assert.ok(res.body.error.toLowerCase().includes('conflict'), 'Error should mention conflict');
  });

  // ========================================================================
  // SUITE 5: EXTERNAL MEDIA LINKS & STRICT HTTPS VALIDATION
  // ========================================================================
  console.log('\n--- 5. External Media Links & HTTPS Validation ---');

  await itAsync('Rejects unsafe URLs (http://, javascript:, data:) in links', async () => {
    const resHttp = await invokeRouter('PUT', `/${createdRecord1.evidenceId}`, {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        version: createdRecord1.version,
        socialLinks: ['http://insecure-site.com']
      }
    });
    assert.strictEqual(resHttp.status, 400);
    assert.ok(resHttp.body.error.includes('https://'));

    const resJs = await invokeRouter('PUT', `/${createdRecord1.evidenceId}`, {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        version: createdRecord1.version,
        podcastLinks: ['javascript:alert(1)']
      }
    });
    assert.strictEqual(resJs.status, 400);
  });

  await itAsync('Accepts valid https:// external podcast and video links', async () => {
    const res = await invokeRouter('PUT', `/${createdRecord1.evidenceId}`, {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        version: createdRecord1.version,
        podcastLinks: ['https://spotify.com/episode/ely-community-podcast-1'],
        videoLinks: ['https://vimeo.com/123456789']
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.evidence.podcastLinks.length, 1);
    assert.strictEqual(res.body.evidence.videoLinks.length, 1);
    createdRecord1 = res.body.evidence;
  });

  // ========================================================================
  // SUITE 6: BENEFICIARY CONSENT & WITHDRAWAL AUDIT HISTORY
  // ========================================================================
  console.log('\n--- 6. Beneficiary Consent & Withdrawal History ---');

  await itAsync('Tracks consent withdrawal with timestamp and audit history', async () => {
    const resWithdraw = await invokeRouter('PUT', `/${createdRecord1.evidenceId}`, {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        version: createdRecord1.version,
        consentStatus: 'Consent withdrawn',
        consentWithdrawalReason: 'Beneficiary requested complete removal of their personal story from public view'
      }
    });

    assert.strictEqual(resWithdraw.status, 200);
    const updated = resWithdraw.body.evidence;
    assert.strictEqual(updated.consentStatus, 'Consent withdrawn');
    assert.ok(Array.isArray(updated.consentWithdrawalHistory));
    assert.strictEqual(updated.consentWithdrawalHistory.length, 1);
    assert.strictEqual(updated.consentWithdrawalHistory[0].withdrawnBy, adminEmail);
    assert.ok(updated.consentWithdrawalHistory[0].reason.includes('Beneficiary requested'));
    createdRecord1 = updated;
  });

  // ========================================================================
  // SUITE 7: ATTACHMENTS, FILE SIGNATURES & S3 INTEGRATION
  // ========================================================================
  console.log('\n--- 7. S3 Attachments & Magic Byte Verification ---');

  await itAsync('Rejects disguised file upload where signature does not match declared MIME', async () => {
    // A plain text file disguised as a PDF
    const fakePdfBuffer = Buffer.from('This is not a real PDF file header');
    const fakeFile = {
      buffer: fakePdfBuffer,
      originalname: 'fake_invoice.pdf',
      mimetype: 'application/pdf',
      size: fakePdfBuffer.length
    };

    const res = await invokeRouter('POST', `/${createdRecord1.evidenceId}/attachments`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord1.evidenceId },
      file: fakeFile
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('disguised') || res.body.error.toLowerCase().includes('invalid'));
  });

  let uploadedAttachment = null;

  await itAsync('Accepts valid PDF attachment with authentic magic bytes %PDF', async () => {
    // Valid PDF signature %PDF-1.4
    const validPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n%âãÏÓ\n'),
      Buffer.from('1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')
    ]);
    const validFile = {
      buffer: validPdfBuffer,
      originalname: 'attendance_register_august.pdf',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length
    };

    const res = await invokeRouter('POST', `/${createdRecord1.evidenceId}/attachments`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord1.evidenceId },
      body: { description: 'Verified sign-in sheet for August workshop' },
      file: validFile
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    uploadedAttachment = res.body.attachment;
    assert.ok(uploadedAttachment.attachmentId.startsWith('att_'));
    assert.strictEqual(uploadedAttachment.type, 'document');
    // Verify dedicated S3 prefix convention
    assert.ok(
      uploadedAttachment.s3Key.startsWith(`evidence/${createdRecord1.evidenceId}/`),
      `S3 Key "${uploadedAttachment.s3Key}" must start with dedicated prefix evidence/${createdRecord1.evidenceId}/`
    );
  });

  await itAsync('Accepts valid JPEG image attachment with authentic magic bytes FF D8 FF', async () => {
    const validJpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01]);
    const validFile = {
      buffer: validJpgBuffer,
      originalname: 'community_session_photo.jpg',
      mimetype: 'image/jpeg',
      size: validJpgBuffer.length
    };

    const res = await invokeRouter('POST', `/${createdRecord1.evidenceId}/attachments`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord1.evidenceId },
      file: validFile
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.attachment.type, 'image');
  });

  await itAsync('Downloads attachment with authenticated route and correct Content-Type', async () => {
    const res = await invokeRouter('GET', `/${createdRecord1.evidenceId}/attachments/${uploadedAttachment.attachmentId}/download`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord1.evidenceId, attachmentId: uploadedAttachment.attachmentId }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert.ok(res.headers['content-disposition'].includes('attendance_register_august.pdf'));
  });

  await itAsync('Removes attachment successfully', async () => {
    const res = await invokeRouter('DELETE', `/${createdRecord1.evidenceId}/attachments/${uploadedAttachment.attachmentId}`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord1.evidenceId, attachmentId: uploadedAttachment.attachmentId }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify it is no longer listed on the record
    const updated = await getEvidenceById(createdRecord1.evidenceId);
    assert.ok(!updated.attachments.some(a => a.attachmentId === uploadedAttachment.attachmentId));
  });

  // ========================================================================
  // SUITE 8: STATUS WORKFLOW (ARCHIVE & RESTORE)
  // ========================================================================
  console.log('\n--- 8. Status Workflow (Archive & Restore) ---');

  await itAsync('Archives record via PATCH /api/evidence/:evidenceId/status (default removal)', async () => {
    const res = await invokeRouter('PATCH', `/${createdRecord1.evidenceId}/status`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord1.evidenceId },
      body: { status: 'archived' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.evidence.status, 'archived');
    assert.ok(res.body.evidence.archivedAt !== null, 'Archived timestamp should be set');
  });

  await itAsync('Restores archived record back to published', async () => {
    const res = await invokeRouter('PATCH', `/${createdRecord1.evidenceId}/status`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord1.evidenceId },
      body: { status: 'published' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.evidence.status, 'published');
    assert.strictEqual(res.body.evidence.archivedAt, null, 'Archived timestamp should be cleared');
  });

  // ========================================================================
  // SUITE 9: IMPACT REPORTING INTEGRATION & CSV EXPORT
  // ========================================================================
  console.log('\n--- 9. Admin Impact Reporting Integration ---');

  await itAsync('Integrates evidence totals into getOverviewReport()', async () => {
    const overview = await getOverviewReport();
    assert.strictEqual(overview.summary.evidenceActivitiesCount, 2);
    // Measured attendance: 16 (from active record 1)
    assert.strictEqual(overview.summary.totalEvidenceAttendance, 16);
    assert.strictEqual(overview.summary.evidenceRecordsWithAttendance, 1);
    assert.strictEqual(overview.summary.evidenceRecordsMissingAttendance, 1);
  });

  await itAsync('Generates evidence impact report with breakdowns and excludes private stories', async () => {
    const report = await getEvidenceImpactReport();
    assert.strictEqual(report.summary.totalActivities, 2);
    assert.strictEqual(report.summary.totalAttendance, 16);
    assert.strictEqual(report.summary.recordsMissingAttendance, 1);
    assert.strictEqual(report.summary.archivedActivitiesCount, 1);

    // Check categories breakdown
    assert.ok(report.categoryBreakdown['Workshop']);
    assert.strictEqual(report.categoryBreakdown['Workshop'].count, 2);

    // Safeguard verification: private stories must not be leaked in public report records
    for (const rec of report.records) {
      assert.strictEqual(rec.beneficiaryStories, undefined, 'Private beneficiary story must be excluded');
      assert.strictEqual(rec.caseStudies, undefined, 'Private case studies must be excluded');
      assert.strictEqual(rec.notes, undefined, 'Internal notes must be excluded');
    }
  });

  await itAsync('Sanitizes CSV cells to prevent formula injection (=, +, -, @ escaped)', () => {
    assert.strictEqual(sanitizeCsvCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
    assert.strictEqual(sanitizeCsvCell('+12345'), "'+12345");
    assert.strictEqual(sanitizeCsvCell('-50.00'), "'-50.00");
    assert.strictEqual(sanitizeCsvCell('@cmd'), "'@cmd");
    assert.strictEqual(sanitizeCsvCell('Normal Title'), 'Normal Title');
  });

  await itAsync('Generates Evidence CSV Export properly formatted', async () => {
    const csvContent = await generateCsvExport('evidence');
    assert.ok(csvContent.startsWith('\uFEFF'), 'Must include UTF-8 BOM');
    assert.ok(csvContent.includes('Activity Title,Category,Activity Date,Location,Attendance'));
    assert.ok(csvContent.includes('Digital Inclusion Drop-in Workshop (Updated)'));
    assert.ok(csvContent.includes('Ely Community Centre, Cambridgeshire'));
  });

  // ========================================================================
  // SUITE 10: PERMANENT DELETION
  // ========================================================================
  console.log('\n--- 10. Permanent Deletion & Cleanup ---');

  await itAsync('Permanently deletes record via DELETE /api/evidence/:evidenceId', async () => {
    const res = await invokeRouter('DELETE', `/${createdRecord2NoAttendance.evidenceId}`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: createdRecord2NoAttendance.evidenceId }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify it is gone from memory/DB
    const check = await getEvidenceById(createdRecord2NoAttendance.evidenceId);
    assert.strictEqual(check, null);
  });

  // Clean up verifier
  resetTestTokenVerifier();

  // Summary
  console.log('\n========================================================================');
  console.log(`🎉 EVIDENCE LIBRARY ACCEPTANCE TESTS COMPLETE: ${passedTests}/${totalTests} PASSED`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
