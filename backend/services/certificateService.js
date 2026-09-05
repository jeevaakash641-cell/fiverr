/**
 * Certificate of Completion Service
 * One Community Ely Online Training Centre
 * Table: EduLearnCertificates (PK: certificateId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getCourseById } from './courseService.js';
import { getCourseProgress, calculateCourseProgress } from './progressService.js';
import { getPublishedAssessmentForCourse as getPublishedAfterAssessment, getLearnerAfterResponse } from './afterAssessmentService.js';
import { getLearnerFeedback } from './beneficiaryFeedbackService.js';
import { getQuizzesByCourse, getQuizAttemptsByLearner } from './quizService.js';

const CERT_TABLE = process.env.DYNAMODB_TABLE_CERTIFICATES || 'EduLearnCertificates';

let docClient = null;

function getClient() {
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

// In-memory fallback & disk persistence
export const inMemoryCertificates = new Map();
const CERTIFICATES_STORE_PATH = path.join(process.cwd(), 'data', 'certificates.json');

function loadPersistedCertificates() {
  try {
    if (fs.existsSync(CERTIFICATES_STORE_PATH)) {
      const raw = fs.readFileSync(CERTIFICATES_STORE_PATH, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(c => inMemoryCertificates.set(c.certificateId, c));
      }
    }
  } catch (err) {
    console.warn('[certificateService] Failed to read persisted certificates:', err.message);
  }
}

export function persistCertificates() {
  try {
    const dir = path.dirname(CERTIFICATES_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const list = Array.from(inMemoryCertificates.values());
    fs.writeFileSync(CERTIFICATES_STORE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[certificateService] Failed to persist certificates:', err.message);
  }
}

loadPersistedCertificates();

// Counter for unique sequence numbers
let certificateCounter = 1000;

export const SIGNATORY_NAME = 'Angela Doggett';
export const SIGNATORY_TITLE = 'Director, One Community Ely CIC';
export const ISSUING_ORGANISATION = 'One Community Ely CIC';
export const MANDATORY_DISCLAIMER =
  'This certificate confirms completion of the stated training course. It is not a regulated qualification or professional accreditation.';

// Active certificate template state & persistence
let activeCertificateTemplate = null;
const TEMPLATE_STORE_PATH = path.join(process.cwd(), 'data', 'certificate_template.json');

function loadPersistedTemplate() {
  if (activeCertificateTemplate) return activeCertificateTemplate;
  try {
    if (fs.existsSync(TEMPLATE_STORE_PATH)) {
      const raw = fs.readFileSync(TEMPLATE_STORE_PATH, 'utf-8');
      activeCertificateTemplate = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[certificateService] Failed to read persisted certificate template:', err.message);
  }
  return activeCertificateTemplate;
}

function persistTemplate(template) {
  try {
    const dir = path.dirname(TEMPLATE_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (template) {
      fs.writeFileSync(TEMPLATE_STORE_PATH, JSON.stringify(template), 'utf-8');
    } else if (fs.existsSync(TEMPLATE_STORE_PATH)) {
      fs.unlinkSync(TEMPLATE_STORE_PATH);
    }
  } catch (err) {
    console.warn('[certificateService] Failed to persist certificate template:', err.message);
  }
}

export function getActiveCertificateTemplate() {
  const current = loadPersistedTemplate();
  if (!current) {
    return {
      hasCustomTemplate: false,
      templateType: 'default',
      name: 'Default One Community Ely Certificate',
      updatedAt: null
    };
  }
  return {
    hasCustomTemplate: true,
    templateType: current.templateType,
    fileName: current.fileName,
    mimeType: current.mimeType,
    dataUrl: current.dataUrl,
    updatedAt: current.updatedAt,
    uploadedBy: current.uploadedBy
  };
}

export function saveCertificateTemplate({ buffer, originalname, mimetype, uploadedBy }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Template file data is required');
  }

  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64}`;
  const isImage = mimetype.startsWith('image/');
  const isPdf = mimetype === 'application/pdf';

  const template = {
    hasCustomTemplate: true,
    templateType: isImage ? 'image' : (isPdf ? 'pdf' : 'document'),
    fileName: originalname,
    mimeType: mimetype,
    dataUrl,
    base64,
    updatedAt: new Date().toISOString(),
    uploadedBy: uploadedBy || 'admin'
  };

  activeCertificateTemplate = template;
  persistTemplate(template);

  return {
    success: true,
    message: 'Certificate template uploaded successfully',
    template: getActiveCertificateTemplate()
  };
}

export function resetCertificateTemplate() {
  activeCertificateTemplate = null;
  persistTemplate(null);
  return {
    success: true,
    message: 'Certificate template reset to default'
  };
}

/**
 * Format dynamic certificate file name based on User, Course and Date
 * Example: "Certificate - Jeeva Akash K - Managing Personal Money & Budgets - 04 September 2026.pdf"
 */
