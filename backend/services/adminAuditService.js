/**
 * Admin Audit Service — One Community Ely Online Training Centre
 * Dedicated administrative audit logging infrastructure for One Community Ely CIC.
 * 
 * Table: OneCommunityElyAdminAuditLogs (PK: auditId)
 * Organisation ID: one-community-ely-cic
 */

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const ORGANISATION_ID = 'one-community-ely-cic';
export const AUDIT_TABLE = process.env.DYNAMODB_TABLE_ADMIN_AUDIT || 'OneCommunityElyAdminAuditLogs';
const AUDIT_STORE_PATH = path.join(process.cwd(), 'data', 'admin_audit_records.json');

// Ensure data dir exists
const dataDir = path.dirname(AUDIT_STORE_PATH);
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

// In-memory / local fallback store for offline development / test resilience
export const inMemoryAuditLogs = new Map();

function loadLocalAuditStore() {
  try {
    if (fs.existsSync(AUDIT_STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(AUDIT_STORE_PATH, 'utf-8'));
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item && item.auditId) {
            inMemoryAuditLogs.set(item.auditId, item);
          }
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not load local admin audit file:', err.message);
  }
}

function saveLocalAuditStore() {
  try {
    const list = Array.from(inMemoryAuditLogs.values());
    fs.writeFileSync(AUDIT_STORE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Could not write local admin audit file:', err.message);
  }
}

loadLocalAuditStore();

// DynamoDB Client Setup
let rawDynamoClient = null;
let docClient = null;

export function getRawClient() {
  if (!rawDynamoClient) {
    rawDynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
  }
  return rawDynamoClient;
}

export function getDocClient() {
  if (!docClient) {
    docClient = DynamoDBDocumentClient.from(getRawClient(), {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return docClient;
}

/**
 * Ensure DynamoDB Table exists
 */
export async function ensureAuditTableExists() {
  try {
    const raw = getRawClient();
    try {
      await raw.send(new DescribeTableCommand({ TableName: AUDIT_TABLE }));
      return true;
    } catch (describeErr) {
      if (describeErr.name !== 'ResourceNotFoundException') {
        console.warn('⚠️ DescribeTable notice for audit logs:', describeErr.message);
      }
    }

    console.log(`🛠️ Creating DynamoDB table ${AUDIT_TABLE}...`);
    await raw.send(new CreateTableCommand({
      TableName: AUDIT_TABLE,
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: 'auditId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'auditId', AttributeType: 'S' },
        { AttributeName: 'organisationId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' },
        { AttributeName: 'category', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'OrgTimestampIndex',
          KeySchema: [
            { AttributeName: 'organisationId', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        },
        {
          IndexName: 'CategoryTimestampIndex',
          KeySchema: [
            { AttributeName: 'category', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        }
      ]
    }));
    console.log(`✅ Table ${AUDIT_TABLE} creation initiated`);
    return true;
  } catch (err) {
    console.warn(`⚠️ ensureAuditTableExists error (local fallback active): ${err.message}`);
    return false;
  }
}

// Allowed Categories
export const AuditCategories = {
  LEARNER_MANAGEMENT: 'Learner Management',
  COURSES_LESSONS: 'Courses & Lessons',
  RESOURCES: 'Resources',
  QUIZZES: 'Quizzes',
  ASSESSMENTS: 'Assessments',
  FEEDBACK: 'Feedback',
  CERTIFICATES: 'Certificates',
  REPORTS: 'Reports',
  EVIDENCE_LIBRARY: 'Evidence Library',
  ADMINS_SETTINGS: 'Admins & Settings',
  SECURITY: 'Security'
};

/**
 * Safe sanitization of metadata to guarantee no secrets or private sensitive data are recorded
 */
function sanitizeAuditMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') return {};
  const sanitized = {};
  const forbiddenKeys = [
    'password', 'passwords', 'token', 'authorization', 'bearer', 'secret',
    'secretkey', 'accesskey', 'answers', 'learneranswers', 'questions',
    'testimonial', 'fulltext', 'content', 'filebuffer', 'buffer'
  ];

  for (const [key, val] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenKeys.some(fk => lowerKey.includes(fk))) {
      continue;
    }
    if (typeof val === 'string' && val.length > 500) {
      sanitized[key] = val.slice(0, 500) + '...';
    } else if (typeof val === 'object' && val !== null) {
      if (Array.isArray(val)) {
        sanitized[key] = val.slice(0, 20).map(item => (typeof item === 'string' ? item.slice(0, 100) : item));
      } else {
        sanitized[key] = sanitizeAuditMetadata(val);
      }
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Centralized function to record an Admin Action
 */
export async function recordAdminAction({
  admin,
  action,
  category = AuditCategories.ADMINS_SETTINGS,
  targetType = 'System',
  targetId = '',
  targetName = '',
  result = 'Success', // 'Success' | 'Failed' | 'Denied'
  description = '',
  changedFields = [],
  metadata = {},
  req = null,
  requestId = null
}) {
  try {
    const timestamp = new Date().toISOString();
    const auditId = 'audit_' + uuidv4().replace(/-/g, '').slice(0, 16);
    const corrId = requestId || req?.headers?.['x-request-id'] || 'req_' + uuidv4().slice(0, 8);

    // Extract admin details safely from verified auth object
    const adminEmail = String(admin?.email || req?.adminUser?.email || req?.user?.email || 'admin@onecommunityely.com').toLowerCase().trim();
    const adminName = admin?.name || req?.adminUser?.name || req?.user?.name || (adminEmail.split('@')[0]);
    const adminId = admin?.id || admin?.userId || req?.adminUser?.id || req?.user?.id || 'admin_sys';

    // Route & client details (if req is passed)
    const route = req?.originalUrl || req?.path || '';
    const httpMethod = req?.method || 'INTERNAL';
    const statusCode = req?.res?.statusCode || 200;
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 150) : '';

    const safeChangedFields = Array.isArray(changedFields) ? changedFields.filter(f => typeof f === 'string') : [];

    const record = {
      auditId,
      organisationId: ORGANISATION_ID,
      timestamp,
      adminId,
      adminNameSnapshot: adminName,
      adminEmailSnapshot: adminEmail,
      action: String(action || 'Admin Action').trim(),
      category: String(category || AuditCategories.ADMINS_SETTINGS).trim(),
      targetType: String(targetType || 'System').trim(),
      targetId: String(targetId || '').trim(),
      targetNameSnapshot: String(targetName || '').trim(),
      result: ['Success', 'Failed', 'Denied'].includes(result) ? result : 'Success',
      description: String(description || `${adminName} performed ${action}`).trim(),
      changedFields: safeChangedFields,
      requestId: corrId,
      route,
      httpMethod,
      statusCode,
      ipAddress: ipAddress ? String(ipAddress).slice(0, 60) : '',
      userAgent,
      metadata: sanitizeAuditMetadata(metadata),
      createdAt: timestamp
    };

    // Store in-memory & local fallback file immediately
    inMemoryAuditLogs.set(auditId, record);
    saveLocalAuditStore();

    // Persist to DynamoDB asynchronously
    try {
      const doc = getDocClient();
      await doc.send(new PutCommand({
        TableName: AUDIT_TABLE,
        Item: record
      }));
    } catch (dbErr) {
      console.warn(`⚠️ DynamoDB audit write warning: ${dbErr.message} (Record preserved locally)`);
    }

    return record;
  } catch (err) {
    console.error('❌ Failed to record admin audit log:', err.message);
    // Do not throw so caller operation is never corrupted
    return null;
  }
}

/**
 * Query & Filter Admin Audit Logs
 */
export async function queryAdminAuditLogs({
  category = 'all',
  adminEmail = 'all',
  result = 'all',
  search = '',
  rangePreset = 'all',
  startDate = '',
  endDate = '',
  sortBy = 'newest',
  page = 1,
  limit = 20
} = {}) {
  let logs = [];

  // Try fetching all logs from DynamoDB or fallback to local store
  try {
    const doc = getDocClient();
    const scanRes = await doc.send(new ScanCommand({
      TableName: AUDIT_TABLE
    }));
    if (scanRes && scanRes.Items && scanRes.Items.length > 0) {
      logs = scanRes.Items;
      // Sync to in-memory map
      logs.forEach(item => inMemoryAuditLogs.set(item.auditId, item));
    } else {
      logs = Array.from(inMemoryAuditLogs.values());
    }
  } catch (err) {
    logs = Array.from(inMemoryAuditLogs.values());
  }

  // Ensure organisation isolation
  logs = logs.filter(l => (l.organisationId || ORGANISATION_ID) === ORGANISATION_ID);

  // Apply filters
  if (category && category !== 'all') {
    logs = logs.filter(l => String(l.category).toLowerCase() === String(category).toLowerCase());
  }

  if (adminEmail && adminEmail !== 'all') {
    logs = logs.filter(l => String(l.adminEmailSnapshot || '').toLowerCase() === String(adminEmail).toLowerCase());
  }

  if (result && result !== 'all') {
    logs = logs.filter(l => String(l.result || '').toLowerCase() === String(result).toLowerCase());
  }

  // Date Range calculation
  const now = new Date();
  let startTs = null;
  let endTs = null;

  if (rangePreset === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startTs = startOfToday.getTime();
  } else if (rangePreset === '7days') {
    startTs = now.getTime() - (7 * 24 * 60 * 60 * 1000);
  } else if (rangePreset === '30days') {
    startTs = now.getTime() - (30 * 24 * 60 * 60 * 1000);
  }

  if (startDate) {
    const customStart = new Date(startDate).getTime();
    if (!isNaN(customStart)) startTs = customStart;
  }
  if (endDate) {
    const customEnd = new Date(endDate);
    customEnd.setHours(23, 59, 59, 999);
    const customEndTs = customEnd.getTime();
    if (!isNaN(customEndTs)) endTs = customEndTs;
  }

  if (startTs !== null) {
    logs = logs.filter(l => new Date(l.timestamp).getTime() >= startTs);
  }
  if (endTs !== null) {
    logs = logs.filter(l => new Date(l.timestamp).getTime() <= endTs);
  }

  // Search filter
  if (search && search.trim()) {
    const s = search.toLowerCase().trim();
    logs = logs.filter(l =>
      (l.adminNameSnapshot || '').toLowerCase().includes(s) ||
      (l.adminEmailSnapshot || '').toLowerCase().includes(s) ||
      (l.action || '').toLowerCase().includes(s) ||
      (l.targetNameSnapshot || '').toLowerCase().includes(s) ||
      (l.targetType || '').toLowerCase().includes(s) ||
      (l.description || '').toLowerCase().includes(s) ||
      (l.requestId || '').toLowerCase().includes(s)
    );
  }

  // Sorting
  logs.sort((a, b) => {
    const tsA = new Date(a.timestamp || 0).getTime();
    const tsB = new Date(b.timestamp || 0).getTime();
    return sortBy === 'oldest' ? tsA - tsB : tsB - tsA;
  });

  const total = logs.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 20);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startIndex = (pageNum - 1) * pageSize;
  const paginatedLogs = logs.slice(startIndex, startIndex + pageSize);

  return {
    success: true,
    total,
    page: pageNum,
    totalPages,
    limit: pageSize,
    logs: paginatedLogs
  };
}

/**
 * Aggregate summary statistics for Admin Activity History
 */
export async function getAdminAuditStats() {
  let logs = [];
  try {
    const doc = getDocClient();
    const scanRes = await doc.send(new ScanCommand({ TableName: AUDIT_TABLE }));
    if (scanRes && scanRes.Items && scanRes.Items.length > 0) {
      logs = scanRes.Items;
      logs.forEach(item => inMemoryAuditLogs.set(item.auditId, item));
    } else {
      logs = Array.from(inMemoryAuditLogs.values());
    }
  } catch (err) {
    logs = Array.from(inMemoryAuditLogs.values());
  }

  logs = logs.filter(l => (l.organisationId || ORGANISATION_ID) === ORGANISATION_ID);

  const totalActions = logs.length;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const actionsToday = logs.filter(l => new Date(l.timestamp).getTime() >= startOfToday).length;

  const uniqueAdmins = new Set(logs.map(l => (l.adminEmailSnapshot || '').toLowerCase()).filter(Boolean));
  const activeAdminsCount = uniqueAdmins.size;

  const securitySensitiveCategories = [
    AuditCategories.SECURITY,
    AuditCategories.ADMINS_SETTINGS,
    AuditCategories.CERTIFICATES
  ];
  const securitySensitiveActions = logs.filter(l =>
    securitySensitiveCategories.includes(l.category) ||
    (l.action && (l.action.toLowerCase().includes('ban') || l.action.toLowerCase().includes('role') || l.action.toLowerCase().includes('password') || l.action.toLowerCase().includes('revoke')))
  ).length;

  const failedOrDeniedActions = logs.filter(l => l.result === 'Failed' || l.result === 'Denied').length;

  return {
    success: true,
    stats: {
      totalActions,
      actionsToday,
      activeAdminsCount,
      securitySensitiveActions,
      failedOrDeniedActions
    },
    uniqueAdminEmails: Array.from(uniqueAdmins)
  };
}
