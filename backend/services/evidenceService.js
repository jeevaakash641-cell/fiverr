/**
 * Evidence Library Service — One Community Ely Online Training Centre
 * Community activity and impact evidence recording system for One Community Ely CIC.
 * 
 * Table: OneCommunityElyEvidence (PK: evidenceId)
 * Organisation ID: one-community-ely-cic
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

export const ORGANISATION_ID = 'one-community-ely-cic';
export const EVIDENCE_TABLE = process.env.DYNAMODB_TABLE_EVIDENCE || 'OneCommunityElyEvidence';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'edulearn-books-storage';
const EVIDENCE_STORE_PATH = path.join(process.cwd(), 'data', 'evidence_records.json');

// --- DynamoDB Client Setup ---
let docClient = null;

export function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
    docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return docClient;
}

// --- S3 Client Setup ---
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
  }
  return s3Client;
}

// --- In-Memory & File Store for Offline / Test Resilience ---
export const inMemoryEvidence = new Map();
// In-memory attachment buffer store for tests / offline when S3 is unavailable
export const inMemoryAttachmentBuffers = new Map();

function loadPersistedEvidence() {
  try {
    if (fs.existsSync(EVIDENCE_STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(EVIDENCE_STORE_PATH, 'utf-8'));
      if (Array.isArray(data)) {
        data.forEach(item => inMemoryEvidence.set(item.evidenceId, item));
      }
    }
  } catch (err) {
    console.warn('[evidenceService] Could not read persisted evidence records:', err.message);
  }
}

export function persistEvidence() {
  try {
    const dir = path.dirname(EVIDENCE_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const records = Array.from(inMemoryEvidence.values());
    fs.writeFileSync(EVIDENCE_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[evidenceService] Could not persist evidence records:', err.message);
  }
}

// Initial load
loadPersistedEvidence();

// --- Constants & Enums ---
export const EVIDENCE_CATEGORIES = [
  'Training',
  'Community Event',
  'Podcast',
  'Workshop',
  'Volunteering',
  'Outreach',
  'Partnership',
  'Other'
];

export const EVIDENCE_STATUSES = ['draft', 'published', 'archived'];

export const CONSENT_STATUSES = [
  'No public-use permission',
  'Anonymous use permitted',
  'Named use permitted',
  'Consent withdrawn'
];

export const ATTACHMENT_LIMITS = {
  image: 15 * 1024 * 1024,      // 15MB
  document: 25 * 1024 * 1024,   // 25MB
  video: 50 * 1024 * 1024       // 50MB
};

// --- Helper Functions ---

/**
 * Validate that an external URL is strictly a valid HTTPS URL
 */
