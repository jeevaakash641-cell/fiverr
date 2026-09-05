/**
 * Authentication & Authorization Middleware
 * Strictly validates Authorization: Bearer <firebase-id-token> using Firebase Admin SDK
 * Derives user identity exclusively from the verified token and loads trusted role from DynamoDB.
 */

import { getUserByEmail } from '../services/userService.js';
import { verifyFirebaseIdToken } from '../services/firebaseAuthService.js';

/**
 * Extract Bearer token strictly from Authorization header
 */
function extractBearerToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const parts = authHeader.trim().split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1].trim();
  }
  return null;
}

/**
 * Core token authenticator:
 * 1. Requires valid Bearer token from Authorization header.
 * 2. Verifies token signature and expiration via Firebase Admin SDK.
 * 3. Derives email exclusively from verified token payload.
 * 4. Loads authoritative user record from DynamoDB.
 * 5. Rejects missing users with 401.
 * 6. Rejects banned users with 403.
 */
async function authenticateToken(req, res) {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Authorization Bearer token is required'
    });
    return null;
  }

  let decodedToken;
  try {
    decodedToken = await verifyFirebaseIdToken(token);
  } catch (tokenErr) {
    const msg = tokenErr.message.startsWith('Unauthorized:') ? tokenErr.message : `Unauthorized: ${tokenErr.message}`;
    res.status(401).json({
      success: false,
      error: msg
    });
    return null;
  }

  const verifiedEmail = decodedToken?.email ? String(decodedToken.email).toLowerCase().trim() : null;
  if (!verifiedEmail) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Verified token must contain an email claim'
    });
    return null;
  }

  let userRecord;
  try {
    userRecord = await getUserByEmail(verifiedEmail);
  } catch (dbErr) {
    res.status(500).json({
      success: false,
      error: `Authentication Service Error: Failed to retrieve user record (${dbErr.message})`
    });
    return null;
  }

  if (!userRecord) {
    res.status(401).json({
      success: false,
      error: `Unauthorized: No user account found for ${verifiedEmail}`
    });
    return null;
  }

  if (userRecord.isBanned || userRecord.status === 'banned') {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Account has been suspended'
    });
    return null;
  }

  return { user: userRecord, auth: decodedToken };
}

/**
 * Require Administrator (teacher/admin) privileges
 */
export async function requireAdmin(req, res, next) {
  try {
    const authResult = await authenticateToken(req, res);
    if (!authResult) return; // Response already sent

    const { user, auth } = authResult;

    const userType = String(user.userType || '').toLowerCase().trim();
    const userRole = String(user.role || '').toLowerCase().trim();
    const isElyAdmin = String(user.email || '').toLowerCase().trim() === 'admin@onecommunityely.com';

    // Role MUST come from trusted DynamoDB record, never frontend input
    if (userType !== 'teacher' && userType !== 'admin' && userRole !== 'admin' && userRole !== 'teacher' && !isElyAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Administrator privileges required'
      });
    }

    req.adminUser = user;
    req.user = user;
    req.auth = auth;
    next();
  } catch (err) {
    console.error('requireAdmin middleware error:', err);
    res.status(500).json({
      success: false,
      error: 'Authentication verification failed: ' + err.message
    });
  }
}

/**
 * Require Authenticated Learner (student)
 */
export async function requireLearner(req, res, next) {
  try {
    const authResult = await authenticateToken(req, res);
    if (!authResult) return;

    const { user, auth } = authResult;

    const uType = String(user.userType || '').toLowerCase().trim();
    const uRole = String(user.role || '').toLowerCase().trim();
    const isElyAdmin = String(user.email || '').toLowerCase().trim() === 'admin@onecommunityely.com';

    // Allow student, or teacher/admin exploring the learner experience
    if (uType !== 'student' && uType !== 'teacher' && uRole !== 'admin' && !isElyAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Learner access required'
      });
    }

    req.learnerUser = user;
    req.user = user;
    req.learnerEmail = user.email;
    req.auth = auth;
    next();
  } catch (err) {
    console.error('requireLearner middleware error:', err);
    res.status(500).json({
      success: false,
      error: 'Learner verification failed: ' + err.message
    });
  }
}

/**
 * Require Any Authenticated User (Admin or Learner)
 */
export async function requireAuth(req, res, next) {
  try {
    const authResult = await authenticateToken(req, res);
    if (!authResult) return;

    const { user, auth } = authResult;

    req.user = user;
    req.auth = auth;
    req.learnerEmail = user.email;
    next();
  } catch (err) {
    console.error('requireAuth middleware error:', err);
    res.status(500).json({
      success: false,
      error: 'Authentication failed: ' + err.message
    });
  }
}

export default { requireAdmin, requireLearner, requireAuth };