export function formatCertificateFileName(certData, extension = 'pdf') {
  const safeName = (certData?.learnerNameSnapshot || 'Learner')
    .replace(/[<>:"/\\|?*]+/g, '')
    .trim();
  const safeCourse = (certData?.courseTitleSnapshot || 'Course')
    .replace(/[<>:"/\\|?*]+/g, '')
    .trim();

  let dateStr = '';
  try {
    const rawDate = certData?.courseCompletionDate || certData?.issuedAt || new Date();
    dateStr = new Date(rawDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).replace(/[<>:"/\\|?*]+/g, '').trim();
  } catch {
    dateStr = new Date().toISOString().slice(0, 10);
  }

  const ext = extension.replace(/^\./, '');
  return `Certificate - ${safeName} - ${safeCourse} - ${dateStr}.${ext}`;
}

/**
 * Deterministic unique certificate key
 */
export function getCertificateId(cleanEmail, courseId) {
  return `cert_${cleanEmail}#${courseId}`;
}

/**
 * Concurrency-safe unique certificate number generator
 * Format: OCE-2026-XXXXX-XXXXXX
 */
export function generateCertificateNumber(courseTitle = 'COURSE') {
  certificateCounter++;
  const year = 2026;
  const cleanCode = (courseTitle || 'COURSE')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 5) || 'ELY01';
  const paddedSeq = String(certificateCounter).padStart(6, '0');
  return `OCE-${year}-${cleanCode}-${paddedSeq}`;
}

/**
 * Mask learner name for public verification privacy (e.g. "John Smith" -> "J*** S****")
 */
export function maskLearnerName(fullName = '') {
  if (!fullName) return 'Community Learner';
  return fullName
    .split(' ')
    .filter(Boolean)
    .map(part => {
      if (part.length <= 1) return part;
      return part[0] + '*'.repeat(Math.min(part.length - 1, 4));
    })
    .join(' ');
}

/**
 * Format date in UK standard: "3 September 2026"
 */
export function formatUKDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '3 September 2026';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Authoritative Backend Check: Certificate Eligibility
 */
export async function checkCertificateEligibility(courseId, learnerEmail) {
  if (!courseId || !learnerEmail) {
    return { eligible: false, reason: 'Course ID and learner email are required.' };
  }

  const cleanEmail = String(learnerEmail).toLowerCase().trim();

  // 1. Course Progress check (100%)
  const progress = await getCourseProgress(courseId, cleanEmail);
  if (!progress) {
    return {
      eligible: false,
      reason: 'Course not yet started.',
      requirements: { courseCompleted: false }
    };
  }

  const calc = await calculateCourseProgress(courseId, progress.completedLessonIds || []);
  const isContentCompleted = progress.status === 'completed' || (calc.totalCount > 0 && calc.completedCount >= calc.totalCount);

  if (!isContentCompleted) {
    return {
      eligible: false,
      reason: 'All required course lessons must be completed first.',
      requirements: {
        courseCompleted: false,
        completedLessons: calc.completedCount,
        totalLessons: calc.totalCount,
        progressPercentage: calc.progressPercentage
      }
    };
  }

  // 2. Required Quizzes check
  const courseQuizzes = await getQuizzesByCourse(courseId);
  const learnerAttempts = await getQuizAttemptsByLearner(cleanEmail);

  const pendingQuizzes = [];
  for (const q of courseQuizzes) {
    if (q.status === 'published') {
      const passed = learnerAttempts.some(att => att.quizId === q.quizId && att.passed === true);
      if (!passed) {
        pendingQuizzes.push(q.title || q.quizId);
      }
    }
  }

  if (pendingQuizzes.length > 0) {
    return {
      eligible: false,
      reason: `Please pass all required quizzes: ${pendingQuizzes.join(', ')}.`,
      requirements: {
        courseCompleted: true,
        quizzesPassed: false,
        pendingQuizzes
      }
    };
  }

  // 3. After Assessment check (if published for course)
  const afterAssessment = await getPublishedAfterAssessment(courseId);
  let afterResponseId = null;
  if (afterAssessment) {
    const afterResponse = await getLearnerAfterResponse(courseId, cleanEmail);
    if (!afterResponse) {
      return {
        eligible: false,
        reason: 'Please complete the final course reflection assessment.',
        requirements: {
          courseCompleted: true,
          quizzesPassed: true,
          afterAssessmentCompleted: false,
          afterAssessmentId: afterAssessment.assessmentId
        }
      };
    }
    afterResponseId = afterResponse.responseId;
  }

  // 4. Beneficiary Feedback check
  const feedback = await getLearnerFeedback(courseId, cleanEmail);
  if (!feedback) {
    return {
      eligible: false,
      reason: 'Please submit your course beneficiary feedback.',
      requirements: {
        courseCompleted: true,
        quizzesPassed: true,
        afterAssessmentCompleted: true,
        feedbackSubmitted: false
      }
    };
  }

  // 5. Existing certificate check
  const existingCert = await getCertificateByLearnerAndCourse(courseId, cleanEmail);

  return {
    eligible: true,
    alreadyIssued: !!existingCert,
    certificate: existingCert || null,
    requirements: {
      courseCompleted: true,
      quizzesPassed: true,
      afterAssessmentCompleted: true,
      feedbackSubmitted: true
    },
    afterAssessmentResponseId: afterResponseId,
    feedbackId: feedback.feedbackId,
    courseCompletionDate: progress.completedAt || progress.lastAccessedAt || new Date().toISOString()
  };
}

/**
 * Generate A4 Landscape PDF buffer using PDFKit
 */
export async function generateCertificatePDF(certData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 36, bottom: 36, left: 40, right: 40 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const pageWidth = 841.89;
      const pageHeight = 595.28;

      const currentTemplate = loadPersistedTemplate();
      const hasCustomImage = currentTemplate && currentTemplate.templateType === 'image' && currentTemplate.base64;

      if (hasCustomImage) {
        try {
          const imgBuffer = Buffer.from(currentTemplate.base64, 'base64');
          doc.image(imgBuffer, 0, 0, { width: pageWidth, height: pageHeight });
        } catch (imgErr) {
          console.warn('Failed to draw custom template image in PDF:', imgErr.message);
        }

        // Overlay dynamic learner details prominently onto the template
        doc.fontSize(26)
          .font('Helvetica-Bold')
          .fillColor('#1E3A8A')
          .text(certData.learnerNameSnapshot || 'Community Learner', 50, 230, {
            align: 'center',
            width: pageWidth - 100
          });

        doc.fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#23735F')
          .text(certData.courseTitleSnapshot || 'Training Course', 50, 300, {
            align: 'center',
            width: pageWidth - 100
          });

        const completionFormatted = formatUKDate(certData.courseCompletionDate);
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text(`Completed on: ${completionFormatted}`, 50, 350, {
            align: 'center',
            width: pageWidth - 100
          });

        // Verification string at bottom
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(`Cert No: ${certData.certificateNumber}  •  onecommunityely.com/verify/${certData.certificateNumber}`, 40, pageHeight - 35, {
            align: 'center',
            width: pageWidth - 80
          });

        doc.end();
        return;
      }

      // 1. Background Frame & Decorative Borders
      // Outer border
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(4)
        .stroke('#23735F');

      // Inner thin gold/green border
      doc.rect(26, 26, pageWidth - 52, pageHeight - 52)
        .lineWidth(1)
        .stroke('#D97706');

      // Subtle Corner Accents
      const cornerSize = 24;
      // Top Left
      doc.rect(20, 20, cornerSize, cornerSize).fill('#23735F');
      // Top Right
      doc.rect(pageWidth - 20 - cornerSize, 20, cornerSize, cornerSize).fill('#23735F');
      // Bottom Left
      doc.rect(20, pageHeight - 20 - cornerSize, cornerSize, cornerSize).fill('#23735F');
      // Bottom Right
      doc.rect(pageWidth - 20 - cornerSize, pageHeight - 20 - cornerSize, cornerSize, cornerSize).fill('#23735F');

      // Embed logo if available
      const possibleLogos = [
        path.join(process.cwd(), 'public', 'logo.png'),
        path.join(process.cwd(), '..', 'public', 'logo.png'),
        'd:/fingroo/ai-bharat-educational-platform-main/public/logo.png'
      ];
      const logoPath = possibleLogos.find(p => fs.existsSync(p));
      if (logoPath) {
        try {
          doc.image(logoPath, 50, 42, { fit: [48, 48], align: 'center' });
        } catch (e) {
          // ignore
        }
      }

      // 2. Organisation Header
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#23735F')
        .text('ONE COMMUNITY ELY ONLINE TRAINING CENTRE', 40, 50, {
          align: 'center',
          characterSpacing: 2
        });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text('Empowering Adult Community Learning in Cambridgeshire', 40, 68, {
          align: 'center'
        });

      // 3. Certificate Title
      doc.moveDown(1.2);
      doc.fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('CERTIFICATE OF COMPLETION', {
          align: 'center',
          characterSpacing: 1.5
        });

      // Decorative divider line
      const lineWidth = 180;
      doc.moveTo((pageWidth - lineWidth) / 2, 130)
        .lineTo((pageWidth + lineWidth) / 2, 130)
        .lineWidth(2)
        .stroke('#23735F');

      // 4. Recipient Presentation
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#4B5563')
        .text('This is to proudly certify that', 40, 150, {
          align: 'center'
        });

      // Learner Name Snapshot (Bold & Prominent)
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text(certData.learnerNameSnapshot || 'Community Learner', 40, 175, {
          align: 'center'
        });

      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#4B5563')
        .text('has successfully completed all required training modules and assessments for', 40, 215, {
          align: 'center'
        });

      // Course Title Snapshot
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#23735F')
        .text(certData.courseTitleSnapshot || 'Training Course', 50, 240, {
          align: 'center'
        });

      // 5. Completion & Issue Details
      const completionFormatted = formatUKDate(certData.courseCompletionDate);
      const issueFormatted = formatUKDate(certData.issuedAt);

      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#374151')
        .text(`Completed on ${completionFormatted}  •  Date of Issue: ${issueFormatted}`, 40, 285, {
          align: 'center'
        });

      // 6. Signatory & Verification Section (Two Columns)
      // Left: Verification Information
      const leftX = 80;
      const rightX = pageWidth - 280;
      const bottomY = 380;

      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('CERTIFICATE VERIFICATION', leftX, bottomY);

      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#4B5563')
        .text(`Certificate No: ${certData.certificateNumber}`, leftX, bottomY + 15)
        .text(`Status: ${(certData.status || 'ACTIVE').toUpperCase()}`, leftX, bottomY + 28)
        .text(`Verify online: onecommunityely.com/verify/${certData.certificateNumber}`, leftX, bottomY + 41);

      // Right: Authorised Signatory
      doc.moveTo(rightX, bottomY + 20)
        .lineTo(rightX + 180, bottomY + 20)
        .lineWidth(1)
        .stroke('#9CA3AF');

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(SIGNATORY_NAME, rightX, bottomY + 26, { align: 'center', width: 180 });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#4B5563')
        .text(SIGNATORY_TITLE, rightX, bottomY + 40, { align: 'center', width: 180 });

      // 7. Mandatory Disclaimer at the bottom
      doc.fontSize(7.5)
        .font('Helvetica-Oblique')
        .fillColor('#6B7280')
        .text(MANDATORY_DISCLAIMER, 40, 520, {
          align: 'center',
          width: pageWidth - 80
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Issue a Certificate (Idempotent)
 */
export async function issueCertificate(courseId, learnerUser) {
  if (!courseId || !learnerUser || !learnerUser.email) {
    throw new Error('Course ID and authenticated learner identity are required.');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();

  // 1. Authoritative Backend Eligibility Check
  const eligibility = await checkCertificateEligibility(courseId, cleanEmail);
  if (!eligibility.eligible) {
    const err = new Error(eligibility.reason || 'Course requirements not yet complete.');
    err.ineligible = true;
    err.requirements = eligibility.requirements;
    throw err;
  }

  // 2. Idempotency Check: return existing certificate
  const certificateId = getCertificateId(cleanEmail, courseId);
  const existing = await getCertificateById(certificateId);
  if (existing) {
    let pdfBuffer = existing.pdfBase64 ? Buffer.from(existing.pdfBase64, 'base64') : null;
    if (!pdfBuffer) {
      pdfBuffer = await generateCertificatePDF(existing);
    }
    return {
      success: true,
      alreadyIssued: true,
      newlyIssued: false,
      certificate: existing,
      pdfBuffer
    };
  }

  // 3. Load course title snapshot
  const course = await getCourseById(courseId);
  const courseTitleSnapshot = course?.title || 'One Community Ely Course';
  const learnerNameSnapshot = learnerUser.name || learnerUser.displayName || cleanEmail.split('@')[0];

  const certificateNumber = generateCertificateNumber(courseTitleSnapshot);
  const now = new Date().toISOString();

  const certRecord = {
    certificateId,
    certificateNumber,
    learnerEmail: cleanEmail,
    learnerId: learnerUser.id || cleanEmail,
    learnerNameSnapshot,
    courseId,
    courseTitleSnapshot,
    courseCompletionDate: eligibility.courseCompletionDate || now,
    issuedAt: now,
    status: 'active',
    signatoryName: SIGNATORY_NAME,
    signatoryTitle: SIGNATORY_TITLE,
    issuingOrganisation: ISSUING_ORGANISATION,
    disclaimer: MANDATORY_DISCLAIMER,
    eligibilitySnapshot: eligibility.requirements,
    pdfStorageKey: `certificates/${certificateNumber}.pdf`,
    createdAt: now,
    updatedAt: now,
    version: 1
  };

  // Generate PDF Buffer
  const pdfBuffer = await generateCertificatePDF(certRecord);
  certRecord.pdfBase64 = pdfBuffer.toString('base64');

  inMemoryCertificates.set(certificateId, certRecord);
  persistCertificates();

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: CERT_TABLE,
      Item: certRecord
    }));
  } catch (err) {
    console.warn(`[certificateService] DynamoDB put failed for ${CERT_TABLE}, using memory:`, err.message);
  }

  return {
    success: true,
    alreadyIssued: false,
    newlyIssued: true,
    certificate: certRecord,
    pdfBuffer
  };
}

/**
 * Get certificate by ID
 */
export async function getCertificateById(certificateId) {
  if (!certificateId) return null;

  let item = inMemoryCertificates.get(certificateId) || null;

  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: CERT_TABLE,
      Key: { certificateId }
    }));
    if (result.Item) {
      item = result.Item;
      inMemoryCertificates.set(certificateId, item);
    }
  } catch (err) {
    // Rely on memory
  }

  return item;
}

/**
 * Get certificate by learner and course
 */
export async function getCertificateByLearnerAndCourse(courseId, learnerEmail) {
  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  const certId = getCertificateId(cleanEmail, courseId);
  return await getCertificateById(certId);
}

/**
 * List all certificates for authenticated learner
 */
export async function getLearnerCertificates(learnerEmail) {
  if (!learnerEmail) return [];

  const cleanEmail = String(learnerEmail).toLowerCase().trim();
  let items = Array.from(inMemoryCertificates.values()).filter(c => c.learnerEmail === cleanEmail);

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: CERT_TABLE
    }));
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach(it => inMemoryCertificates.set(it.certificateId, it));
      items = result.Items.filter(c => c.learnerEmail === cleanEmail);
    }
  } catch (err) {
    // Rely on memory
  }

  items.sort((a, b) => new Date(b.issuedAt || 0) - new Date(a.issuedAt || 0));
  return items;
}