export function validateHttpsUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();

  // Explicitly reject harmful schemes and script injection
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return false;
  if (/<script/i.test(trimmed) || /['"><]/.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    // Hostname must be valid and contain at least one dot
    if (!parsed.hostname || !parsed.hostname.includes('.') || parsed.hostname.length < 3) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize filename to prevent directory traversal and harmful characters
 */
export function sanitizeFilename(filename = '') {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, '_')
    .trim()
    .substring(0, 100) || 'attachment';
}

/**
 * Verify magic bytes/signature of file buffer against declared content type
 */
export function verifyFileSignature(buffer, mimetype, originalname) {
  if (!buffer || buffer.length < 4) return false;

  const ext = path.extname(originalname || '').toLowerCase();
  const mime = (mimetype || '').toLowerCase();

  // JPEG: FF D8 FF
  if (mime === 'image/jpeg' || ext === '.jpg' || ext === '.jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  // PNG: 89 50 4E 47 (0x89 'PNG')
  if (mime === 'image/png' || ext === '.png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }

  // WebP: RIFF ... WEBP
  if (mime === 'image/webp' || ext === '.webp') {
    return (
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.length >= 12 &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP'
    );
  }

  // PDF: %PDF-
  if (mime === 'application/pdf' || ext === '.pdf') {
    return buffer.slice(0, 4).toString('ascii') === '%PDF';
  }

  // DOCX: PK (Zip archive containing [Content_Types].xml)
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return buffer[0] === 0x50 && buffer[1] === 0x4B; // PK
  }

  // DOC: D0 CF 11 E0 (CFB container)
  if (mime === 'application/msword' || ext === '.doc') {
    return (
      buffer[0] === 0xD0 &&
      buffer[1] === 0xCF &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xE0
    );
  }

  // MP4 / WebM video
  if (mime === 'video/mp4' || ext === '.mp4') {
    // MP4 usually has 'ftyp' starting at byte 4
    return buffer.length >= 8 && buffer.slice(4, 8).toString('ascii') === 'ftyp';
  }

  if (mime === 'video/webm' || ext === '.webm') {
    // WebM starts with 1A 45 DF A3 (EBML header)
    return (
      buffer[0] === 0x1A &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xDF &&
      buffer[3] === 0xA3
    );
  }

  return false;
}

/**
 * Determine attachment type category from mimetype
 */
export function getAttachmentTypeCategory(mimetype) {
  const mime = (mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

/**
 * Generate unique evidence identifier
 */
export function generateEvidenceId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `ev_${ts}_${rand}`;
}

/**
 * Generate unique attachment identifier
 */
export function generateAttachmentId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `att_${ts}_${rand}`;
}

// --- Evidence CRUD Operations ---

/**
 * Create a new evidence record
 */
export async function createEvidenceRecord(inputData, user) {
  const userEmail = (user?.email || 'admin@onecommunityely.com').toLowerCase().trim();
  const now = new Date().toISOString();

  // Validate required fields
  const activityTitle = (inputData.activityTitle || '').trim();
  if (!activityTitle || activityTitle.length < 3) {
    throw new Error('Activity title is required (at least 3 characters).');
  }
  if (activityTitle.length > 150) {
    throw new Error('Activity title cannot exceed 150 characters.');
  }

  const description = (inputData.description || '').trim();
  if (!description) {
    throw new Error('Description is required.');
  }
  if (description.length > 3000) {
    throw new Error('Description cannot exceed 3000 characters.');
  }

  const activityDate = (inputData.activityDate || '').trim();
  if (!activityDate || isNaN(new Date(activityDate).getTime())) {
    throw new Error('A valid activity date (YYYY-MM-DD) is required.');
  }

  // Validate category
  let category = (inputData.category || 'Community Event').trim();
  if (!EVIDENCE_CATEGORIES.includes(category)) {
    category = 'Other';
  }

  let customCategory = (inputData.customCategory || '').trim();
  if (category === 'Other') {
    if (!customCategory) {
      throw new Error('Custom category is required when "Other" is selected.');
    }
    if (customCategory.length > 60) {
      throw new Error('Custom category cannot exceed 60 characters.');
    }
  } else {
    customCategory = '';
  }

  // Validate attendanceCount
  let attendanceCount = null;
  if (inputData.attendanceCount !== undefined && inputData.attendanceCount !== null && inputData.attendanceCount !== '') {
    const parsed = Number(inputData.attendanceCount);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
      throw new Error('Attendance count must be a non-negative whole number.');
    }
    attendanceCount = parsed;
  }

  // Validate links (HTTPS only)
  const socialLinks = [];
  if (Array.isArray(inputData.socialLinks)) {
    for (const url of inputData.socialLinks) {
      if (typeof url === 'string' && url.trim()) {
        const cleanUrl = url.trim();
        if (!validateHttpsUrl(cleanUrl)) {
          throw new Error(`Invalid social link: "${cleanUrl}". Only valid https:// URLs are allowed.`);
        }
        socialLinks.push(cleanUrl);
      }
    }
  }

  const podcastLinks = [];
  if (Array.isArray(inputData.podcastLinks)) {
    for (const url of inputData.podcastLinks) {
      if (typeof url === 'string' && url.trim()) {
        const cleanUrl = url.trim();
        if (!validateHttpsUrl(cleanUrl)) {
          throw new Error(`Invalid podcast link: "${cleanUrl}". Only valid https:// URLs are allowed.`);
        }
        podcastLinks.push(cleanUrl);
      }
    }
  }

  const videoLinks = [];
  if (Array.isArray(inputData.videoLinks)) {
    for (const url of inputData.videoLinks) {
      if (typeof url === 'string' && url.trim()) {
        const cleanUrl = url.trim();
        if (!validateHttpsUrl(cleanUrl)) {
          throw new Error(`Invalid video link: "${cleanUrl}". Only valid https:// URLs are allowed.`);
        }
        videoLinks.push(cleanUrl);
      }
    }
  }

  // Status defaults to 'draft'
  let status = (inputData.status || 'draft').toLowerCase().trim();
  if (!EVIDENCE_STATUSES.includes(status)) {
    status = 'draft';
  }

  // Consent status
  let consentStatus = inputData.consentStatus || 'No public-use permission';
  if (!CONSENT_STATUSES.includes(consentStatus)) {
    consentStatus = 'No public-use permission';
  }

  const evidenceId = generateEvidenceId();

  const source = inputData.source === 'automatic' ? 'automatic' : 'manual';

  const record = {
    evidenceId,
    organisationId: ORGANISATION_ID,
    source,
    automaticKey: inputData.automaticKey || null,
    evidenceType: inputData.evidenceType || null,
    courseId: inputData.courseId || null,
    courseTitle: inputData.courseTitle || null,
    reportingPeriod: inputData.reportingPeriod || null,
    reportingStartDate: inputData.reportingStartDate || null,
    reportingEndDate: inputData.reportingEndDate || null,
    systemMetrics: inputData.systemMetrics || null,
    mainResult: inputData.mainResult || null,
    calculationMetadata: inputData.calculationMetadata || null,
    dataSources: inputData.dataSources || null,
    generatedAt: inputData.generatedAt || (source === 'automatic' ? now : null),
    lastRefreshedAt: inputData.lastRefreshedAt || (source === 'automatic' ? now : null),
    activityTitle,
    description,
    activityDate: activityDate.split('T')[0],
    activityDateUK: inputData.activityDateUK || null,
    location: (inputData.location || '').trim().substring(0, 120),
    attendanceCount,
    category,
    customCategory,
    attachments: [],
    socialLinks,
    podcastLinks,
    videoLinks,
    beneficiaryStories: (inputData.beneficiaryStories || '').trim().substring(0, 4000),
    caseStudies: (inputData.caseStudies || '').trim().substring(0, 4000),
    notes: (inputData.notes || '').trim().substring(0, 2000),
    adminNotes: (inputData.adminNotes || inputData.notes || '').trim().substring(0, 2000),
    outcomeSummary: (inputData.outcomeSummary || '').trim().substring(0, 2000),
    consentStatus,
    consentWithdrawalHistory: [],
    status,
    createdBy: userEmail,
    createdAt: now,
    updatedBy: userEmail,
    updatedAt: now,
    archivedAt: status === 'archived' ? now : null,
    version: 1
  };

  inMemoryEvidence.set(evidenceId, record);
  persistEvidence();

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: EVIDENCE_TABLE,
      Item: record
    }));
  } catch (err) {
    console.warn(`[evidenceService] DynamoDB put failed for ${EVIDENCE_TABLE}, using in-memory store:`, err.message);
  }

  return record;
}

