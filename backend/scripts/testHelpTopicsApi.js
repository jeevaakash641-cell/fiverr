/**
 * Automated test script for Help Topics API
 */

import http from 'http';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Help Topics API Tests...\n');
  let passed = 0;
  let failed = 0;

  let adminEmail = 'admin@onecommunityely.com';
  try {
    const userRes = await makeRequest('GET', '/api/users');
    const adminUser = userRes.body?.users?.find(u => u.userType === 'teacher');
    if (adminUser) adminEmail = adminUser.email;
  } catch (e) {}

  try {
    // 1. GET /api/help-topics (Public)
    const listRes = await makeRequest('GET', '/api/help-topics');
    if (listRes.status === 200 && Array.isArray(listRes.body.topics) && listRes.body.topics.length >= 8) {
      console.log(`✅ [1/6] GET /api/help-topics passed. Found ${listRes.body.topics.length} topics.`);
      passed++;
    } else {
      console.error('❌ [1/6] GET /api/help-topics failed:', listRes);
      failed++;
    }

    // 2. GET /api/help-topics/admin (Unauthorized without teacher email)
    const unauthRes = await makeRequest('GET', '/api/help-topics/admin');
    if (unauthRes.status === 401 || unauthRes.status === 403) {
      console.log('✅ [2/6] GET /api/help-topics/admin auth guard verified (rejected unauthenticated).');
      passed++;
    } else {
      console.error('❌ [2/6] GET /api/help-topics/admin auth guard failed:', unauthRes);
      failed++;
    }

    // 3. GET /api/help-topics/admin (Authorized as admin)
    const adminRes = await makeRequest('GET', '/api/help-topics/admin', null, { 'x-user-email': adminEmail });
    if (adminRes.status === 200 && Array.isArray(adminRes.body.topics)) {
      console.log(`✅ [3/6] GET /api/help-topics/admin passed with admin credentials (${adminEmail}). Topics: ${adminRes.body.topics.length}`);
      passed++;
    } else {
      console.error('❌ [3/6] GET /api/help-topics/admin failed with admin:', adminRes);
      failed++;
    }

    // 4. POST /api/help-topics (Create new topic)
    const newTopicPayload = {
      label: 'Confidence & Job Interview Practice',
      category: 'Employment and Personal Development',
      description: 'Practice real-world job interview questions and techniques',
      keywords: ['interview', 'confidence', 'job', 'practice', 'speaking'],
      orderIndex: 99
    };
    const createRes = await makeRequest('POST', '/api/help-topics', newTopicPayload, { 'x-user-email': adminEmail });
    let createdTopicId = null;
    if (createRes.status === 201 && createRes.body.topic?.topicId) {
      createdTopicId = createRes.body.topic.topicId;
      console.log(`✅ [4/6] POST /api/help-topics passed. Created topicId: ${createdTopicId}`);
      passed++;
    } else {
      console.error('❌ [4/6] POST /api/help-topics failed:', createRes);
      failed++;
    }

    // 5. PUT /api/help-topics/:topicId (Update topic)
    if (createdTopicId) {
      const updatePayload = {
        label: 'Confidence & Job Interview Mastery (Updated)',
        category: 'Employment and Personal Development',
        description: 'Comprehensive job readiness, CVs, and interview mastery'
      };
      const updateRes = await makeRequest('PUT', `/api/help-topics/${createdTopicId}`, updatePayload, { 'x-user-email': adminEmail });
      if (updateRes.status === 200 && updateRes.body.topic?.label.includes('Updated')) {
        console.log(`✅ [5/6] PUT /api/help-topics/${createdTopicId} passed.`);
        passed++;
      } else {
        console.error('❌ [5/6] PUT /api/help-topics failed:', updateRes);
        failed++;
      }

      // 6. DELETE /api/help-topics/:topicId (Delete topic)
      const deleteRes = await makeRequest('DELETE', `/api/help-topics/${createdTopicId}`, null, { 'x-user-email': adminEmail });
      if (deleteRes.status === 200) {
        console.log(`✅ [6/6] DELETE /api/help-topics/${createdTopicId} passed.`);
        passed++;
      } else {
        console.error('❌ [6/6] DELETE /api/help-topics failed:', deleteRes);
        failed++;
      }
    } else {
      console.warn('⚠️ Skipping update and delete tests due to create failure.');
      failed += 2;
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log(`\n================================`);
  console.log(`Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
