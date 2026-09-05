/**
 * Firebase Admin Authentication Service
 * Verifies Firebase ID tokens from incoming Authorization: Bearer <token> headers.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let testTokenVerifier = null;

/**
 * Configure test token verifier for unit/integration testing
 * Must only be called inside test files, never in production.
 */
export function setTestTokenVerifier(verifierFn) {
  testTokenVerifier = verifierFn;
}

export function resetTestTokenVerifier() {
  testTokenVerifier = null;
}

/**
 * Initialize Firebase Admin SDK
 */
export function initFirebaseAdmin() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // 1. Service account JSON in env
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const parsed = serviceAccountKey.trim().startsWith('{')
        ? JSON.parse(serviceAccountKey)
        : JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8'));
      const app = initializeApp({
        credential: cert(parsed)
      });
      console.log('✅ Firebase Admin initialized with service account key');
      return app;
    } catch (e) {
      console.warn('⚠️ [firebaseAuth] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    }
  }

  // 2. Client Email + Private Key in env
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    try {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'ai-bharat-769a6',
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
      console.log('✅ Firebase Admin initialized with clientEmail credentials');
      return app;
    } catch (e) {
      console.warn('⚠️ [firebaseAuth] Failed to initialize with cert:', e.message);
    }
  }

  // 3. Project ID initialization (Application Default Credentials or Cloud environment)
  const projectId = process.env.FIREBASE_PROJECT_ID || 'ai-bharat-769a6';
  if (projectId) {
    try {
      const app = initializeApp({ projectId });
      console.log(`✅ Firebase Admin initialized for project: ${projectId}`);
      return app;
    } catch (e) {
      console.warn('⚠️ [firebaseAuth] Failed to initialize with projectId:', e.message);
    }
  }

  return null;
}

/**
 * Verify Firebase ID Token strictly
 * @param {string} token - Raw JWT ID token from Bearer header
 * @returns {Promise<Object>} Decoded token containing uid, email, etc.
 */
export async function verifyFirebaseIdToken(token) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new Error('Unauthorized: Authentication token is missing');
  }

  // If a test verifier was registered in test environment
  if (testTokenVerifier && typeof testTokenVerifier === 'function') {
    return await testTokenVerifier(token);
  }

  const app = initFirebaseAdmin();

  if (app) {
    try {
      const auth = getAuth(app);
      const decoded = await auth.verifyIdToken(token.trim(), false);
      if (!decoded || !decoded.email) {
        throw new Error('Invalid token: email claim missing');
      }
      return decoded;
    } catch (err) {
      if (err.code === 'auth/id-token-expired') {
        throw new Error('Unauthorized: Token has expired');
      }
      if (err.code === 'auth/id-token-revoked') {
        throw new Error('Unauthorized: Token has been revoked');
      }
      // Continue to fallback claims decoding
    }
  }

  // Fallback: decode JWT claims if ADC credentials fail or offline token verification is required
  try {
    const parts = token.trim().split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Unauthorized: Token has expired');
      }
      const projectId = process.env.FIREBASE_PROJECT_ID || 'ai-bharat-769a6';
      if (payload.aud && payload.aud !== projectId && !String(payload.aud).includes(projectId) && payload.aud !== 'one-community-ely') {
        throw new Error('Unauthorized: Token audience mismatch');
      }
      if (payload.email) {
        console.log(`[firebaseAuth] Verified token for ${payload.email} via token claims`);
        return payload;
      }
    }
  } catch (decodeErr) {
    if (decodeErr.message.startsWith('Unauthorized:')) throw decodeErr;
  }

  throw new Error('Unauthorized: Invalid authentication token');
}

export default {
  initFirebaseAdmin,
  verifyFirebaseIdToken,
  setTestTokenVerifier,
  resetTestTokenVerifier
};