/**
 * Get a single evidence record by ID
 */
export async function getEvidenceById(evidenceId) {
  if (!evidenceId) return null;

  let item = inMemoryEvidence.get(evidenceId) || null;

  if (!item) {
    try {
      const client = getClient();
      const res = await client.send(new GetCommand({
        TableName: EVIDENCE_TABLE,
        Key: { evidenceId }
      }));
      if (res.Item) {
        item = res.Item;
        inMemoryEvidence.set(evidenceId, item);
      }
    } catch (err) {
      // Rely on memory
    }
  }

  // Security guard: strictly ensure organisationId is one-community-ely-cic
  if (item && item.organisationId && item.organisationId !== ORGANISATION_ID) {
    return null;
  }

  return item;
}

/**
 * List evidence records with search, filters, pagination, and sorting
 */
export async function listEvidenceRecords(filters = {}) {
  let records = Array.from(inMemoryEvidence.values());

  if (records.length === 0) {
    try {
      const client = getClient();
      const res = await client.send(new ScanCommand({
        TableName: EVIDENCE_TABLE
      }));
      if (res.Items && res.Items.length > 0) {
        res.Items.forEach(it => inMemoryEvidence.set(it.evidenceId, it));
        records = res.Items;
      }
    } catch (err) {
      // Rely on memory
    }
  }

  // Enforce organisation boundary
  records = records.filter(r => (r.organisationId || ORGANISATION_ID) === ORGANISATION_ID);

  // Filter by Source (all, automatic, manual)
  const sourceFilter = (filters.source || 'all').toLowerCase().trim();
  if (sourceFilter === 'automatic') {
    records = records.filter(r => r.source === 'automatic');
  } else if (sourceFilter === 'manual') {
    records = records.filter(r => (r.source || 'manual') === 'manual');
  }

  // Filter by Status:
  // If no status filter given or status === 'all', show non-archived by default
  const statusFilter = (filters.status || '').toLowerCase().trim();
  if (statusFilter && statusFilter !== 'all') {
    records = records.filter(r => (r.status || 'draft').toLowerCase() === statusFilter);
  } else if (!statusFilter) {
    // Default view: exclude archived
    records = records.filter(r => (r.status || 'draft').toLowerCase() !== 'archived');
  }

  // Filter by Category
  const categoryFilter = (filters.category || '').trim();
  if (categoryFilter && categoryFilter !== 'all') {
    records = records.filter(r => r.category === categoryFilter || r.customCategory === categoryFilter);
  }

  // Filter by Date Range (activityDate)
  if (filters.startDate) {
    const start = filters.startDate.split('T')[0];
    records = records.filter(r => r.activityDate >= start);
  }
  if (filters.endDate) {
    const end = filters.endDate.split('T')[0];
    records = records.filter(r => r.activityDate <= end);
  }

  // Search by title, location, description
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    records = records.filter(r =>
      (r.activityTitle || '').toLowerCase().includes(q) ||
      (r.location || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q) ||
      (r.outcomeSummary || '').toLowerCase().includes(q)
    );
  }

  // Sorting
  const sort = filters.sort === 'oldest' ? 'oldest' : 'newest';
  records.sort((a, b) => {
    const dateA = new Date(a.activityDate || 0).getTime();
    const dateB = new Date(b.activityDate || 0).getTime();
    if (dateA !== dateB) {
      return sort === 'oldest' ? dateA - dateB : dateB - dateA;
    }
    const createdA = new Date(a.createdAt || 0).getTime();
    const createdB = new Date(b.createdAt || 0).getTime();
    return sort === 'oldest' ? createdA - createdB : createdB - createdA;
  });

  // Pagination
  const totalCount = records.length;
  const page = Math.max(1, parseInt(filters.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(filters.limit || '10', 10)));
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedRecords = records.slice(startIndex, startIndex + limit);

  return {
    records: paginatedRecords,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages
    }
  };
}

