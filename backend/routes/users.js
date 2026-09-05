import express from 'express';
import { saveUser, getUserByEmail, updateUser, deleteUser } from '../services/userService.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { recordAdminAction, AuditCategories } from '../services/adminAuditService.js';

const router = express.Router();

const TABLE = process.env.DYNAMODB_USERS_TABLE || 'EduLearnUsers';
let docClient = null;
function getDocClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(), secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim() },
    });
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

/** GET /api/users — list all users (Admin only) */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const client = getDocClient();
    const result = await client.send(new ScanCommand({ TableName: TABLE }));
    const users = (result.Items || []).map(u => {
      const { password, ...safeUser } = u;
      return safeUser;
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error('GET all users error:', err);
    res.status(500).json({ error: err.message, users: [] });
  }
});

/** GET /api/users/search/:id — find student by numeric ID (Admin only) */
router.get('/search/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    // Try both Number and String versions of the id (DynamoDB stores what was sent)
    let user = null;

    for (const idVal of [Number(id), String(id)]) {
      const result = await getDocClient().send(new ScanCommand({
        TableName: TABLE,
        FilterExpression: '#id = :id',
        ExpressionAttributeNames: { '#id': 'id' },
        ExpressionAttributeValues: { ':id': idVal },
      }));
      const found = result.Items?.find(u => u.userType === 'student');
      if (found) { user = found; break; }
    }

    if (!user) return res.status(404).json({ error: 'Not found' });
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Search by ID error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/users/:email — fetch user profile (Admin or Self only) */
router.get('/:email', requireAuth, async (req, res) => {
  try {
    const cleanEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
    const reqEmail = (req.user?.email || '').toLowerCase().trim();
    const isSelf = cleanEmail === reqEmail;
    const isAdmin = req.user?.userType === 'teacher' || req.user?.userType === 'admin' || req.user?.role === 'admin' || reqEmail === 'admin@onecommunityely.com';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: You cannot access another user\'s profile' });
    }

    const user = await getUserByEmail(cleanEmail);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('GET user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/users — create user (Registration or Admin creation) */
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    // Sanitize and trim text values
    const sanitizedData = { ...req.body };
    if (typeof sanitizedData.name === 'string') sanitizedData.name = sanitizedData.name.trim();
    if (typeof sanitizedData.generalLocation === 'string') sanitizedData.generalLocation = sanitizedData.generalLocation.trim();
    if (typeof sanitizedData.residencyConfirmation === 'string') sanitizedData.residencyConfirmation = sanitizedData.residencyConfirmation.trim();
    if (typeof sanitizedData.otherLearningInterest === 'string') sanitizedData.otherLearningInterest = sanitizedData.otherLearningInterest.trim();
    if (typeof sanitizedData.ageRange === 'string') sanitizedData.ageRange = sanitizedData.ageRange.trim();
    if (typeof sanitizedData.learningInterests === 'string') sanitizedData.learningInterests = sanitizedData.learningInterests.trim();
    if (Array.isArray(sanitizedData.learningInterests)) {
      sanitizedData.learningInterests = sanitizedData.learningInterests.map(i => typeof i === 'string' ? i.trim() : i).filter(Boolean);
    }

    // Privilege escalation prevention:
    // Only an authenticated Admin can create users with role 'admin' or userType 'teacher'/'admin'
    const isElevated = sanitizedData.role === 'admin' || sanitizedData.userType === 'teacher' || sanitizedData.userType === 'admin';
    if (isElevated) {
      const authHeader = req.headers['authorization'];
      let hasAdminAuth = false;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { verifyFirebaseIdToken } = await import('../services/firebaseAuthService.js');
          const decoded = await verifyFirebaseIdToken(authHeader.split('Bearer ')[1].trim());
          if (decoded?.email) {
            const caller = await getUserByEmail(decoded.email);
            if (caller?.userType === 'teacher' || caller?.userType === 'admin' || caller?.role === 'admin' || caller?.email === 'admin@onecommunityely.com') {
              hasAdminAuth = true;
            }
          }
        } catch {}
      }

      if (!hasAdminAuth) {
        // Demote to student on unauthenticated registration attempt
        sanitizedData.role = 'student';
        sanitizedData.userType = 'student';
      }
    } else {
      sanitizedData.role = 'student';
      sanitizedData.userType = 'student';
    }

    sanitizedData.isBanned = false;
    sanitizedData.status = 'active';

    const user = await saveUser(sanitizedData);
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('POST user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/users/session — record active session, kick out old device */
router.post('/session', async (req, res) => {
  try {
    const { email, deviceId } = req.body;
    if (!email || !deviceId) return res.status(400).json({ error: 'email and deviceId required' });
    await updateUser(email, { activeDeviceId: deviceId, lastLoginAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/users/session/:email/:deviceId — check if this device is still the active one */
router.get('/session/:email/:deviceId', async (req, res) => {
  try {
    const user = await getUserByEmail(decodeURIComponent(req.params.email));
    if (!user) return res.json({ valid: false });
    const valid = !user.activeDeviceId || user.activeDeviceId === req.params.deviceId;
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/users/:email — partial update (Admin or Self only) */
router.patch('/:email', requireAuth, async (req, res) => {
  try {
    const cleanEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
    const reqEmail = (req.user?.email || '').toLowerCase().trim();
    const isSelf = cleanEmail === reqEmail;
    const isAdmin = req.user?.userType === 'teacher' || req.user?.userType === 'admin' || req.user?.role === 'admin' || reqEmail === 'admin@onecommunityely.com';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: You cannot modify another user\'s profile' });
    }

    const updates = { ...req.body };

    // Non-admins cannot alter role, userType, isBanned, status, or system IDs
    if (!isAdmin) {
      delete updates.role;
      delete updates.userType;
      delete updates.isBanned;
      delete updates.status;
      delete updates.email;
      delete updates.id;
      delete updates.createdAt;
    }

    // Safety guard: preserve primary admin account
    if (cleanEmail === 'admin@onecommunityely.com') {
      if (updates.isBanned) updates.isBanned = false;
      if (updates.status === 'banned') updates.status = 'active';
      updates.userType = 'teacher';
      updates.role = 'admin';
    }

    if (typeof updates.name === 'string') updates.name = updates.name.trim();
    if (typeof updates.generalLocation === 'string') updates.generalLocation = updates.generalLocation.trim();
    if (typeof updates.residencyConfirmation === 'string') updates.residencyConfirmation = updates.residencyConfirmation.trim();
    if (typeof updates.otherLearningInterest === 'string') updates.otherLearningInterest = updates.otherLearningInterest.trim();
    if (typeof updates.ageRange === 'string') updates.ageRange = updates.ageRange.trim();
    if (typeof updates.learningInterests === 'string') updates.learningInterests = updates.learningInterests.trim();
    if (Array.isArray(updates.learningInterests)) {
      updates.learningInterests = updates.learningInterests.map(i => typeof i === 'string' ? i.trim() : i).filter(Boolean);
    }

    const updated = await updateUser(cleanEmail, updates);
    const { password, ...safeUser } = updated || {};

    if (isAdmin) {
      const isTargetLearner = safeUser?.userType !== 'teacher' && safeUser?.role !== 'admin';
      const category = isTargetLearner ? AuditCategories.LEARNER_MANAGEMENT : AuditCategories.ADMINS_SETTINGS;
      let actionTitle = 'Updated User Profile';
      if (updates.isBanned === true || updates.status === 'banned') {
        actionTitle = isTargetLearner ? 'Banned Learner' : 'Banned User';
      } else if (updates.isBanned === false && updates.status === 'active') {
        actionTitle = isTargetLearner ? 'Unbanned Learner' : 'Unbanned User';
      } else if (updates.role || updates.userType) {
        actionTitle = 'Changed User Role';
      }

      await recordAdminAction({
        admin: req.user,
        action: actionTitle,
        category,
        targetType: isTargetLearner ? 'Learner' : 'Admin',
        targetId: cleanEmail,
        targetName: safeUser?.name || cleanEmail,
        result: 'Success',
        description: `${req.user?.name || req.user?.email} updated ${isTargetLearner ? 'learner' : 'user'} (${cleanEmail}). Changed: ${Object.keys(updates).join(', ')}`,
        changedFields: Object.keys(updates),
        req
      });
    }

    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('PATCH user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/users/:email (Admin only) */
router.delete('/:email', requireAdmin, async (req, res) => {
  try {
    const cleanEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
    if (cleanEmail === 'admin@onecommunityely.com') {
      return res.status(400).json({ success: false, error: 'Cannot delete the primary Ely Administrator account' });
    }
    await deleteUser(cleanEmail);

    await recordAdminAction({
      admin: req.adminUser,
      action: 'Deleted User Account',
      category: AuditCategories.LEARNER_MANAGEMENT,
      targetType: 'User',
      targetId: cleanEmail,
      targetName: cleanEmail,
      result: 'Success',
      description: `${req.adminUser?.name || req.adminUser?.email} deleted user account (${cleanEmail})`,
      req
    });

    res.json({ success: true, message: `User ${cleanEmail} deleted` });
  } catch (err) {
    console.error('DELETE user error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