/**
 * List all certificates for Admin with filters
 */
export async function getAllCertificatesAdmin(filters = {}) {
  let items = Array.from(inMemoryCertificates.values());

  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({
      TableName: CERT_TABLE
    }));
    if (result.Items && result.Items.length > 0) {
      items = result.Items;
      items.forEach(it => inMemoryCertificates.set(it.certificateId, it));
    }
  } catch (err) {
    // Rely on memory
  }

  if (filters.courseId && filters.courseId !== 'all') {
    items = items.filter(c => c.courseId === filters.courseId);
  }

  if (filters.status && filters.status !== 'all') {
    items = items.filter(c => c.status === filters.status);
  }

  if (filters.search) {
    const q = String(filters.search).toLowerCase().trim();
    items = items.filter(c =>
      (c.learnerNameSnapshot || '').toLowerCase().includes(q) ||
      (c.learnerEmail || '').toLowerCase().includes(q) ||
      (c.certificateNumber || '').toLowerCase().includes(q) ||
      (c.courseTitleSnapshot || '').toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => new Date(b.issuedAt || 0) - new Date(a.issuedAt || 0));
  return items;
}

/**
 * Revoke Certificate (Admin only, requires reason)
 */
export async function revokeCertificate(certificateId, reason, adminEmail = 'admin@onecommunityely.com') {
  if (!reason || !reason.trim()) {
    throw new Error('A reason is required to revoke a certificate.');
  }

  const existing = await getCertificateById(certificateId);
  if (!existing) {
    throw new Error(`Certificate "${certificateId}" not found.`);
  }

  const now = new Date().toISOString();
  const updatedItem = {
    ...existing,
    status: 'revoked',
    revokedAt: now,
    revokedBy: adminEmail,
    revocationReason: reason.trim(),
    updatedAt: now
  };

  inMemoryCertificates.set(certificateId, updatedItem);
  persistCertificates();

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: CERT_TABLE,
      Item: updatedItem
    }));
  } catch (err) {
    console.warn('[certificateService] DynamoDB update failed, using memory:', err.message);
  }

  return updatedItem;
}