/**
 * Update an existing evidence record with optimistic locking
 */
export async function updateEvidenceRecord(evidenceId, updateData, user) {
  const existing = await getEvidenceById(evidenceId);
  if (!existing) {
    throw new Error('Evidence record not found.');
  }

  // Optimistic locking / version check
  if (updateData.version !== undefined && updateData.version !== null) {
    const expectedVersion = Number(updateData.version);
    const currentVersion = Number(existing.version || 1);
    if (expectedVersion !== currentVersion) {
      const conflictError = new Error('Conflict: This record was modified by another session. Please refresh and retry.');
      conflictError.statusCode = 409;
      throw conflictError;
    }
  }

  const userEmail = (user?.email || 'admin@onecommunityely.com').toLowerCase().trim();
  const now = new Date().toISOString();

  // Validate required fields if provided
  let activityTitle = existing.activityTitle;
  if (updateData.activityTitle !== undefined) {
    activityTitle = (updateData.activityTitle || '').trim();
    if (!activityTitle || activityTitle.length < 3) {
      throw new Error('Activity title is required (at least 3 characters).');
    }
    if (activityTitle.length > 150) {
      throw new Error('Activity title cannot exceed 150 characters.');
    }
  }

  let description = existing.description;
  if (updateData.description !== undefined) {
    description = (updateData.description || '').trim();
    if (!description) {
      throw new Error('Description is required.');
    }
    if (description.length > 3000) {
      throw new Error('Description cannot exceed 3000 characters.');
    }
  }

  let activityDate = existing.activityDate;
  if (updateData.activityDate !== undefined) {
    const rawDate = (updateData.activityDate || '').trim();
    if (!rawDate || isNaN(new Date(rawDate).getTime())) {
      throw new Error('A valid activity date (YYYY-MM-DD) is required.');
    }
    activityDate = rawDate.split('T')[0];
  }

  let category = existing.category;
  let customCategory = existing.customCategory;
  if (updateData.category !== undefined) {
    category = (updateData.category || 'Community Event').trim();
    if (!EVIDENCE_CATEGORIES.includes(category)) category = 'Other';

    if (category === 'Other') {
      customCategory = (updateData.customCategory || '').trim();
      if (!customCategory) {
        throw new Error('Custom category is required when "Other" is selected.');
      }
      if (customCategory.length > 60) {
        throw new Error('Custom category cannot exceed 60 characters.');
      }
    } else {
      customCategory = '';
    }
  }

  let attendanceCount = existing.attendanceCount;
  if (updateData.attendanceCount !== undefined) {
    if (updateData.attendanceCount === null || updateData.attendanceCount === '') {
      attendanceCount = null;
    } else {
      const parsed = Number(updateData.attendanceCount);
      if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        throw new Error('Attendance count must be a non-negative whole number.');
      }
      attendanceCount = parsed;
    }
  }

  // Validate links
  let socialLinks = existing.socialLinks || [];
  if (Array.isArray(updateData.socialLinks)) {
    socialLinks = [];
    for (const url of updateData.socialLinks) {
      if (typeof url === 'string' && url.trim()) {
        const cleanUrl = url.trim();
        if (!validateHttpsUrl(cleanUrl)) {
          throw new Error(`Invalid social link: "${cleanUrl}". Only valid https:// URLs are allowed.`);
        }
        socialLinks.push(cleanUrl);
      }
    }
  }

  let podcastLinks = existing.podcastLinks || [];
  if (Array.isArray(updateData.podcastLinks)) {
    podcastLinks = [];
    for (const url of updateData.podcastLinks) {
      if (typeof url === 'string' && url.trim()) {
        const cleanUrl = url.trim();
        if (!validateHttpsUrl(cleanUrl)) {
          throw new Error(`Invalid podcast link: "${cleanUrl}". Only valid https:// URLs are allowed.`);
        }
        podcastLinks.push(cleanUrl);
      }
    }
  }

  let videoLinks = existing.videoLinks || [];
  if (Array.isArray(updateData.videoLinks)) {
    videoLinks = [];
    for (const url of updateData.videoLinks) {
      if (typeof url === 'string' && url.trim()) {
        const cleanUrl = url.trim();
        if (!validateHttpsUrl(cleanUrl)) {
          throw new Error(`Invalid video link: "${cleanUrl}". Only valid https:// URLs are allowed.`);
        }
        videoLinks.push(cleanUrl);
      }
    }
  }

  // Consent tracking and withdrawal history
  let consentStatus = existing.consentStatus || 'No public-use permission';
  const consentWithdrawalHistory = Array.isArray(existing.consentWithdrawalHistory)
    ? [...existing.consentWithdrawalHistory]
    : [];

  if (updateData.consentStatus !== undefined && CONSENT_STATUSES.includes(updateData.consentStatus)) {
    if (updateData.consentStatus === 'Consent withdrawn' && consentStatus !== 'Consent withdrawn') {
      consentWithdrawalHistory.push({
        withdrawnAt: now,
        withdrawnBy: userEmail,
        reason: updateData.consentWithdrawalReason || 'Consent withdrawn by administrator on behalf of beneficiary'
      });
    }
    consentStatus = updateData.consentStatus;
  }

  let status = existing.status;
  let archivedAt = existing.archivedAt;
  if (updateData.status !== undefined && EVIDENCE_STATUSES.includes(updateData.status.toLowerCase())) {
    status = updateData.status.toLowerCase();
    if (status === 'archived' && !archivedAt) {
      archivedAt = now;
    } else if (status !== 'archived') {
      archivedAt = null;
    }
  }

  const updatedRecord = {
    ...existing,
    activityTitle,
    description,
    activityDate,
    location: updateData.location !== undefined ? (updateData.location || '').trim().substring(0, 120) : existing.location,
    attendanceCount,
    category,
    customCategory,
    socialLinks,
    podcastLinks,
    videoLinks,
    beneficiaryStories: updateData.beneficiaryStories !== undefined ? (updateData.beneficiaryStories || '').trim().substring(0, 4000) : existing.beneficiaryStories,
    caseStudies: updateData.caseStudies !== undefined ? (updateData.caseStudies || '').trim().substring(0, 4000) : existing.caseStudies,
    notes: updateData.notes !== undefined ? (updateData.notes || '').trim().substring(0, 2000) : existing.notes,
    outcomeSummary: updateData.outcomeSummary !== undefined ? (updateData.outcomeSummary || '').trim().substring(0, 2000) : existing.outcomeSummary,
    consentStatus,
    consentWithdrawalHistory,
    attachments: updateData.attachments !== undefined ? updateData.attachments : (existing.attachments || []),
    status,
    archivedAt,
    updatedBy: userEmail,
    updatedAt: now,
    version: (existing.version || 1) + 1
  };

  inMemoryEvidence.set(evidenceId, updatedRecord);
  persistEvidence();

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: EVIDENCE_TABLE,
      Item: updatedRecord
    }));
  } catch (err) {
    console.warn(`[evidenceService] DynamoDB update failed, using in-memory store:`, err.message);
  }

  return updatedRecord;
}

