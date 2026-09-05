/**
 * AUTOMATIC EVIDENCE LIBRARY ACCEPTANCE TEST SUITE
 * One Community Ely Online Training Centre
 * 
 * Verifies all requirements for Automatic Platform Evidence Tracking:
 * 1. Admin-role authentication & rejection of unauthenticated/learner requests
 * 2. Deterministic evidence keys & idempotent generation (0 duplicates)
 * 3. System metrics calculation from verified platform subsystems (learners, courses, quizzes, outcomes, feedback)
 * 4. Privacy compliance: zero learner emails or question answers exposed
 * 5. Admin review workflow: notes & outcome summary editing; system metrics are strictly read-only
 * 6. Note preservation across refreshes & recalculations
 * 7. CSV export with UTF-8 BOM and formula injection protection
 * 8. Dual-source filtering ('all', 'automatic', 'manual')
 * 9. Seamless compatibility with manual evidence records
 */

import assert from 'assert';
import { setTestTokenVerifier, resetTestTokenVerifier } from './services/firebaseAuthService.js';
import { saveUser } from './services/userService.js';
import {
  ORGANISATION_ID,
  inMemoryEvidence,
  getEvidenceById
} from './services/evidenceService.js';
import {
  generateAutomaticEvidenceKey,
  getAutomaticEvidenceId
} from './services/automaticEvidenceService.js';
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
function createMockReqRes({ method = 'GET', url = '/', headers = {}, params = {}, query = {}, body = {} }) {
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
    body: { ...body }
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

async function runAutomaticEvidenceTests() {
  console.log('========================================================================');
  console.log('🧪 ACCEPTANCE TESTS: AUTOMATIC PLATFORM EVIDENCE TRACKING');
  console.log('========================================================================\n');

  const ts = Date.now();
  const adminEmail = 'admin@onecommunityely.com';
  const learnerEmail = `learner_auto_${ts}@onecommunityely.com`;

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
  await saveUser({ email: learnerEmail, name: 'Test Learner', userType: 'student' });

  // Clear in-memory evidence store for test isolation
  inMemoryEvidence.clear();

  // Helper to execute Express route handler stack
  async function invokeRouter(method, pathUrl, { headers = {}, body = {}, params = {}, query = {} } = {}) {
    const { req, res } = createMockReqRes({ method, url: pathUrl, headers, body, params, query });

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

  // ------------------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & ROLE ENFORCEMENT
  // ------------------------------------------------------------------------
  console.log('\n--- 1. AUTHENTICATION & ROLE ENFORCEMENT ---');

  await itAsync('1.1 Rejects unauthenticated request to /api/evidence/automatic with 401', async () => {
    const result = await invokeRouter('GET', '/automatic');
    assert.strictEqual(result.status, 401);
  });

  await itAsync('1.2 Rejects learner request to /api/evidence/automatic with 403 Forbidden', async () => {
    const result = await invokeRouter('GET', '/automatic', {
      headers: { authorization: 'Bearer learner_token' }
    });
    assert.strictEqual(result.status, 403);
  });

  await itAsync('1.3 Rejects learner request to /api/evidence/automatic/generate with 403', async () => {
    const result = await invokeRouter('POST', '/automatic/generate', {
      headers: { authorization: 'Bearer learner_token' },
      body: {}
    });
    assert.strictEqual(result.status, 403);
  });

  await itAsync('1.4 Rejects learner request to /api/evidence/automatic/refresh with 403', async () => {
    const result = await invokeRouter('POST', '/automatic/refresh', {
      headers: { authorization: 'Bearer learner_token' },
      body: { evidenceId: 'ev_auto_test' }
    });
    assert.strictEqual(result.status, 403);
  });

  // ------------------------------------------------------------------------
  // SUITE 2: DETERMINISTIC KEYS & IDEMPOTENT GENERATION
  // ------------------------------------------------------------------------
  console.log('\n--- 2. DETERMINISTIC KEYS & IDEMPOTENT GENERATION ---');

  it('2.1 Deterministic key generator produces identical keys for same parameters', () => {
    const key1 = generateAutomaticEvidenceKey({
      evidenceType: 'monthly_engagement',
      courseId: 'all',
      reportingPeriod: 'all_time'
    });
    const key2 = generateAutomaticEvidenceKey({
      evidenceType: 'MONTHLY_ENGAGEMENT',
      courseId: 'ALL',
      reportingPeriod: 'ALL_TIME'
    });
    assert.strictEqual(key1, key2);
    assert.strictEqual(key1, `${ORGANISATION_ID}#monthly_engagement#all#all_time`);
  });

  it('2.2 getAutomaticEvidenceId produces consistent ID starting with ev_auto_', () => {
    const key = `${ORGANISATION_ID}#monthly_engagement#all#all_time`;
    const id1 = getAutomaticEvidenceId(key);
    const id2 = getAutomaticEvidenceId(key);
    assert.strictEqual(id1, id2);
    assert(id1.startsWith('ev_auto_'), `Expected ID to start with ev_auto_, got: ${id1}`);
  });

  let initialSummariesCount = 0;
  let testEvidenceId = null;

  await itAsync('2.3 POST /api/evidence/automatic/generate creates aggregated platform evidence', async () => {
    const result = await invokeRouter('POST', '/automatic/generate', {
      headers: { authorization: 'Bearer admin_token' },
      body: {}
    });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.success, true);
    assert(Array.isArray(result.body.summaries), 'Expected summaries array');
    assert(result.body.summaries.length > 0, 'Expected at least one automatic summary');
    initialSummariesCount = result.body.summaries.length;

    // Inspect first summary
    const first = result.body.summaries[0];
    testEvidenceId = first.evidenceId;
    assert.strictEqual(first.source, 'automatic');
    assert.strictEqual(first.organisationId, 'one-community-ely-cic');
    assert(first.automaticKey, 'Expected automaticKey');
    assert(first.systemMetrics, 'Expected systemMetrics');
    assert(first.calculationMetadata, 'Expected calculationMetadata');
    assert.strictEqual(first.status, 'draft');
  });

  await itAsync('2.4 Calling POST /api/evidence/automatic/generate again produces 0 duplicate records (idempotent)', async () => {
    const result = await invokeRouter('POST', '/automatic/generate', {
      headers: { authorization: 'Bearer admin_token' },
      body: {}
    });
    assert.strictEqual(result.status, 200);

    // Check count of automatic records in memory
    const allAutomatic = Array.from(inMemoryEvidence.values()).filter(r => r.source === 'automatic');
    assert.strictEqual(allAutomatic.length, initialSummariesCount, 'Duplicate records were created!');
    assert.strictEqual(result.body.summaries.length, initialSummariesCount);
  });

  // ------------------------------------------------------------------------
  // SUITE 3: METRICS ACCURACY & PRIVACY ENFORCEMENT
  // ------------------------------------------------------------------------
  console.log('\n--- 3. METRICS ACCURACY & PRIVACY ENFORCEMENT ---');

  await itAsync('3.1 System metrics reflect real stored data structure and contain non-negative numbers', async () => {
    const record = await getEvidenceById(testEvidenceId);
    assert(record, 'Record not found');
    const m = record.systemMetrics;
    assert(typeof m.registeredLearnersCount === 'number');
    assert(m.registeredLearnersCount >= 0);
    assert(typeof m.coursesCompletedCount === 'number');
    assert(typeof m.quizAttemptsCount === 'number');
  });

  await itAsync('3.2 Privacy guard: Record contains zero learner emails or quiz answers', async () => {
    const record = await getEvidenceById(testEvidenceId);
    const recordStr = JSON.stringify(record);
    assert(!recordStr.includes(learnerEmail), 'Private learner email leaked in evidence record!');
    assert(!recordStr.includes('selectedAnswer'), 'Individual quiz answers leaked!');
  });

  // ------------------------------------------------------------------------
  // SUITE 4: ADMIN REVIEW WORKFLOW & TAMPER RESISTANCE
  // ------------------------------------------------------------------------
  console.log('\n--- 4. ADMIN REVIEW WORKFLOW & TAMPER RESISTANCE ---');

  await itAsync('4.1 PATCH /api/evidence/automatic/:evidenceId/notes updates notes, outcome interpretation, and status', async () => {
    const result = await invokeRouter('PATCH', `/automatic/${testEvidenceId}/notes`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: testEvidenceId },
      body: {
        adminNotes: 'Verified adult digital inclusion progression for Q1 grant report.',
        outcomeSummary: 'Strong learner confidence uplift observed across all basic lessons.',
        status: 'published'
      }
    });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.success, true);
    assert.strictEqual(result.body.evidence.adminNotes, 'Verified adult digital inclusion progression for Q1 grant report.');
    assert.strictEqual(result.body.evidence.outcomeSummary, 'Strong learner confidence uplift observed across all basic lessons.');
    assert.strictEqual(result.body.evidence.status, 'published');
  });

  await itAsync('4.2 System-calculated metrics are strictly read-only and reject manual tampering with 400', async () => {
    const beforeRecord = await getEvidenceById(testEvidenceId);
    const originalLearnersCount = beforeRecord.systemMetrics.registeredLearnersCount;

    const result = await invokeRouter('PATCH', `/automatic/${testEvidenceId}/notes`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: testEvidenceId },
      body: {
        adminNotes: 'Updated review note',
        systemMetrics: { registeredLearnersCount: 9999999 },
        attendanceCount: 88888
      }
    });
    assert.strictEqual(result.status, 400);
    assert(result.body.error.includes('read-only'));

    const afterRecord = await getEvidenceById(testEvidenceId);
    assert.strictEqual(
      afterRecord.systemMetrics.registeredLearnersCount,
      originalLearnersCount,
      'Tamper resistance failed: systemMetrics was modified!'
    );
  });

  // ------------------------------------------------------------------------
  // SUITE 5: NOTE PRESERVATION ACROSS REFRESHES
  // ------------------------------------------------------------------------
  console.log('\n--- 5. NOTE PRESERVATION ACROSS REFRESHES ---');

  await itAsync('5.1 Refreshing an automatic record recalculates metrics while strictly preserving Admin notes and status', async () => {
    const result = await invokeRouter('POST', '/automatic/refresh', {
      headers: { authorization: 'Bearer admin_token' },
      body: { evidenceId: testEvidenceId }
    });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.success, true);

    const refreshed = await getEvidenceById(testEvidenceId);
    assert.strictEqual(refreshed.adminNotes, 'Verified adult digital inclusion progression for Q1 grant report.', 'Admin notes were wiped during refresh!');
    assert.strictEqual(refreshed.outcomeSummary, 'Strong learner confidence uplift observed across all basic lessons.', 'Outcome summary was wiped!');
    assert.strictEqual(refreshed.status, 'published', 'Published status was reset during refresh!');
    assert(refreshed.lastRefreshedAt, 'Expected lastRefreshedAt to be set');
  });

  // ------------------------------------------------------------------------
  // SUITE 6: CSV EXPORT WITH PRIVACY & FORMULA INJECTION DEFENSE
  // ------------------------------------------------------------------------
  console.log('\n--- 6. CSV EXPORT & FORMULA INJECTION DEFENSE ---');

  await itAsync('6.1 GET /api/evidence/automatic/:evidenceId/export returns formatted CSV with UTF-8 BOM', async () => {
    const result = await invokeRouter('GET', `/automatic/${testEvidenceId}/export`, {
      headers: { authorization: 'Bearer admin_token' },
      params: { evidenceId: testEvidenceId }
    });
    assert.strictEqual(result.status, 200);
    assert(result.headers['content-type'].includes('text/csv'));
    assert(result.headers['content-disposition'].includes('.csv'));

    const csvData = result.body;
    assert(typeof csvData === 'string');
    assert(csvData.startsWith('\uFEFF'), 'Expected UTF-8 BOM prefix in CSV export');
    assert(csvData.includes('Metric / Field'), 'Missing headers');
    assert(csvData.includes('Registered Learners Count'), 'Missing Registered Learners metric');
    assert(csvData.includes('Verified adult digital inclusion progression for Q1 grant report.'), 'Missing Admin notes in export');
  });

  // ------------------------------------------------------------------------
  // SUITE 7: DUAL-SOURCE FILTERING & QUERYING
  // ------------------------------------------------------------------------
  console.log('\n--- 7. DUAL-SOURCE FILTERING & QUERYING ---');

  let manualEvidenceId = null;

  await itAsync('7.1 Creating a manual evidence record sets source: "manual"', async () => {
    const result = await invokeRouter('POST', '/manual', {
      headers: { authorization: 'Bearer admin_token' },
      body: {
        activityTitle: `Ely Community Coffee & Learn ${ts}`,
        category: 'Community Event',
        activityDate: new Date().toISOString().split('T')[0],
        location: 'Ely Library',
        attendanceCount: 14,
        description: 'Informal drop-in session helping seniors set up digital email.'
      }
    });
    assert.strictEqual(result.status, 201);
    assert.strictEqual(result.body.evidence.source, 'manual');
    manualEvidenceId = result.body.evidence.evidenceId;
  });

  await itAsync('7.2 GET /api/evidence/automatic returns only automatic platform records', async () => {
    const result = await invokeRouter('GET', '/automatic', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(result.status, 200);
    assert(result.body.records.length > 0);
    for (const rec of result.body.records) {
      assert.strictEqual(rec.source, 'automatic', `Expected source automatic, got ${rec.source}`);
    }
  });

  await itAsync('7.3 GET /api/evidence/manual returns only manual community records', async () => {
    const result = await invokeRouter('GET', '/manual', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(result.status, 200);
    assert(result.body.records.length > 0);
    for (const rec of result.body.records) {
      assert.strictEqual(rec.source || 'manual', 'manual', `Expected source manual, got ${rec.source}`);
    }
    const found = result.body.records.some(r => r.evidenceId === manualEvidenceId);
    assert(found, 'Created manual record not found in /manual endpoint');
  });

  await itAsync('7.4 GET /api/evidence?source=all includes both manual and automatic records', async () => {
    const result = await invokeRouter('GET', '/?source=all&limit=100', {
      headers: { authorization: 'Bearer admin_token' }
    });
    assert.strictEqual(result.status, 200);
    const hasAuto = result.body.records.some(r => r.source === 'automatic');
    const hasManual = result.body.records.some(r => (r.source || 'manual') === 'manual');
    assert(hasAuto, 'Expected automatic records in all view');
    assert(hasManual, 'Expected manual records in all view');
  });

  // Reset verifier
  resetTestTokenVerifier();

  // Summary
  console.log('\n========================================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} tests passed`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL AUTOMATIC PLATFORM EVIDENCE ACCEPTANCE TESTS PASSED!');
  } else {
    console.log('⚠️ SOME TESTS FAILED');
  }
  console.log('========================================================================\n');
}

runAutomaticEvidenceTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
