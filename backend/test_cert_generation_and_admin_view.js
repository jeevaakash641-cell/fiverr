/**
 * Test Certificate Generation and Admin Visibility Verification
 */
import http from 'http';

const req = (options, data = null) => new Promise((resolve, reject) => {
  const r = http.request(options, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve({
      statusCode: res.statusCode,
      headers: res.headers,
      body: Buffer.concat(chunks),
      json: () => JSON.parse(Buffer.concat(chunks).toString('utf-8'))
    }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const makeJwt = (payload) => 'Bearer ' + Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url') + '.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.';

async function testCertGeneration() {
  console.log('================================================================');
  console.log('TEST: CERTIFICATE GENERATION & ADMIN PORTAL VISIBILITY');
  console.log('================================================================\n');

  const testLearnerEmail = `learner_cert_${Date.now()}@example.com`;
  const learnerToken = makeJwt({ uid: 'learner_123', email: testLearnerEmail, name: 'Jeeva Test Learner', userType: 'student' });
  const adminToken = makeJwt({ uid: 'admin_123', email: 'admin@onecommunityely.com', userType: 'teacher', role: 'admin' });

  // 0. Register learner via API
  const regRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    email: testLearnerEmail,
    name: 'Jeeva Test Learner',
    userType: 'student',
    role: 'student'
  }));
  console.log(`✓ 0. Registered test learner account: ${testLearnerEmail} (status: ${regRes.statusCode})`);

  // 1. Create a published test course with 1 module and 1 lesson via Admin API
  const courseRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: '/api/courses',
    method: 'POST',
    headers: {
      'Authorization': adminToken,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    title: 'Test Certificate Generation Course ' + Date.now(),
    shortDescription: 'Comprehensive test course for verified certificates of completion.',
    category: 'Digital Skills',
    estimatedDuration: '1 hour',
    difficultyLevel: 'Beginner',
    learningOutcomes: ['Complete training verification', 'Generate certificate'],
    status: 'published'
  }));
  const courseData = courseRes.json();
  const testCourse = courseData.course;
  console.log(`✓ 1. Created published test course: "${testCourse.title}" (${testCourse.courseId})`);

  // 1b. Create 1 module
  const modRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: `/api/courses/${testCourse.courseId}/modules`,
    method: 'POST',
    headers: {
      'Authorization': adminToken,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    title: 'Module 1: Getting Started',
    description: 'Comprehensive introduction module for testing certificates.',
    orderIndex: 0,
    status: 'published'
  }));
  const modData = modRes.json();
  const testModule = modData.module;

  // 1c. Create 1 lesson
  const lesRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: `/api/modules/${testModule.moduleId}/lessons`,
    method: 'POST',
    headers: {
      'Authorization': adminToken,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    title: 'Lesson 1: Foundations',
    shortDescription: 'Core foundation concepts and practical takeaways.',
    content: '<p>Welcome to this certified training course.</p>',
    estimatedMinutes: 30,
    orderIndex: 0,
    status: 'published'
  }));
  const lesData = lesRes.json();
  const testLesson = lesData.lesson;
  console.log(`✓ 1b. Added Module & Lesson (${testLesson?.lessonId})`);

  // 2a. Learner starts the course
  await req({
    hostname: 'localhost',
    port: 3001,
    path: `/api/progress/courses/${testCourse.courseId}/start`,
    method: 'POST',
    headers: { 'Authorization': learnerToken }
  });

  // 2b. Learner completes the lesson (completes 100% of course)
  const completeLesRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: `/api/progress/courses/${testCourse.courseId}/lessons/${testLesson.lessonId}/complete`,
    method: 'POST',
    headers: { 'Authorization': learnerToken }
  });
  console.log(`✓ 2. Completed 100% of lessons for ${testLearnerEmail} (status: ${completeLesRes.statusCode})`);

  // 2c. Learner submits Beneficiary Feedback
  const fbRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: `/api/beneficiary-feedback/course/${testCourse.courseId}`,
    method: 'POST',
    headers: {
      'Authorization': learnerToken,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    usefulnessRating: 5,
    confidenceRating: 5,
    mostUsefulLearning: 'Clear, practical and empowering community digital training skills.',
    intendedChange: 'Apply digital skills to daily tasks and community outreach.',
    nextLearning: 'Advanced AI and productivity tools.',
    wouldRecommend: 'yes',
    testimonialConsent: 'anonymous'
  }));
  console.log(`✓ 2b. Submitted Beneficiary Feedback (status: ${fbRes.statusCode})`);

  // 3. Issue certificate via API
  const issueRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: `/api/certificates/course/${testCourse.courseId}/issue`,
    method: 'POST',
    headers: {
      'Authorization': learnerToken,
      'Content-Type': 'application/json'
    }
  });

  console.log(`✓ 3. Issue Certificate API status: ${issueRes.statusCode}`);
  const issueData = issueRes.json();
  if (!issueData.success || !issueData.certificate) {
    throw new Error('Certificate issue failed: ' + JSON.stringify(issueData));
  }
  console.log(`   Issued Certificate Number: ${issueData.certificate.certificateNumber}`);
  console.log(`   Learner: ${issueData.certificate.learnerNameSnapshot}`);
  console.log(`   Course: ${issueData.certificate.courseTitleSnapshot}`);

  // 4. Verify Certificate is retrieved by Admin Portal endpoint
  const adminCertsRes = await req({
    hostname: 'localhost',
    port: 3001,
    path: '/api/certificates/admin',
    method: 'GET',
    headers: {
      'Authorization': adminToken
    }
  });

  console.log(`✓ 4. Admin Certificates API status: ${adminCertsRes.statusCode}`);
  const adminCertsData = adminCertsRes.json();
  const foundInAdmin = (adminCertsData.certificates || []).find(c => c.learnerEmail === testLearnerEmail);

  if (!foundInAdmin) {
    throw new Error(`TEST FAILED: Certificate for ${testLearnerEmail} was NOT found in Admin Portal certificates list!`);
  }

  console.log(`\n🎉 TEST PASSED! Certificate successfully visible in Admin Portal:`);
  console.log(`   - Certificate ID: ${foundInAdmin.certificateId}`);
  console.log(`   - Certificate No: ${foundInAdmin.certificateNumber}`);
  console.log(`   - Status: ${foundInAdmin.status}`);
  console.log(`   - Issued To: ${foundInAdmin.learnerNameSnapshot} (${foundInAdmin.learnerEmail})`);
  console.log(`   - Course: ${foundInAdmin.courseTitleSnapshot}`);
  console.log(`   - Issued At: ${foundInAdmin.issuedAt}\n`);

  console.log('================================================================');
  console.log('SUMMARY: 100% PASSING — CERTIFICATES GENERATE & SHOW TO ADMIN');
  console.log('================================================================');
}

testCertGeneration().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
