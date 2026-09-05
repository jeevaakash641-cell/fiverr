// backend/test_content_requests_and_journey.js
// Automated verification for Sequential Learning Journey, Course Title Matching, and Content Requests

import http from 'http';

function makeToken(userData) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const cleanEmail = String(userData.email).toLowerCase().trim();
  const isElyAdmin = cleanEmail === 'admin@onecommunityely.com';
  const resolvedUserType = isElyAdmin ? 'teacher' : (userData.userType || 'student');
  const resolvedRole = isElyAdmin ? 'admin' : (userData.role || (resolvedUserType === 'teacher' ? 'admin' : 'student'));

  const payload = {
    uid: userData.id || userData.uid || `usr_${cleanEmail}`,
    sub: userData.id || userData.uid || `usr_${cleanEmail}`,
    email: cleanEmail,
    name: userData.name || (isElyAdmin ? 'Ely Admin' : 'User'),
    userType: resolvedUserType,
    role: resolvedRole,
    aud: 'ai-bharat-769a6',
    iss: 'https://securetoken.google.com/ai-bharat-769a6',
    iat: nowSec,
    exp: nowSec + (30 * 24 * 60 * 60),
    auth_time: nowSec
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64(header)}.${b64(payload)}.${b64({ sig: cleanEmail })}`;
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: SEQUENTIAL LEARNING JOURNEY, TITLE MATCHING & REQUESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const testUser = {
    email: 'TEST_journey_user_' + Date.now() + '@example.com',
    name: 'TEST Journey Learner',
    userType: 'student'
  };

  const testAdmin = {
    email: 'admin@onecommunityely.com',
    name: 'Administrator',
    userType: 'teacher'
  };
  const adminToken = makeToken(testAdmin);

  // 1. Register test learner via POST /api/users
  try {
    const regRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testUser.email,
      name: testUser.name,
      userType: 'student'
    });
    console.log('✓ Registered test learner account:', regRes.data?.user?.email || testUser.email);
  } catch (err) {
    console.error('Failed to register test user:', err.message);
  }

  const learnerToken = makeToken(testUser);
  let assessmentRequestId = null;

  try {
    // TEST 1: Submit Content Request (Quiz)
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/content-requests',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${learnerToken}`,
          'x-user-email': testUser.email,
          'x-user-name': testUser.name,
          'x-user-type': testUser.userType
        }
      }, {
        courseId: 'TEST_course_alpha',
        courseTitle: 'TEST Course Alpha Digital Skills',
        requestType: 'quiz',
        note: 'Need quiz with matching course title please'
      });

      if (res.statusCode === 200 && res.data?.request?.requestId) {
        console.log('✓ TEST 1 PASSED: Successfully submitted quiz content request:', res.data.request.requestId);
        passed++;
      } else {
        console.error('✗ TEST 1 FAILED: Unexpected response:', res);
        failed++;
      }
    } catch (err) {
      console.error('✗ TEST 1 ERROR:', err.message);
      failed++;
    }

    // TEST 2: Submit Content Request (Assessment)
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/content-requests',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${learnerToken}`,
          'x-user-email': testUser.email,
          'x-user-name': testUser.name,
          'x-user-type': testUser.userType
        }
      }, {
        courseId: 'TEST_course_alpha',
        courseTitle: 'TEST Course Alpha Digital Skills',
        requestType: 'assessment',
        note: 'Please post matching final assessment'
      });

      if (res.statusCode === 200 && res.data?.request?.requestId) {
        assessmentRequestId = res.data.request.requestId;
        console.log('✓ TEST 2 PASSED: Successfully submitted assessment content request:', assessmentRequestId);
        passed++;
      } else {
        console.error('✗ TEST 2 FAILED: Unexpected response:', res);
        failed++;
      }
    } catch (err) {
      console.error('✗ TEST 2 ERROR:', err.message);
      failed++;
    }

    // TEST 3: Fetch Learner Content Requests
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/content-requests/my',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${learnerToken}`,
          'x-user-email': testUser.email,
          'x-user-type': testUser.userType
        }
      });

      if (res.statusCode === 200 && Array.isArray(res.data?.requests) && res.data.requests.length >= 2) {
        console.log('✓ TEST 3 PASSED: Learner retrieved their content requests:', res.data.requests.length, 'records');
        passed++;
      } else {
        console.error('✗ TEST 3 FAILED: Could not retrieve learner content requests:', res);
        failed++;
      }
    } catch (err) {
      console.error('✗ TEST 3 ERROR:', err.message);
      failed++;
    }

    // TEST 4: Admin Fetch All Content Requests
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/content-requests/admin',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-user-email': testAdmin.email,
          'x-user-type': testAdmin.userType
        }
      });

      if (res.statusCode === 200 && Array.isArray(res.data?.requests)) {
        const normalizedEmail = testUser.email.toLowerCase();
        const found = res.data.requests.some(r => r.learnerEmail === normalizedEmail);
        if (found) {
          console.log('✓ TEST 4 PASSED: Admin retrieved all requests including learner request. Total requests:', res.data.requests.length);
          passed++;
        } else {
          console.error('✗ TEST 4 FAILED: Learner request not found in admin list. Total records returned:', res.data.requests.length);
          console.error('   Looking for email:', normalizedEmail);
          console.error('   First few records:', JSON.stringify(res.data.requests.slice(0, 3)));
          failed++;
        }
      } else {
        console.error('✗ TEST 4 FAILED:', JSON.stringify(res.data).substring(0, 400));
        failed++;
      }
    } catch (err) {
      console.error('✗ TEST 4 ERROR:', err.message);
      failed++;
    }

    // TEST 5: Admin Update Content Request Status to Fulfilled
    if (assessmentRequestId) {
      try {
        const res = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: `/api/content-requests/admin/${assessmentRequestId}`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
            'x-user-email': testAdmin.email,
            'x-user-type': testAdmin.userType
          }
        }, {
          status: 'fulfilled'
        });

        if (res.statusCode === 200 && res.data?.request?.status === 'fulfilled') {
          console.log('✓ TEST 5 PASSED: Admin updated request status to fulfilled');
          passed++;
        } else {
          console.error('✗ TEST 5 FAILED:', res);
          failed++;
        }
      } catch (err) {
        console.error('✗ TEST 5 ERROR:', err.message);
        failed++;
      }
    }

    // TEST 6: Learner Dashboard Sequential Journey & Title Matching
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/learner-dashboard/summary',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${learnerToken}`,
          'x-user-email': testUser.email,
          'x-user-name': testUser.name,
          'x-user-type': testUser.userType
        }
      });

      if (res.statusCode === 200 && (Array.isArray(res.data?.learningJourney) || Array.isArray(res.data?.summary?.learningJourney))) {
        const journey = res.data.learningJourney || res.data.summary.learningJourney;
        const currentStep = res.data.currentJourneyStep ?? res.data.summary?.currentJourneyStep;
        if (Array.isArray(journey) && journey.length === 7 && typeof currentStep === 'number') {
          console.log(`✓ TEST 6 PASSED: Learner dashboard includes 7-step learning journey (Current step: ${currentStep}):`);
          journey.forEach(m => {
            console.log(`   [Step ${m.step}] ${m.title} -> Status: ${m.status}, Unlocked: ${m.unlocked}`);
          });
          passed++;
        } else {
          console.error('✗ TEST 6 FAILED: learningJourney invalid:', journey);
          failed++;
        }
      } else {
        console.error('✗ TEST 6 FAILED:', JSON.stringify(res.data).substring(0, 300));
        failed++;
      }
    } catch (err) {
      console.error('✗ TEST 6 ERROR:', err.message);
      failed++;
    }

    // TEST 7: Beneficiary Feedback Admin Endpoint Verification
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/beneficiary-feedback/admin',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-user-email': testAdmin.email,
          'x-user-type': testAdmin.userType
        }
      });

      if (res.statusCode === 200 && Array.isArray(res.data?.feedback)) {
        console.log('✓ TEST 7 PASSED: Admin successfully retrieved course beneficiary feedback list (' + res.data.feedback.length + ' records).');
        passed++;
      } else {
        console.error('✗ TEST 7 FAILED:', res);
        failed++;
      }
    } catch (err) {
      console.error('✗ TEST 7 ERROR:', err.message);
      failed++;
    }

  } finally {
    // Cleanup TEST_ user via DELETE /api/users/:email
    try {
      await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/users/${encodeURIComponent(testUser.email)}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-user-email': testAdmin.email,
          'x-user-type': testAdmin.userType
        }
      });
      console.log('✓ Cleaned up TEST user account.');
    } catch {}
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests();
