/**
 * Verification test for One Community Ely Admin Audit Logging System
 */

import {
  recordAdminAction,
  queryAdminAuditLogs,
  getAdminAuditStats,
  ensureAuditTableExists,
  AuditCategories
} from './services/adminAuditService.js';

async function runTests() {
  console.log('🧪 Starting Admin Audit System Verification...\n');

  // 1. Ensure Table
  console.log('1. Testing ensureAuditTableExists...');
  await ensureAuditTableExists();
  console.log('   ✅ Table initialization handled smoothly.\n');

  // 2. Record Actions across multiple categories
  console.log('2. Recording Sample Admin Audit Actions...');
  const testAdmin = {
    id: 'admin_test_01',
    name: 'Jeeva Administrator',
    email: 'admin@onecommunityely.com'
  };

  const action1 = await recordAdminAction({
    admin: testAdmin,
    action: 'Admin Login',
    category: AuditCategories.SECURITY,
    targetType: 'AuthSession',
    targetId: 'admin@onecommunityely.com',
    targetName: 'Jeeva Administrator',
    result: 'Success',
    description: 'Admin Jeeva logged into One Community Ely Administration Portal'
  });
  console.log('   ✅ Recorded Login Event:', action1?.auditId);

  const action2 = await recordAdminAction({
    admin: testAdmin,
    action: 'Created Course',
    category: AuditCategories.COURSES_LESSONS,
    targetType: 'Course',
    targetId: 'course_ds_01',
    targetName: 'Digital Safety Basics',
    result: 'Success',
    description: 'Created new accredited course "Digital Safety Basics"',
    changedFields: ['title', 'category', 'status', 'learningOutcomes'],
    metadata: { difficulty: 'Beginner', modulesCount: 4 }
  });
  console.log('   ✅ Recorded Course Creation Event:', action2?.auditId);

  const action3 = await recordAdminAction({
    admin: testAdmin,
    action: 'Banned Learner',
    category: AuditCategories.LEARNER_MANAGEMENT,
    targetType: 'Learner',
    targetId: 'baduser@example.com',
    targetName: 'Suspicious User',
    result: 'Success',
    description: 'Banned learner account due to policy violation',
    changedFields: ['isBanned', 'status']
  });
  console.log('   ✅ Recorded Ban Learner Event:', action3?.auditId);

  const action4 = await recordAdminAction({
    admin: testAdmin,
    action: 'Revoked Certificate',
    category: AuditCategories.CERTIFICATES,
    targetType: 'Certificate',
    targetId: 'CERT-2026-999',
    targetName: 'CERT-2026-999',
    result: 'Success',
    description: 'Revoked certificate CERT-2026-999 upon safeguarding review',
    metadata: { reason: 'Identity verification pending' }
  });
  console.log('   ✅ Recorded Certificate Revoke Event:', action4?.auditId);

  // 3. Test Query & Filters
  console.log('\n3. Testing Query & Filtering Capabilities...');
  const allLogs = await queryAdminAuditLogs({ limit: 10 });
  console.log(`   ✅ Query all logs: Found ${allLogs.total} items (Page ${allLogs.page}/${allLogs.totalPages})`);

  const categoryFilter = await queryAdminAuditLogs({ category: AuditCategories.COURSES_LESSONS });
  console.log(`   ✅ Category filter (${AuditCategories.COURSES_LESSONS}): Found ${categoryFilter.total} items`);
  if (categoryFilter.logs.some(l => l.category !== AuditCategories.COURSES_LESSONS)) {
    throw new Error('Category filter failed!');
  }

  const searchFilter = await queryAdminAuditLogs({ search: 'Digital Safety' });
  console.log(`   ✅ Search filter ("Digital Safety"): Found ${searchFilter.total} items`);
  if (searchFilter.total === 0) {
    throw new Error('Search query should have found the course!');
  }

  // 4. Test Stats
  console.log('\n4. Testing Stats Aggregator...');
  const statsRes = await getAdminAuditStats();
  console.log('   Stats Result:', statsRes.stats);
  console.log('   Unique Admins:', statsRes.uniqueAdminEmails);
  if (statsRes.stats.totalActions < 4) {
    throw new Error('Stats did not count all inserted records!');
  }

  console.log('\n🎉 ALL ADMIN AUDIT SYSTEM TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
