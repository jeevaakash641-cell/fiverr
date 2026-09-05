import { generateSessionToken } from '../src/services/firebaseAuth.js';
import { verifyFirebaseIdToken } from './services/firebaseAuthService.js';
import { requireAdmin } from './middleware/auth.js';
import { saveUser } from './services/userService.js';

async function runTests() {
  console.log('--- Testing Bearer Token Flow & Admin Route Access ---');

  // 1. Setup in-memory users
  await saveUser({
    email: 'admin@onecommunityely.com',
    name: 'Ely Admin',
    userType: 'teacher',
    isBanned: false
  });

  await saveUser({
    email: 'learner@ely.org',
    name: 'Learner User',
    userType: 'student',
    isBanned: false
  });

  // 2. Generate tokens
  const adminToken = generateSessionToken({
    email: 'admin@onecommunityely.com',
    name: 'Ely Admin',
    userType: 'teacher'
  });

  const learnerToken = generateSessionToken({
    email: 'learner@ely.org',
    name: 'Learner User',
    userType: 'student'
  });

  console.log('Admin token generated:', adminToken ? 'YES' : 'NO');
  console.log('Learner token generated:', learnerToken ? 'YES' : 'NO');

  // 3. Verify Admin token through verifyFirebaseIdToken
  const adminDecoded = await verifyFirebaseIdToken(adminToken);
  console.log('adminDecoded email:', adminDecoded.email);
  if (adminDecoded.email !== 'admin@onecommunityely.com') {
    throw new Error('Admin decoded email mismatch');
  }
  console.log('✅ PASS: verifyFirebaseIdToken successfully verified admin token claims');

  // 4. Test requireAdmin middleware with missing token (expect 401)
  let status401 = null;
  let body401 = null;
  const mockReqNoToken = { headers: {} };
  const mockRes401 = {
    status: (s) => { status401 = s; return mockRes401; },
    json: (d) => { body401 = d; }
  };
  await requireAdmin(mockReqNoToken, mockRes401, () => {});
  if (status401 === 401 && body401.error.includes('Authorization Bearer token is required')) {
    console.log('✅ PASS: Missing token correctly triggers 401 Unauthorized');
  } else {
    throw new Error(`Expected 401, got ${status401}: ${JSON.stringify(body401)}`);
  }

  // 5. Test requireAdmin middleware with learner token (expect 403)
  let status403 = null;
  let body403 = null;
  const mockReqLearner = { headers: { authorization: `Bearer ${learnerToken}` } };
  const mockRes403 = {
    status: (s) => { status403 = s; return mockRes403; },
    json: (d) => { body403 = d; }
  };
  await requireAdmin(mockReqLearner, mockRes403, () => {});
  if (status403 === 403 && body403.error.includes('Forbidden')) {
    console.log('✅ PASS: Learner token correctly rejected by requireAdmin with 403 Forbidden');
  } else {
    throw new Error(`Expected 403, got ${status403}: ${JSON.stringify(body403)}`);
  }

  // 6. Test requireAdmin middleware with Admin token (expect next() called, req.adminUser set)
  let adminNextCalled = false;
  const mockReqAdmin = { headers: { authorization: `Bearer ${adminToken}` } };
  const mockResAdmin = {
    status: () => mockResAdmin,
    json: () => {}
  };
  await requireAdmin(mockReqAdmin, mockResAdmin, () => {
    adminNextCalled = true;
  });
  if (adminNextCalled && mockReqAdmin.adminUser?.email === 'admin@onecommunityely.com') {
    console.log('✅ PASS: Admin token successfully authorizes requireAdmin and attaches adminUser');
  } else {
    throw new Error('Expected requireAdmin to call next() for admin token');
  }

  console.log('\n🎉 ALL BEARER TOKEN TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
