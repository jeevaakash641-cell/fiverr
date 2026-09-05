import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting Task 2 Modules & Lessons Management API Tests...\n');
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

  // Find Admin Account
  let adminEmail = 'admin@onecommunityely.com';
  try {
    const userRes = await fetch(`${BASE_URL}/api/users`);
    const userData = await userRes.json();
    const adminUser = userData.users?.find(u => u.userType === 'teacher');
    if (adminUser) adminEmail = adminUser.email;
  } catch (e) {
    console.log('Using default admin email');
  }

  // 1. Setup / Create a Test Course
  let testCourseId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Digital Skills Curriculum Test Course',
        shortDescription: 'Testing modules and lesson hierarchy for Ely training centre.',
        category: 'Digital Skills',
        estimatedDuration: '6 hours',
        difficultyLevel: 'Beginner',
        learningOutcomes: ['Understand web basics', 'Practice cyber safety'],
        status: 'published'
      })
    });
    const data = await res.json();
    testCourseId = data.course?.courseId;
    assert(res.status === 201 && testCourseId, `Course created for testing hierarchy: ${testCourseId}`);
  } catch (err) {
    assert(false, `Course setup error: ${err.message}`);
    return;
  }

  // 2. Module Validation Failure Test
  try {
    const res = await fetch(`${BASE_URL}/api/courses/${testCourseId}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Hi', // too short
        description: 'Short' // too short
      })
    });
    const data = await res.json();
    assert(res.status === 400 && data.details?.length >= 2, 'Module validation rejects short title/description');
  } catch (err) {
    assert(false, `Module validation error: ${err.message}`);
  }

  // 3. Create Module 1: Getting Started Online
  let module1Id = null;
  try {
    const res = await fetch(`${BASE_URL}/api/courses/${testCourseId}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Getting Started Online',
        description: 'Core concepts for navigating the web and using basic computer applications.',
        status: 'draft'
      })
    });
    const data = await res.json();
    module1Id = data.module?.moduleId;
    assert(res.status === 201 && data.module?.status === 'draft' && data.module?.orderIndex === 0, 'Created Module 1 as draft with orderIndex 0');
  } catch (err) {
    assert(false, `Module 1 creation error: ${err.message}`);
  }

  // 4. Create Module 2: Staying Safe Online
  let module2Id = null;
  try {
    const res = await fetch(`${BASE_URL}/api/courses/${testCourseId}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Staying Safe Online',
        description: 'Recognise phishing, protect personal data, and manage strong passwords.',
        status: 'draft'
      })
    });
    const data = await res.json();
    module2Id = data.module?.moduleId;
    assert(res.status === 201 && data.module?.orderIndex === 1, 'Created Module 2 with orderIndex 1');
  } catch (err) {
    assert(false, `Module 2 creation error: ${err.message}`);
  }

  // 5. Reorder Modules
  try {
    const res = await fetch(`${BASE_URL}/api/courses/${testCourseId}/modules/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        moduleIds: [module2Id, module1Id] // swap
      })
    });
    const data = await res.json();
    const mod2 = data.modules?.find(m => m.moduleId === module2Id);
    assert(res.status === 200 && mod2?.orderIndex === 0, 'Reordered modules: Module 2 is now orderIndex 0');

    // Swap back
    await fetch(`${BASE_URL}/api/courses/${testCourseId}/modules/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({ moduleIds: [module1Id, module2Id] })
    });
  } catch (err) {
    assert(false, `Reorder modules error: ${err.message}`);
  }

  // 6. Lesson Validation & Sanitization Test
  let lesson1Id = null;
  try {
    const dirtyHtml = '<p>Learn web basics. <script>alert("hack")</script><a href="javascript:steal()">Click</a></p>';
    const res = await fetch(`${BASE_URL}/api/modules/${module1Id}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Understanding the Internet',
        shortDescription: 'Learn what the internet is and how websites are delivered.',
        content: dirtyHtml,
        estimatedMinutes: 15,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        attachedResources: [
          { resourceId: 'sample-book.pdf', title: 'Digital Guidebook', format: 'PDF' }
        ],
        status: 'draft'
      })
    });
    const data = await res.json();
    lesson1Id = data.lesson?.lessonId;
    const sanitized = data.lesson?.content || '';
    assert(
      res.status === 201 &&
      lesson1Id &&
      !sanitized.includes('<script>') &&
      !sanitized.includes('javascript:'),
      'Created Lesson 1: Script tags & javascript URLs sanitized safely'
    );
  } catch (err) {
    assert(false, `Lesson 1 creation error: ${err.message}`);
  }

  // 7. Create Lesson 2 in Module 1
  let lesson2Id = null;
  try {
    const res = await fetch(`${BASE_URL}/api/modules/${module1Id}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Creating and Using Email',
        shortDescription: 'Master composing, formatting, and sending emails securely.',
        content: '<h3>Email Essentials</h3><p>Learn how to setup a modern email inbox.</p>',
        estimatedMinutes: 20,
        status: 'draft'
      })
    });
    const data = await res.json();
    lesson2Id = data.lesson?.lessonId;
    assert(res.status === 201 && data.lesson?.orderIndex === 1, 'Created Lesson 2 in Module 1 with orderIndex 1');
  } catch (err) {
    assert(false, `Lesson 2 creation error: ${err.message}`);
  }

  // 8. Reorder Lessons within Module
  try {
    const res = await fetch(`${BASE_URL}/api/modules/${module1Id}/lessons/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        lessonIds: [lesson2Id, lesson1Id]
      })
    });
    const data = await res.json();
    const l2 = data.lessons?.find(l => l.lessonId === lesson2Id);
    assert(res.status === 200 && l2?.orderIndex === 0, 'Reordered lessons in Module 1');

    // Revert to natural order
    await fetch(`${BASE_URL}/api/modules/${module1Id}/lessons/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({ lessonIds: [lesson1Id, lesson2Id] })
    });
  } catch (err) {
    assert(false, `Lesson reorder error: ${err.message}`);
  }

  // 9. Move Lesson between Modules in the Same Course
  try {
    const res = await fetch(`${BASE_URL}/api/lessons/${lesson2Id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        targetModuleId: module2Id,
        targetCourseId: testCourseId
      })
    });
    const data = await res.json();
    assert(res.status === 200 && data.lesson?.moduleId === module2Id, 'Moved Lesson 2 from Module 1 to Module 2');

    // Move back
    await fetch(`${BASE_URL}/api/lessons/${lesson2Id}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({ targetModuleId: module1Id, targetCourseId: testCourseId })
    });
  } catch (err) {
    assert(false, `Move lesson error: ${err.message}`);
  }

  // 10. Publishing Rules & Learner Content Hierarchy Test
  try {
    // Both modules and lessons are currently draft -> Public endpoint should return empty modules array
    const publicRes1 = await fetch(`${BASE_URL}/api/courses/${testCourseId}/content`);
    const publicData1 = await publicRes1.json();
    assert(publicRes1.status === 200 && publicData1.modules?.length === 0, 'Draft modules/lessons are hidden from public learner endpoint');

    // Publish Module 1 and Lesson 1
    await fetch(`${BASE_URL}/api/modules/${module1Id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({ status: 'published' })
    });

    await fetch(`${BASE_URL}/api/lessons/${lesson1Id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({ status: 'published' })
    });

    // Public endpoint now returns published Module 1 with published Lesson 1 only
    const publicRes2 = await fetch(`${BASE_URL}/api/courses/${testCourseId}/content`);
    const publicData2 = await publicRes2.json();
    const pubMod = publicData2.modules?.find(m => m.moduleId === module1Id);
    assert(
      publicRes2.status === 200 &&
      pubMod &&
      pubMod.lessons?.length === 1 &&
      pubMod.lessons[0].lessonId === lesson1Id,
      'Public learner endpoint returns published Module 1 with published Lesson 1'
    );

    // Unpublish Course -> Public endpoint returns 404
    await fetch(`${BASE_URL}/api/courses/${testCourseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({ status: 'unpublished' })
    });

    const publicRes3 = await fetch(`${BASE_URL}/api/courses/${testCourseId}/content`);
    assert(publicRes3.status === 404, 'Unpublishing course hides entire curriculum from learner endpoint');
  } catch (err) {
    assert(false, `Publishing rules test error: ${err.message}`);
  }

  // 11. Admin Full Hierarchy Endpoint Test
  try {
    const adminRes = await fetch(`${BASE_URL}/api/courses/${testCourseId}/content/admin`, {
      headers: { 'x-user-email': adminEmail }
    });
    const adminData = await adminRes.json();
    assert(
      adminRes.status === 200 &&
      adminData.modules?.length === 2 &&
      adminData.modules[0].lessons?.length === 2,
      'Admin full hierarchy endpoint returns all modules and lessons across all statuses'
    );
  } catch (err) {
    assert(false, `Admin hierarchy error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`🏁 TASK 2 TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
