/**
 * Automated Verification Script for Course Deletion APIs
 * - Single Course Delete (with cascade deletion of modules & lessons)
 * - Bulk Course Delete
 * - Delete All Courses
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting Course Deletion API Tests...\n');
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

  let adminEmail = 'admin@onecommunityely.com';
  try {
    const userRes = await fetch(`${BASE_URL}/api/users`);
    const userData = await userRes.json();
    const adminUser = userData.users?.find(u => u.userType === 'teacher');
    if (adminUser) adminEmail = adminUser.email;
  } catch (e) {}

  // 1. Create Course A
  let courseAId = null;
  let moduleAId = null;
  let lessonAId = null;
  try {
    const createRes = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Course to Delete A',
        shortDescription: 'This course will be deleted in the automated test.',
        category: 'Digital Skills',
        estimatedDuration: '1 hour',
        difficultyLevel: 'Beginner',
        learningOutcomes: ['Testing deletion mechanism']
      })
    });
    const cData = await createRes.json();
    courseAId = cData.course?.courseId;

    // Create Module inside Course A
    const modRes = await fetch(`${BASE_URL}/api/courses/${courseAId}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Module to be deleted',
        description: 'Module under Course A'
      })
    });
    const mData = await modRes.json();
    moduleAId = mData.module?.moduleId;

    // Create Lesson inside Module A
    const lessRes = await fetch(`${BASE_URL}/api/modules/${moduleAId}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': adminEmail
      },
      body: JSON.stringify({
        title: 'Lesson to be deleted',
        shortDescription: 'Lesson under Course A',
        content: '<p>Content to be deleted</p>',
        estimatedMinutes: 15
      })
    });
    const lData = await lessRes.json();
    lessonAId = lData.lesson?.lessonId;

    assert(courseAId && moduleAId && lessonAId, 'Successfully set up Course A with Module and Lesson for deletion test');
  } catch (err) {
    assert(false, `Setup error for Course A: ${err.message}`);
  }

  // 2. Test DELETE Single Course (DELETE /api/courses/:courseId)
  try {
    const delRes = await fetch(`${BASE_URL}/api/courses/${courseAId}`, {
      method: 'DELETE',
      headers: {
        'x-user-email': adminEmail
      }
    });
    const delData = await delRes.json();
    assert(delRes.status === 200 && delData.success === true, 'DELETE /api/courses/:courseId returned 200 OK');

    // Verify Course is gone
    const checkCourse = await fetch(`${BASE_URL}/api/courses/${courseAId}`);
    assert(checkCourse.status === 404, 'Course A is no longer accessible (404 Not Found)');

    // Verify Module is gone
    const checkModule = await fetch(`${BASE_URL}/api/modules/${moduleAId}`);
    assert(checkModule.status === 404, 'Cascade deleted: Module A is also deleted');

    // Verify Lesson is gone
    const checkLesson = await fetch(`${BASE_URL}/api/lessons/${lessonAId}`);
    assert(checkLesson.status === 404, 'Cascade deleted: Lesson A is also deleted');
  } catch (err) {
    assert(false, `Single course delete error: ${err.message}`);
  }

  // 3. Test Bulk Delete (POST /api/courses/bulk-delete)
  try {
    // Create Course B and Course C
    const cBRes = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({
        title: 'Bulk Delete Target 1',
        shortDescription: 'Temporary course for bulk delete test 1',
        category: 'Small Business',
        estimatedDuration: '2 hours',
        difficultyLevel: 'Beginner',
        learningOutcomes: ['Outcome 1']
      })
    });
    const cB = await cBRes.json();

    const cCRes = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({
        title: 'Bulk Delete Target 2',
        shortDescription: 'Temporary course for bulk delete test 2',
        category: 'Small Business',
        estimatedDuration: '2 hours',
        difficultyLevel: 'Beginner',
        learningOutcomes: ['Outcome 2']
      })
    });
    const cC = await cCRes.json();

    const bulkRes = await fetch(`${BASE_URL}/api/courses/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': adminEmail },
      body: JSON.stringify({
        courseIds: [cB.course.courseId, cC.course.courseId]
      })
    });
    const bulkData = await bulkRes.json();

    assert(
      bulkRes.status === 200 && bulkData.deletedCount === 2,
      'POST /api/courses/bulk-delete successfully removed 2 selected courses'
    );
  } catch (err) {
    assert(false, `Bulk delete test error: ${err.message}`);
  }

  // 4. Test Non-Admin Rejection (401/403)
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/courses/non-existent-id`, {
      method: 'DELETE'
    });
    assert(unauthRes.status === 401, 'Unauthenticated course deletion request rejected with 401');
  } catch (err) {
    assert(false, `Auth rejection test error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`🏁 DELETION API TESTS: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