/**
 * Public Certificate Verification
 * Safe public lookup by certificateNumber returning masked details
 */
export async function verifyCertificatePublic(certificateNumber) {
  if (!certificateNumber) {
    return { valid: false, status: 'not_found', message: 'Certificate number required.' };
  }

  const cleanNum = String(certificateNumber).trim().toUpperCase();

  let match = Array.from(inMemoryCertificates.values()).find(
    c => c.certificateNumber?.toUpperCase() === cleanNum
  );

  if (!match) {
    try {
      const client = getClient();
      const result = await client.send(new ScanCommand({
        TableName: CERT_TABLE
      }));
      if (result.Items) {
        result.Items.forEach(it => inMemoryCertificates.set(it.certificateId, it));
        match = result.Items.find(c => c.certificateNumber?.toUpperCase() === cleanNum);
      }
    } catch (err) {
      // Memory fallback
    }
  }

  if (!match) {
    return {
      valid: false,
      status: 'not_found',
      certificateNumber: cleanNum,
      message: 'Certificate not found. Please verify the certificate number.'
    };
  }

  return {
    valid: match.status === 'active',
    status: match.status, // 'active' or 'revoked'
    certificateNumber: match.certificateNumber,
    learnerName: maskLearnerName(match.learnerNameSnapshot),
    courseTitle: match.courseTitleSnapshot,
    completionDate: formatUKDate(match.courseCompletionDate),
    issuedAt: formatUKDate(match.issuedAt),
    issuingOrganisation: ISSUING_ORGANISATION,
    revokedAt: match.revokedAt ? formatUKDate(match.revokedAt) : null,
    message: match.status === 'active'
      ? 'This certificate is authentic and officially issued by One Community Ely CIC.'
      : 'This certificate has been revoked.'
  };
}

export default {
  checkCertificateEligibility,
  issueCertificate,
  getCertificateById,
  getLearnerCertificates,
  getAllCertificatesAdmin,
  revokeCertificate,
  verifyCertificatePublic,
  generateCertificatePDF,
  getActiveCertificateTemplate,
  saveCertificateTemplate,
  resetCertificateTemplate,
  formatCertificateFileName
};
