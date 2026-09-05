import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting Task 3 Course Recommendations & Selection API Tests...\n');
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

  // Find Admin & Learner Accounts
  let adminEmail = 'admin@onecommunityely.com';
  let learnerEmail = 'learner@onecommunityely.com';

  try {
    const userRes = await fetch(`${BASE_URL}/api/users`);
    const userData = await userRes.json();
    const adminUser = userData.users?.find(u => u.userType === 'teacher');
    const learnerUser = userData.users?.find(u => u.userType === 'student');
    if (adminUser) adminEmail = adminUser.email;
    if (learnerUser) learnerEmail = learnerUser.email;
  } catch (e) {
    console.log('Using default emails');
  }

  // 1. Setup Test Published Courses
  const testCourses = [
    {
      title: 'Introduction to Digital Skills',
      category: 'Digital Skills',
      shortDescription: 'Learn essential computer, internet, and email skills for everyday life.',
      learningOutcomes: ['Browse the internet safely', 'Send and manage emails'],
      difficultyLevel: 'Beginner',
      estimatedDuration: '4 hours',
      status: 'published'
    },
    {
      title: 'Getting Started with Artificial Intelligence',
      category: 'Artificial Intelligence',
      shortDescription: 'Understand AI, explore ChatGPT, and master prompt engineering basics.',
      learningOutcomes: ['Understand generative AI and LLMs', 'Write effective prompts for daily tasks'],
      difficultyLevel: 'Beginner',
      estimatedDuration: '5 hours',
      status: 'published'
    },
    {
      title: 'Community Podcasting Essentials',
      category: 'Podcasting and Digital Media',
      shortDescription: 'Record, edit, and publish your own audio podcast stories for the community.',
      learningOutcomes: ['Setup a recording microphone', 'Edit audio tracks'],
      difficultyLevel: 'Intermediate',
      estimatedDuration: '6 hours',
      status: 'published'
    },
    {
      title: 'CV and Interview Preparation',
      category: 'Employment and Personal Development',
      shortDescription: 'Craft a standout CV, practice interview questions, and apply for work.',
      learningOutcomes: ['Write an effective CV', 'Answer common interview questions with confidence'],
      difficultyLevel: 'Beginner',
      estimatedDuration: '3 hours',
      status: 'published'
    },
    {
      title: 'Draft Secret Course',
      category: 'Digital Skills',
      shortDescription: 'This course is a draft and should never be recommended to learners.',
      status: 'draft'
    }
  ];

  const createdCourseIds = {};

  for (const c of testCourses) {
    try {
      const res = await fetch(`${BASE_URL}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
        body: JSON.stringify(c)
      });
      const data = await res.json();
      if (data.course?.courseId) {
        createdCourseIds[c.title] = data.course.courseId;
      }
    } catch (err) {
      console.error('Course setup failed for', c.title, err.message);
    }
  }

  assert(Object.keys(createdCourseIds).length >= 4, 'Setup: Created published test courses across categories');

  // Also add a module & lesson to "Introduction to Digital Skills" for overview testing
  const digitalCourseId = createdCourseIds['Introduction to Digital Skills'];
  let digitalModuleId = null;
  if (digitalCourseId) {
    const mRes = await fetch(`${BASE_URL}/api/courses/${digitalCourseId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({
        title: 'Basic Computing Overview',
        description: 'Introduction to hardware and software fundamentals.',
        status: 'published'
      })
    });
    const mData = await mRes.json();
    digitalModuleId = mData.module?.moduleId;

    if (digitalModuleId) {
      await fetch(`${BASE_URL}/api/modules/${digitalModuleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
        body: JSON.stringify({
          title: 'Using the Mouse and Keyboard',
          shortDescription: 'Learn essential keyboard shortcuts and navigation.',
          content: '<p>Practice typing and mouse navigation.</p>',
          estimatedMinutes: 15,
          status: 'published'
        })
      });
    }
  }

  // 2. AI Recommendation Test
  try {
    const res = await fetch(`${BASE_URL}/api/recommendations/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningInterest: 'I want to understand AI and use ChatGPT.'
      })
    });
    const data = await res.json();
    const topRec = data.recommendations?.[0];
    assert(
      res.status === 200 &&
      topRec &&
      topRec.category === 'Artificial Intelligence' &&
      topRec.isBestMatch === true &&
      !data.isFallback,
      '“I want to understand AI and use ChatGPT” recommends Artificial Intelligence as Best Match'
    );
  } catch (err) {
    assert(false, `AI recommendation test error: ${err.message}`);
  }

  // 3. Employment & CV Recommendation Test
  try {
    const res = await fetch(`${BASE_URL}/api/recommendations/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningInterest: 'I need help creating a CV and preparing for work.'
      })
    });
    const data = await res.json();
    const topRec = data.recommendations?.[0];
    assert(
      res.status === 200 &&
      topRec &&
      topRec.category === 'Employment and Personal Development' &&
      topRec.isBestMatch === true,
      '“I need help creating a CV and preparing for work” recommends Employment course as Best Match'
    );
  } catch (err) {
    assert(false, `Employment recommendation test error: ${err.message}`);
  }

  // 4. Podcasting Recommendation Test
  try {
    const res = await fetch(`${BASE_URL}/api/recommendations/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningInterest: 'I want to record a podcast about my community.'
      })
    });
    const data = await res.json();
    const topRec = data.recommendations?.[0];
    assert(
      res.status === 200 &&
      topRec &&
      topRec.category === 'Podcasting and Digital Media' &&
      topRec.isBestMatch === true,
      '“I want to record a podcast about my community” recommends Podcasting course as Best Match'
    );
  } catch (err) {
    assert(false, `Podcasting recommendation test error: ${err.message}`);
  }

  // 5. Case-insensitivity & Punctuation Robustness Test
  try {
    const res = await fetch(`${BASE_URL}/api/recommendations/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningInterest: '!!!...i WaNt To LeArN dIgItAl SkILlS???...'
      })
    });
    const data = await res.json();
    const topRec = data.recommendations?.[0];
    assert(
      res.status === 200 &&
      topRec &&
      topRec.category === 'Digital Skills',
      'Matching is case-insensitive and punctuation-insensitive'
    );
  } catch (err) {
    assert(false, `Case/Punctuation test error: ${err.message}`);
  }

  // 6. Draft/Archived Exclusion Test
  try {
    const res = await fetch(`${BASE_URL}/api/recommendations/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningInterest: 'secret draft courses and digital skills'
      })
    });
    const data = await res.json();
    const hasDraft = data.recommendations?.some(r => r.title === 'Draft Secret Course' || r.status !== 'published');
    assert(res.status === 200 && !hasDraft, 'Draft, unpublished, and archived courses are strictly excluded from recommendations');
  } catch (err) {
    assert(false, `Exclusion test error: ${err.message}`);
  }

  // 7. Fallback Behavior Test
  try {
    const res = await fetch(`${BASE_URL}/api/recommendations/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningInterest: 'I want to learn something unusual.'
      })
    });
    const data = await res.json();
    assert(
      res.status === 200 &&
      data.isFallback === true &&
      data.recommendations?.length > 0 &&
      data.recommendations.every(r => r.isBestMatch === false),
      'Fallback behavior returns available published courses without Best Match badge when no category matches'
    );
  } catch (err) {
    assert(false, `Fallback test error: ${err.message}`);
  }

  // 8. Course Overview API Test
  try {
    const res = await fetch(`${BASE_URL}/api/courses/${digitalCourseId}/overview`);
    const data = await res.json();
    assert(
      res.status === 200 &&
      data.course?.title === 'Introduction to Digital Skills' &&
      data.totalModules >= 1 &&
      data.modules?.[0]?.lessons?.length >= 1,
      'Course Overview API returns published course with totalModules and curriculum outline'
    );
  } catch (err) {
    assert(false, `Overview API test error: ${err.message}`);
  }

  // 9. Course Overview 404 for Draft Course
  try {
    const draftId = createdCourseIds['Draft Secret Course'];
    const res = await fetch(`${BASE_URL}/api/courses/${draftId}/overview`);
    assert(res.status === 404, 'Course Overview API returns 404 for unpublished/draft course');
  } catch (err) {
    assert(false, `Draft overview test error: ${err.message}`);
  }

  // 10. Course Selection API: Unauthenticated Request Check
  try {
    const res = await fetch(`${BASE_URL}/api/course-selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: digitalCourseId })
    });
    assert(res.status === 401, 'Unauthenticated course selection request rejected with 401');
  } catch (err) {
    assert(false, `Auth rejection test error: ${err.message}`);
  }

  // 11. Course Selection API: Learner Selects Published Course
  let selectionId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/course-selections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': learnerEmail
      },
      body: JSON.stringify({
        courseId: digitalCourseId,
        source: 'recommendation',
        recommendationReason: 'Recommended because you mentioned digital skills.'
      })
    });
    const data = await res.json();
    selectionId = data.selection?.selectionId;
    assert(
      res.status === 201 &&
      selectionId &&
      data.selection?.status === 'selected' &&
      data.selection?.courseId === digitalCourseId,
      'Authenticated Learner successfully selects a published course'
    );
  } catch (err) {
    assert(false, `Course selection test error: ${err.message}`);
  }

  // 12. Duplicate Selection Idempotency Test
  try {
    const res = await fetch(`${BASE_URL}/api/course-selections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': learnerEmail
      },
      body: JSON.stringify({
        courseId: digitalCourseId,
        source: 'recommendation'
      })
    });
    const data = await res.json();
    assert(
      res.status === 201 &&
      data.selection?.alreadySelected === true,
      'Duplicate selection handled safely without creating duplicate records'
    );
  } catch (err) {
    assert(false, `Duplicate selection test error: ${err.message}`);
  }

  // 13. Rejection of Selection for Unpublished Course
  try {
    const draftId = createdCourseIds['Draft Secret Course'];
    const res = await fetch(`${BASE_URL}/api/course-selections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': learnerEmail
      },
      body: JSON.stringify({
        courseId: draftId
      })
    });
    assert(res.status === 400, 'Selection of unpublished draft course rejected with 400');
  } catch (err) {
    assert(false, `Draft selection rejection error: ${err.message}`);
  }

  // 14. GET /api/course-selections/me
  try {
    const res = await fetch(`${BASE_URL}/api/course-selections/me`, {
      headers: { 'x-user-email': learnerEmail }
    });
    const data = await res.json();
    const found = data.selections?.find(s => s.courseId === digitalCourseId);
    assert(
      res.status === 200 &&
      found &&
      found.course?.title === 'Introduction to Digital Skills',
      'GET /api/course-selections/me returns learner selections enriched with course details'
    );
  } catch (err) {
    assert(false, `Get selections test error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`🏁 TASK 3 TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