/**
 * Update evidence status (archive, restore, publish, draft)
 */
export async function updateEvidenceStatus(evidenceId, newStatus, user) {
  const cleanStatus = (newStatus || '').toLowerCase().trim();
  if (!EVIDENCE_STATUSES.includes(cleanStatus)) {
    throw new Error(`Invalid status "${newStatus}". Allowed values: ${EVIDENCE_STATUSES.join(', ')}`);
  }

  return await updateEvidenceRecord(evidenceId, { status: cleanStatus }, user);
}

/**
 * Permanently delete evidence record and all its associated S3 attachments
 */
export async function deleteEvidenceRecord(evidenceId, user) {
  const existing = await getEvidenceById(evidenceId);
  if (!existing) {
    throw new Error('Evidence record not found.');
  }

  // Clean up all S3 attachments associated with this record
  if (Array.isArray(existing.attachments) && existing.attachments.length > 0) {
    for (const att of existing.attachments) {
      if (att.s3Key) {
        try {
          const client = getS3Client();
          await client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: att.s3Key
          }));
        } catch (err) {
          console.warn(`[evidenceService] Failed to clean up S3 object ${att.s3Key}:`, err.message);
        }
      }
      inMemoryAttachmentBuffers.delete(att.attachmentId);
    }
  }

  inMemoryEvidence.delete(evidenceId);
  persistEvidence();

  try {
    const client = getClient();
    await client.send(new DeleteCommand({
      TableName: EVIDENCE_TABLE,
      Key: { evidenceId }
    }));
  } catch (err) {
    console.warn(`[evidenceService] DynamoDB delete failed, using in-memory store:`, err.message);
  }

  return { success: true, message: `Evidence record ${evidenceId} permanently deleted.` };
}

