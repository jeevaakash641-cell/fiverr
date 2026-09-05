import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting Course Management Foundation API Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${title}`);
      failed++;
    }
  };

  // 1. GET /api/courses/published without auth
  try {
    const res = await fetch(`${BASE_URL}/api/courses/published`);
    const data = await res.json();
    assert(res.status === 200 && data.success === true && Array.isArray(data.courses), 'Public/Learner GET /api/courses/published returns 200 array');
  } catch (err) {
    assert(false, `Public GET /api/courses/published error: ${err.message}`);
  }

  // 2. POST /api/courses without auth headers
  try {
    const res = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Course' })
    });
    assert(res.status === 401, 'Unauthenticated POST /api/courses rejected with 401 Unauthorized');
  } catch (err) {
    assert(false, `Unauthenticated POST error: ${err.message}`);
  }

  // 3. POST /api/courses with learner email (non-admin)
  try {
    const res = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'nonexistent_learner@example.com'
      },
      body: JSON.stringify({ title: 'Test Course' })
    });
    assert(res.status === 401 || res.status === 403, 'Non-admin/unknown POST /api/courses rejected with 401/403');
  } catch (err) {
    assert(false, `Non-admin POST error: ${err.message}`);
  }

  // Find or use admin email
  let adminEmail = 'admin@example.com';
  try {
    const userRes = await fetch(`${BASE_URL}/api/users`);
    const userData = await userRes.json();
    const adminUser = userData.users?.find(u => u.userType === 'teacher');
    if (adminUser) {
      adminEmail = adminUser.email;
      console.log(`ℹ️ Using found Admin account: ${adminEmail}`);
    }
  } catch (e) {
    console.log('Using fallback admin email');
  }

  // 4. POST /api/courses validation failure
  try {
    const res = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Hi', // too short (<3)
        shortDescription: 'Short', // too short (<10)
        category: '',
        estimatedDuration: '',
        learningOutcomes: []
      })
    });
    const data = await res.json();
    assert(res.status === 400 && data.success === false && data.details?.length >= 4, 'Validation failure correctly reports required field errors');
  } catch (err) {
    assert(false, `Validation error: ${err.message}`);
  }

  // 5. POST /api/courses Create Draft Course
  let createdCourseId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Introduction to Digital Skills',
        shortDescription: 'Learn essential digital skills for everyday life and employment.',
        fullDescription: 'Comprehensive training module for modern computing, internet safety, and digital workplace readiness.',
        category: 'Digital Skills',
        estimatedDuration: '4 hours',
        difficultyLevel: 'Beginner',
        learningOutcomes: [
          'Use email safely',
          'Create and manage online accounts',
          'Recognise common online scams'
        ],
        status: 'draft'
      })
    });
    const data = await res.json();
    assert(res.status === 201 && data.success === true && data.course?.courseId, 'Admin POST /api/courses creates draft course');
    createdCourseId = data.course?.courseId;
    assert(data.course?.status === 'draft' && data.course?.learningOutcomes?.length === 3, 'Course initialized with status "draft" and 3 learning outcomes');
  } catch (err) {
    assert(false, `Create course error: ${err.message}`);
  }

  if (createdCourseId) {
    // 6. GET /api/courses/admin
    try {
      const res = await fetch(`${BASE_URL}/api/courses/admin`, {
        headers: { 'x-user-email': adminEmail }
      });
      const data = await res.json();
      assert(res.status === 200 && data.courses?.some(c => c.courseId === createdCourseId), 'Admin GET /api/courses/admin returns created draft course');
    } catch (err) {
      assert(false, `Admin list error: ${err.message}`);
    }

    // 7. GET /api/courses/published should NOT return draft course
    try {
      const res = await fetch(`${BASE_URL}/api/courses/published`);
      const data = await res.json();
      assert(!data.courses?.some(c => c.courseId === createdCourseId), 'Learner GET /api/courses/published DOES NOT include draft course');
    } catch (err) {
      assert(false, `Learner list error: ${err.message}`);
    }

    // 8. PUT /api/courses/:courseId Update Course Details
    try {
      const res = await fetch(`${BASE_URL}/api/courses/${createdCourseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({
          title: 'Essential Digital Skills for Ely Learners',
          shortDescription: 'Master computer fundamentals and online safety for everyday life.',
          estimatedDuration: '5 hours',
          learningOutcomes: [
            'Use email and digital accounts safely',
            'Recognise online threats and phishing scams',
            'Search and navigate community resources online'
          ]
        })
      });
      const data = await res.json();
      assert(res.status === 200 && data.course?.title === 'Essential Digital Skills for Ely Learners' && data.course?.estimatedDuration === '5 hours', 'PUT /api/courses/:courseId updates course details');
    } catch (err) {
      assert(false, `Update course error: ${err.message}`);
    }

    // 9. PATCH /api/courses/:courseId/status -> publish
    try {
      const res = await fetch(`${BASE_URL}/api/courses/${createdCourseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({ status: 'published' })
      });
      const data = await res.json();
      assert(res.status === 200 && data.course?.status === 'published' && data.course?.publishedAt !== null, 'PATCH /api/courses/:courseId/status publishes course and sets publishedAt');
    } catch (err) {
      assert(false, `Publish status error: ${err.message}`);
    }

    // 10. GET /api/courses/published now INCLUDES the published course
    try {
      const res = await fetch(`${BASE_URL}/api/courses/published`);
      const data = await res.json();
      assert(data.courses?.some(c => c.courseId === createdCourseId), 'Learner GET /api/courses/published INCLUDES published course');
    } catch (err) {
      assert(false, `Published list verify error: ${err.message}`);
    }

    // 11. PATCH /api/courses/:courseId/status -> unpublish
    try {
      const res = await fetch(`${BASE_URL}/api/courses/${createdCourseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({ status: 'unpublished' })
      });
      const data = await res.json();
      assert(res.status === 200 && data.course?.status === 'unpublished', 'PATCH /api/courses/:courseId/status unpublishes course');
    } catch (err) {
      assert(false, `Unpublish error: ${err.message}`);
    }

    // 12. PATCH /api/courses/:courseId/status -> archive
    try {
      const res = await fetch(`${BASE_URL}/api/courses/${createdCourseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail
        },
        body: JSON.stringify({ status: 'archived' })
      });
      const data = await res.json();
      assert(res.status === 200 && data.course?.status === 'archived', 'PATCH /api/courses/:courseId/status archives course');
    } catch (err) {
      assert(false, `Archive error: ${err.message}`);
    }

    // 13. GET /api/courses/published should NOT return archived course
    try {
      const res = await fetch(`${BASE_URL}/api/courses/published`);
      const data = await res.json();
      assert(!data.courses?.some(c => c.courseId === createdCourseId), 'Archived course is NOT returned to learners');
    } catch (err) {
      assert(false, `Archived list verify error: ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`🏁 TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