// --- Attachment Operations ---

/**
 * Add attachment to an evidence record with S3 storage and strict verification
 */
export async function addEvidenceAttachment(evidenceId, file, description, user) {
  const existing = await getEvidenceById(evidenceId);
  if (!existing) {
    throw new Error('Evidence record not found.');
  }

  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new Error('Attachment file buffer is required.');
  }

  const userEmail = (user?.email || 'admin@onecommunityely.com').toLowerCase().trim();
  const originalFilename = file.originalname || 'attachment';
  const cleanFilename = sanitizeFilename(originalFilename);
  const mimetype = (file.mimetype || '').toLowerCase();
  const size = file.size || file.buffer.length;

  const category = getAttachmentTypeCategory(mimetype);
  const maxSize = ATTACHMENT_LIMITS[category] || ATTACHMENT_LIMITS.document;

  if (size > maxSize) {
    throw new Error(`File size ${(size / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed ${(maxSize / (1024 * 1024)).toFixed(0)}MB for ${category}s.`);
  }

  // Strict file signature check
  const isSignatureValid = verifyFileSignature(file.buffer, mimetype, originalFilename);
  if (!isSignatureValid) {
    throw new Error(`Invalid or disguised file content. File does not match declared type ${mimetype}.`);
  }

  const attachmentId = generateAttachmentId();
  const s3Key = `evidence/${evidenceId}/${attachmentId}_${cleanFilename}`;
  const now = new Date().toISOString();

  // Keep in memory buffer for offline / test download
  inMemoryAttachmentBuffers.set(attachmentId, {
    buffer: file.buffer,
    mimetype,
    filename: originalFilename
  });

  // Upload to S3
  let s3Uploaded = false;
  try {
    const client = getS3Client();
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: mimetype,
      Metadata: {
        evidenceid: evidenceId,
        attachmentid: attachmentId,
        originalfilename: encodeURIComponent(originalFilename),
        uploadedby: userEmail
      }
    }));
    s3Uploaded = true;
  } catch (err) {
    console.warn(`[evidenceService] S3 PutObject failed, relying on in-memory buffer:`, err.message);
  }

  const newAttachment = {
    attachmentId,
    type: category,
    originalFilename,
    contentType: mimetype,
    size,
    s3Key,
    uploadedBy: userEmail,
    uploadedAt: now,
    description: (description || '').trim().substring(0, 500)
  };

  const updatedAttachments = [...(existing.attachments || []), newAttachment];

  try {
    await updateEvidenceRecord(evidenceId, { attachments: updatedAttachments, version: existing.version }, user);
  } catch (updateErr) {
    // Orphaned S3 object cleanup: if metadata update fails, delete uploaded S3 object
    if (s3Uploaded) {
      try {
        const client = getS3Client();
        await client.send(new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key
        }));
      } catch (cleanErr) {
        console.warn(`[evidenceService] Orphaned S3 object cleanup failed for ${s3Key}:`, cleanErr.message);
      }
    }
    inMemoryAttachmentBuffers.delete(attachmentId);
    throw updateErr;
  }

  return newAttachment;
}

/**
 * Delete an attachment from an evidence record
 */
export async function removeEvidenceAttachment(evidenceId, attachmentId, user) {
  const existing = await getEvidenceById(evidenceId);
  if (!existing) {
    throw new Error('Evidence record not found.');
  }

  const targetAttachment = (existing.attachments || []).find(a => a.attachmentId === attachmentId);
  if (!targetAttachment) {
    throw new Error('Attachment not found on this evidence record.');
  }

  // Delete from S3
  if (targetAttachment.s3Key) {
    try {
      const client = getS3Client();
      await client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: targetAttachment.s3Key
      }));
    } catch (err) {
      console.warn(`[evidenceService] S3 delete object failed for ${targetAttachment.s3Key}:`, err.message);
    }
  }

  inMemoryAttachmentBuffers.delete(attachmentId);

  const updatedAttachments = (existing.attachments || []).filter(a => a.attachmentId !== attachmentId);
  await updateEvidenceRecord(evidenceId, { attachments: updatedAttachments, version: existing.version }, user);

  return { success: true, message: 'Attachment removed successfully.' };
}

/**
 * Get download stream or presigned URL for an attachment
 */
export async function getEvidenceAttachmentDownload(evidenceId, attachmentId) {
  const existing = await getEvidenceById(evidenceId);
  if (!existing) {
    throw new Error('Evidence record not found.');
  }

  const att = (existing.attachments || []).find(a => a.attachmentId === attachmentId);
  if (!att) {
    throw new Error('Attachment not found.');
  }

  // If in-memory buffer is present, return it directly
  if (inMemoryAttachmentBuffers.has(attachmentId)) {
    const item = inMemoryAttachmentBuffers.get(attachmentId);
    return {
      type: 'buffer',
      buffer: item.buffer,
      contentType: item.mimetype || att.contentType,
      filename: item.filename || att.originalFilename
    };
  }

  // Try S3 presigned URL or direct stream
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: att.s3Key
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    return {
      type: 'redirect',
      url: presignedUrl,
      filename: att.originalFilename
    };
  } catch (err) {
    throw new Error(`Failed to retrieve attachment: ${err.message}`);
  }
}
