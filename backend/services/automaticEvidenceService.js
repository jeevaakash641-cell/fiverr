/**
 * Automatic Evidence Service — One Community Ely Online Training Centre
 * Automatically creates and updates aggregated evidence summaries from verified backend activity:
 * - Learner registrations and active learners
 * - Course selections, starts, lesson progression, and completions
 * - Quiz attempts, average scores, pass counts, and pass rates
 * - Baseline and Final Assessment submissions and confidence deltas
 * - Beneficiary feedback ratings and recommendation percentages
 * - Issued and active certificates
 * 
 * Deterministic keys prevent duplicate records.
 * Admin notes, outcome interpretations, attachments, and approvals are strictly preserved during refreshes.
 * System-calculated metrics are read-only and derived from authoritative backend storage.
 */

import crypto from 'crypto';
import {
  ORGANISATION_ID,
  inMemoryEvidence,
  getEvidenceById,
  persistEvidence,
  getClient,
  EVIDENCE_TABLE
} from './evidenceService.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getAllUsersAdmin } from './userService.js';
import { getAllCoursesAdmin } from './courseService.js';
import { getAllCourseSelectionsAdmin } from './courseSelectionService.js';
import { getAllProgressRecordsAdmin } from './progressService.js';
import { getAllQuizzesAdmin, getAllQuizAttemptsAdmin } from './quizService.js';
import { getAllBaselineResponsesAdmin } from './baselineAssessmentService.js';
import { getAllAfterAssessmentResponsesAdmin } from './afterAssessmentService.js';
import { getAllFeedbackSubmissions } from './beneficiaryFeedbackService.js';
import { getAllCertificatesAdmin } from './certificateService.js';
import { formatUKDate, formatCsv, sanitizeCsvCell } from './impactReportingService.js';

/**
 * Check if date falls within [startDate, endDate]
 */
function isDateInRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const dateOnly = d.toISOString().split('T')[0];

  if (startDate && dateOnly < startDate) return false;
  if (endDate && dateOnly > endDate) return false;
  return true;
}

/**
 * Filter out Administrators (Ely admin and teacher accounts)
 */
function isLearnerUser(u) {
  if (!u) return false;
  const email = (u.email || '').toLowerCase().trim();
  const role = (u.role || u.userType || '').toLowerCase().trim();
  if (email === 'admin@onecommunityely.com') return false;
  if (role === 'teacher' || role === 'admin') return false;
  return true;
}

/**
 * Generate a deterministic key for an automatic evidence record
 * Key format: organisationId#evidenceType#courseId#reportingPeriod
 */
export function generateAutomaticEvidenceKey({ evidenceType, courseId = 'all', reportingPeriod = 'all_time' }) {
  const cleanType = String(evidenceType || 'monthly_engagement').toLowerCase().trim();
  const cleanCourse = String(courseId || 'all').toLowerCase().trim();
  const cleanPeriod = String(reportingPeriod || 'all_time').toLowerCase().trim();
  return `${ORGANISATION_ID}#${cleanType}#${cleanCourse}#${cleanPeriod}`;
}

/**
 * Generate deterministic evidenceId from key
 */
export function getAutomaticEvidenceId(automaticKey) {
  const hash = crypto.createHash('sha256').update(automaticKey).digest('hex').substring(0, 16);
  return `ev_auto_${hash}`;
}

/**
 * Save an automatic record to memory and DynamoDB
 */
async function saveAutomaticRecord(record) {
  inMemoryEvidence.set(record.evidenceId, record);
  persistEvidence();

  try {
    const client = getClient();
    client.send(new PutCommand({
      TableName: EVIDENCE_TABLE,
      Item: record
    })).catch(() => {});
  } catch (err) {
    // Rely on memory store for offline/tests
  }
  return record;
}

/**
 * Scan stored backend activity and generate all automatic evidence summaries
 */
export async function generateAllAutomaticEvidence(options = {}, user) {
  const now = new Date().toISOString();
  const todayUK = formatUKDate(now);

  // 1. Fetch data from verified subsystems
  const [
    rawUsers,
    rawCourses,
    rawSelections,
    rawProgress,
    rawQuizzes,
    rawQuizAttempts,
    rawBaselines,
    rawAfterResponses,
    rawFeedback,
    rawCertificates
  ] = await Promise.all([
    getAllUsersAdmin(),
    getAllCoursesAdmin(),
    getAllCourseSelectionsAdmin(),
    getAllProgressRecordsAdmin(),
    getAllQuizzesAdmin(),
    getAllQuizAttemptsAdmin(),
    getAllBaselineResponsesAdmin(),
    getAllAfterAssessmentResponsesAdmin(),
    getAllFeedbackSubmissions(),
    getAllCertificatesAdmin()
  ]);

  // Exclude administrators
  const learners = rawUsers.filter(isLearnerUser);
  const learnerEmails = new Set(learners.map(l => (l.email || '').toLowerCase().trim()).filter(Boolean));

  // Filter selections, progress, quizzes, etc. to valid learners
  const selections = rawSelections.filter(s => learnerEmails.has((s.learnerId || s.learnerEmail || '').toLowerCase().trim()));
  const progressList = rawProgress.filter(p => learnerEmails.has((p.learnerEmail || '').toLowerCase().trim()));
  const quizAttempts = rawQuizAttempts.filter(a => learnerEmails.has((a.learnerEmail || '').toLowerCase().trim()));
  const baselines = rawBaselines.filter(b => learnerEmails.has((b.learnerEmail || '').toLowerCase().trim()));
  const afterResponses = rawAfterResponses.filter(a => learnerEmails.has((a.learnerEmail || '').toLowerCase().trim()));
  const feedbackList = rawFeedback.filter(f => learnerEmails.has((f.learnerEmail || '').toLowerCase().trim()));
  const certificates = rawCertificates.filter(c => learnerEmails.has((c.learnerEmail || '').toLowerCase().trim()));

  const courses = rawCourses || [];
  const courseMap = new Map(courses.map(c => [c.courseId, c.title]));

  const generatedSummaries = [];

  // ------------------------------------------------------------------------
  // SUMMARY 1: Platform-wide All-Time Learner Engagement & Growth
  // ------------------------------------------------------------------------
  {
    const autoKey = generateAutomaticEvidenceKey({
      evidenceType: 'monthly_engagement',
      courseId: 'all',
      reportingPeriod: 'all_time'
    });
    const evidenceId = getAutomaticEvidenceId(autoKey);
    const existing = inMemoryEvidence.get(evidenceId);

    // Active learners: users with any activity event
    const activeEmails = new Set();
    learners.forEach(l => { if (l.lastActiveAt) activeEmails.add(l.email.toLowerCase()); });
    selections.forEach(s => { if (s.learnerId) activeEmails.add(s.learnerId.toLowerCase()); });
    progressList.forEach(p => { if (p.learnerEmail) activeEmails.add(p.learnerEmail.toLowerCase()); });
    quizAttempts.forEach(q => { if (q.learnerEmail) activeEmails.add(q.learnerEmail.toLowerCase()); });

    const totalLearners = learners.length;
    const activeLearners = activeEmails.size;
    const totalStarts = progressList.filter(p => (p.completedLessonsCount || 0) > 0 || p.status === 'in_progress' || p.status === 'completed').length;
    const totalCompletions = progressList.filter(p => p.status === 'completed').length;
    const totalCertificates = certificates.filter(c => c.status === 'active').length;

    const lessonsCompletedCount = progressList.reduce((sum, p) => sum + (Number(p.completedLessonsCount) || 0), 0);
    const completionRate = totalStarts > 0 ? Number(((totalCompletions / totalStarts) * 100).toFixed(1)) : 0;

    const systemMetrics = {
      registeredLearnersCount: totalLearners,
      activeLearnersCount: activeLearners,
      coursesSelectedCount: selections.length,
      coursesStartedCount: totalStarts,
      lessonsCompletedCount,
      quizAttemptsCount: quizAttempts.length,
      uniqueQuizLearnersCount: new Set(quizAttempts.map(q => q.learnerEmail?.toLowerCase()).filter(Boolean)).size,
      averageQuizScore: quizAttempts.length > 0 ? Number((quizAttempts.reduce((s, a) => s + (Number(a.percentage) || 0), 0) / quizAttempts.length).toFixed(1)) : 0,
      quizPassRate: quizAttempts.length > 0 ? Number(((quizAttempts.filter(a => a.passed).length / quizAttempts.length) * 100).toFixed(1)) : 0,
      coursesCompletedCount: totalCompletions,
      overallCompletionRate: completionRate,
      baselineSubmissionsCount: baselines.length,
      finalAssessmentSubmissionsCount: afterResponses.length,
      validComparisonCount: 0,
      averageBaselineConfidence: null,
      averageFinalConfidence: null,
      averageConfidenceChange: null,
      feedbackSubmissionsCount: feedbackList.length,
      averageUsefulnessRating: feedbackList.length > 0 ? Number((feedbackList.reduce((s, f) => s + (Number(f.usefulnessRating) || 0), 0) / feedbackList.length).toFixed(1)) : 0,
      averageConfidenceRating: feedbackList.length > 0 ? Number((feedbackList.reduce((s, f) => s + (Number(f.confidenceRating) || 0), 0) / feedbackList.length).toFixed(1)) : 0,
      recommendationPercentage: feedbackList.length > 0 ? Number(((feedbackList.filter(f => f.wouldRecommend === true || f.wouldRecommend === 'yes').length / feedbackList.length) * 100).toFixed(1)) : 0,
      certificatesIssuedCount: totalCertificates
    };

    const record = {
      evidenceId,
      organisationId: ORGANISATION_ID,
      source: 'automatic',
      automaticKey: autoKey,
      evidenceType: 'monthly_engagement',
      activityTitle: 'Platform Learner Engagement & Training Activity (All Time)',
      description: `Comprehensive record of verified adult learner training engagement on the One Community Ely training platform. Reflects ${totalLearners} registered adult learners, ${activeLearners} active participants, and ${totalCompletions} course completions.`,
      reportingPeriod: 'all_time',
      reportingStartDate: null,
      reportingEndDate: null,
      courseId: null,
      courseTitle: 'All Courses',
      activityDate: now.split('T')[0],
      activityDateUK: todayUK,
      location: 'Online Training Centre — One Community Ely',
      category: 'Training',
      customCategory: '',
      attendanceCount: activeLearners,
      systemMetrics,
      mainResult: `${activeLearners} active learners • ${totalCompletions} completed courses`,
      calculationVersion: '1.0',
      calculationMetadata: {
        formula: 'Active Learners = Unique users with logged activity, selections, starts, or quiz attempts.',
        dataSources: ['users', 'selections', 'progress', 'certificates'],
        generatedFrom: 'verified_platform_activity',
        lastCalculationRun: now
      },
      dataSources: ['users', 'selections', 'progress', 'certificates'],
      adminNotes: existing?.adminNotes || '',
      outcomeSummary: existing?.outcomeSummary || '',
      attachments: existing?.attachments || [],
      externalLinks: existing?.externalLinks || [],
      status: existing?.status || 'draft',
      consentStatus: 'Anonymous use permitted',
      generatedAt: existing?.generatedAt || now,
      lastRefreshedAt: now,
      version: existing ? (existing.version || 1) + 1 : 1
    };

    await saveAutomaticRecord(record);
    generatedSummaries.push(record);
  }

  // ------------------------------------------------------------------------
  // SUMMARY 2: Current Month Learner Engagement
  // ------------------------------------------------------------------------
  {
    const dNow = new Date();
    const currentMonthStr = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = `${currentMonthStr}-01`;
    const monthName = dNow.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

    const autoKey = generateAutomaticEvidenceKey({
      evidenceType: 'monthly_engagement',
      courseId: 'all',
      reportingPeriod: currentMonthStr
    });
    const evidenceId = getAutomaticEvidenceId(autoKey);
    const existing = inMemoryEvidence.get(evidenceId);

    const monthLearners = learners.filter(l => isDateInRange(l.registeredAt || l.createdAt, startOfMonth, null)).length;
    const monthActiveEmails = new Set();
    learners.forEach(l => { if (isDateInRange(l.lastActiveAt, startOfMonth, null)) monthActiveEmails.add(l.email.toLowerCase()); });
    selections.forEach(s => { if (isDateInRange(s.selectedAt || s.createdAt, startOfMonth, null)) monthActiveEmails.add(s.learnerId.toLowerCase()); });
    progressList.forEach(p => { if (isDateInRange(p.lastAccessedAt || p.startedAt, startOfMonth, null)) monthActiveEmails.add(p.learnerEmail.toLowerCase()); });

    const monthStarts = progressList.filter(p => isDateInRange(p.startedAt, startOfMonth, null)).length;
    const monthCompletions = progressList.filter(p => p.status === 'completed' && isDateInRange(p.completedAt || p.lastAccessedAt, startOfMonth, null)).length;
    const monthCertificates = certificates.filter(c => c.status === 'active' && isDateInRange(c.issuedAt, startOfMonth, null)).length;
    const completionRate = monthStarts > 0 ? Number(((monthCompletions / monthStarts) * 100).toFixed(1)) : 0;

    const systemMetrics = {
      registeredLearnersCount: monthLearners,
      activeLearnersCount: monthActiveEmails.size,
      coursesSelectedCount: selections.filter(s => isDateInRange(s.selectedAt || s.createdAt, startOfMonth, null)).length,
      coursesStartedCount: monthStarts,
      lessonsCompletedCount: progressList.filter(p => isDateInRange(p.lastAccessedAt, startOfMonth, null)).reduce((sum, p) => sum + (Number(p.completedLessonsCount) || 0), 0),
      quizAttemptsCount: quizAttempts.filter(q => isDateInRange(q.submittedAt, startOfMonth, null)).length,
      uniqueQuizLearnersCount: new Set(quizAttempts.filter(q => isDateInRange(q.submittedAt, startOfMonth, null)).map(q => q.learnerEmail?.toLowerCase()).filter(Boolean)).size,
      averageQuizScore: 0,
      quizPassRate: 0,
      coursesCompletedCount: monthCompletions,
      overallCompletionRate: completionRate,
      baselineSubmissionsCount: baselines.filter(b => isDateInRange(b.submittedAt, startOfMonth, null)).length,
      finalAssessmentSubmissionsCount: afterResponses.filter(a => isDateInRange(a.submittedAt, startOfMonth, null)).length,
      validComparisonCount: 0,
      averageBaselineConfidence: null,
      averageFinalConfidence: null,
      averageConfidenceChange: null,
      feedbackSubmissionsCount: feedbackList.filter(f => isDateInRange(f.submittedAt, startOfMonth, null)).length,
      averageUsefulnessRating: 0,
      averageConfidenceRating: 0,
      recommendationPercentage: 0,
      certificatesIssuedCount: monthCertificates
    };

    const record = {
      evidenceId,
      organisationId: ORGANISATION_ID,
      source: 'automatic',
      automaticKey: autoKey,
      evidenceType: 'monthly_engagement',
      activityTitle: `Monthly Learner Engagement — ${monthName}`,
      description: `Verified training centre activity and learner progression during ${monthName}. Includes ${monthActiveEmails.size} active learners and ${monthCompletions} course completions.`,
      reportingPeriod: currentMonthStr,
      reportingStartDate: startOfMonth,
      reportingEndDate: null,
      courseId: null,
      courseTitle: 'All Courses',
      activityDate: now.split('T')[0],
      activityDateUK: todayUK,
      location: 'Online Training Centre — One Community Ely',
      category: 'Community Event',
      customCategory: '',
      attendanceCount: monthActiveEmails.size,
      systemMetrics,
      mainResult: `${monthActiveEmails.size} active learners in ${monthName}`,
      calculationVersion: '1.0',
      calculationMetadata: {
        formula: 'Active learners with recorded training activity in reporting month.',
        dataSources: ['users', 'selections', 'progress', 'certificates'],
        generatedFrom: 'verified_platform_activity',
        lastCalculationRun: now
      },
      dataSources: ['users', 'selections', 'progress', 'certificates'],
      adminNotes: existing?.adminNotes || '',
      outcomeSummary: existing?.outcomeSummary || '',
      attachments: existing?.attachments || [],
      externalLinks: existing?.externalLinks || [],
      status: existing?.status || 'draft',
      consentStatus: 'Anonymous use permitted',
      generatedAt: existing?.generatedAt || now,
      lastRefreshedAt: now,
      version: existing ? (existing.version || 1) + 1 : 1
    };

    await saveAutomaticRecord(record);
    generatedSummaries.push(record);
  }

  // ------------------------------------------------------------------------
  // SUMMARY 3: Course-by-Course Outcomes & Completions
  // ------------------------------------------------------------------------
  for (const course of courses) {
    const cid = course.courseId;
    const cTitle = course.title || 'Course';

    const courseSelections = selections.filter(s => s.courseId === cid);
    const courseProgress = progressList.filter(p => p.courseId === cid);
    const courseQuizzes = rawQuizzes.filter(q => q.courseId === cid);
    const quizIds = new Set(courseQuizzes.map(q => q.quizId));
    const courseAttempts = quizAttempts.filter(a => quizIds.has(a.quizId));
    const courseBaselines = baselines.filter(b => b.courseId === cid);
    const courseAfters = afterResponses.filter(a => a.courseId === cid);
    const courseFeedback = feedbackList.filter(f => f.courseId === cid);
    const courseCertificates = certificates.filter(c => c.courseId === cid && c.status === 'active');

    const startedCount = courseProgress.filter(p => (Number(p.completedLessonsCount) || 0) > 0 || p.status === 'in_progress' || p.status === 'completed').length;
    const completedCount = courseProgress.filter(p => p.status === 'completed').length;
    const completionRate = startedCount > 0 ? Number(((completedCount / startedCount) * 100).toFixed(1)) : 0;
    const totalLessonsCompleted = courseProgress.reduce((sum, p) => sum + (Number(p.completedLessonsCount) || 0), 0);

    // 3A: Course Completion Evidence
    {
      const autoKey = generateAutomaticEvidenceKey({
        evidenceType: 'course_completion',
        courseId: cid,
        reportingPeriod: 'all_time'
      });
      const evidenceId = getAutomaticEvidenceId(autoKey);
      const existing = inMemoryEvidence.get(evidenceId);

      const systemMetrics = {
        registeredLearnersCount: learners.length,
        activeLearnersCount: startedCount,
        coursesSelectedCount: courseSelections.length,
        coursesStartedCount: startedCount,
        lessonsCompletedCount: totalLessonsCompleted,
        quizAttemptsCount: courseAttempts.length,
        uniqueQuizLearnersCount: new Set(courseAttempts.map(q => q.learnerEmail?.toLowerCase()).filter(Boolean)).size,
        averageQuizScore: 0,
        quizPassRate: 0,
        coursesCompletedCount: completedCount,
        overallCompletionRate: completionRate,
        baselineSubmissionsCount: courseBaselines.length,
        finalAssessmentSubmissionsCount: courseAfters.length,
        validComparisonCount: 0,
        averageBaselineConfidence: null,
        averageFinalConfidence: null,
        averageConfidenceChange: null,
        feedbackSubmissionsCount: courseFeedback.length,
        averageUsefulnessRating: 0,
        averageConfidenceRating: 0,
        recommendationPercentage: 0,
        certificatesIssuedCount: courseCertificates.length
      };

      const record = {
        evidenceId,
        organisationId: ORGANISATION_ID,
        source: 'automatic',
        automaticKey: autoKey,
        evidenceType: 'course_completion',
        activityTitle: `${cTitle} — Course Completion Evidence`,
        description: `Verified completion and progression audit for "${cTitle}". Demonstrates learner course selection (${courseSelections.length}), active starters (${startedCount}), and full course completion (${completedCount}).`,
        reportingPeriod: 'all_time',
        reportingStartDate: null,
        reportingEndDate: null,
        courseId: cid,
        courseTitle: cTitle,
        activityDate: now.split('T')[0],
        activityDateUK: todayUK,
        location: 'Online Training Centre — One Community Ely',
        category: 'Training',
        customCategory: '',
        attendanceCount: startedCount,
        systemMetrics,
        mainResult: `${completionRate}% completion rate (${completedCount} of ${startedCount} completed)`,
        calculationVersion: '1.0',
        calculationMetadata: {
          formula: 'Completion Rate = (Completed ÷ Started) × 100.',
          dataSources: ['progress', 'courseSelections', 'certificates'],
          generatedFrom: 'verified_platform_activity',
          lastCalculationRun: now
        },
        dataSources: ['progress', 'courseSelections', 'certificates'],
        adminNotes: existing?.adminNotes || '',
        outcomeSummary: existing?.outcomeSummary || '',
        attachments: existing?.attachments || [],
        externalLinks: existing?.externalLinks || [],
        status: existing?.status || 'draft',
        consentStatus: 'Anonymous use permitted',
        generatedAt: existing?.generatedAt || now,
        lastRefreshedAt: now,
        version: existing ? (existing.version || 1) + 1 : 1
      };

      await saveAutomaticRecord(record);
      generatedSummaries.push(record);
    }

    // 3B: Quiz Assessment Performance
    if (courseQuizzes.length > 0 || courseAttempts.length > 0) {
      const autoKey = generateAutomaticEvidenceKey({
        evidenceType: 'quiz_performance',
        courseId: cid,
        reportingPeriod: 'all_time'
      });
      const evidenceId = getAutomaticEvidenceId(autoKey);
      const existing = inMemoryEvidence.get(evidenceId);

      const uniqueAttemptLearners = new Set(courseAttempts.map(a => a.learnerEmail?.toLowerCase()).filter(Boolean));
      const passedLearners = new Set(courseAttempts.filter(a => a.passed === true).map(a => a.learnerEmail?.toLowerCase()).filter(Boolean));
      const passRate = uniqueAttemptLearners.size > 0 ? Number(((passedLearners.size / uniqueAttemptLearners.size) * 100).toFixed(1)) : 0;
      const scores = courseAttempts.map(a => Number(a.percentage) || 0);
      const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;

      const systemMetrics = {
        registeredLearnersCount: learners.length,
        activeLearnersCount: uniqueAttemptLearners.size,
        coursesSelectedCount: courseSelections.length,
        coursesStartedCount: startedCount,
        lessonsCompletedCount: totalLessonsCompleted,
        quizAttemptsCount: courseAttempts.length,
        uniqueQuizLearnersCount: uniqueAttemptLearners.size,
        averageQuizScore: avgScore,
        quizPassRate: passRate,
        coursesCompletedCount: completedCount,
        overallCompletionRate: completionRate,
        baselineSubmissionsCount: courseBaselines.length,
        finalAssessmentSubmissionsCount: courseAfters.length,
        validComparisonCount: 0,
        averageBaselineConfidence: null,
        averageFinalConfidence: null,
        averageConfidenceChange: null,
        feedbackSubmissionsCount: courseFeedback.length,
        averageUsefulnessRating: 0,
        averageConfidenceRating: 0,
        recommendationPercentage: 0,
        certificatesIssuedCount: courseCertificates.length
      };

      const record = {
        evidenceId,
        organisationId: ORGANISATION_ID,
        source: 'automatic',
        automaticKey: autoKey,
        evidenceType: 'quiz_performance',
        activityTitle: `${cTitle} — Quiz Assessment Performance`,
        description: `Verified assessment mastery audit across all module quizzes in "${cTitle}". Reflects ${courseAttempts.length} total evaluation attempts with an average score of ${avgScore}% and ${passRate}% pass rate.`,
        reportingPeriod: 'all_time',
        reportingStartDate: null,
        reportingEndDate: null,
        courseId: cid,
        courseTitle: cTitle,
        activityDate: now.split('T')[0],
        activityDateUK: todayUK,
        location: 'Online Training Centre — One Community Ely',
        category: 'Training',
        customCategory: '',
        attendanceCount: uniqueAttemptLearners.size,
        systemMetrics,
        mainResult: `${passRate}% pass rate (${avgScore}% avg quiz score)`,
        calculationVersion: '1.0',
        calculationMetadata: {
          formula: 'Pass Rate = (Unique Learners Passed ÷ Unique Learners Attempted) × 100. Answers hidden.',
          dataSources: ['quizzes', 'quizAttempts'],
          generatedFrom: 'verified_platform_activity',
          lastCalculationRun: now
        },
        dataSources: ['quizzes', 'quizAttempts'],
        adminNotes: existing?.adminNotes || '',
        outcomeSummary: existing?.outcomeSummary || '',
        attachments: existing?.attachments || [],
        externalLinks: existing?.externalLinks || [],
        status: existing?.status || 'draft',
        consentStatus: 'Anonymous use permitted',
        generatedAt: existing?.generatedAt || now,
        lastRefreshedAt: now,
        version: existing ? (existing.version || 1) + 1 : 1
      };

      await saveAutomaticRecord(record);
      generatedSummaries.push(record);
    }

    // 3C: Before-vs-After Confidence Outcomes
    if (courseBaselines.length > 0 || courseAfters.length > 0) {
      const autoKey = generateAutomaticEvidenceKey({
        evidenceType: 'confidence_outcomes',
        courseId: cid,
        reportingPeriod: 'all_time'
      });
      const evidenceId = getAutomaticEvidenceId(autoKey);
      const existing = inMemoryEvidence.get(evidenceId);

      // Pair baselines and after assessments
      const baselineMap = new Map();
      courseBaselines.forEach(b => {
        if (b.learnerEmail) baselineMap.set(b.learnerEmail.toLowerCase(), b);
      });

      const pairs = [];
      courseAfters.forEach(a => {
        if (a.learnerEmail && baselineMap.has(a.learnerEmail.toLowerCase())) {
          const b = baselineMap.get(a.learnerEmail.toLowerCase());
          const baseScore = Number(b.confidenceRating || b.initialKnowledgeRating || b.rating || 0);
          const finalScore = Number(a.confidenceRating || a.rating || 0);
          if (baseScore >= 1 && finalScore >= 1) {
            pairs.push({ baseScore, finalScore, delta: finalScore - baseScore });
          }
        }
      });

      const validPairsCount = pairs.length;
      const avgBaseline = validPairsCount > 0 ? Number((pairs.reduce((sum, p) => sum + p.baseScore, 0) / validPairsCount).toFixed(2)) : null;
      const avgFinal = validPairsCount > 0 ? Number((pairs.reduce((sum, p) => sum + p.finalScore, 0) / validPairsCount).toFixed(2)) : null;
      const avgChange = (avgBaseline !== null && avgFinal !== null) ? Number((avgFinal - avgBaseline).toFixed(2)) : null;

      const systemMetrics = {
        registeredLearnersCount: learners.length,
        activeLearnersCount: startedCount,
        coursesSelectedCount: courseSelections.length,
        coursesStartedCount: startedCount,
        lessonsCompletedCount: totalLessonsCompleted,
        quizAttemptsCount: courseAttempts.length,
        uniqueQuizLearnersCount: 0,
        averageQuizScore: 0,
        quizPassRate: 0,
        coursesCompletedCount: completedCount,
        overallCompletionRate: completionRate,
        baselineSubmissionsCount: courseBaselines.length,
        finalAssessmentSubmissionsCount: courseAfters.length,
        validComparisonCount: validPairsCount,
        averageBaselineConfidence: avgBaseline,
        averageFinalConfidence: avgFinal,
        averageConfidenceChange: avgChange,
        feedbackSubmissionsCount: courseFeedback.length,
        averageUsefulnessRating: 0,
        averageConfidenceRating: 0,
        recommendationPercentage: 0,
        certificatesIssuedCount: courseCertificates.length
      };

      const changeStr = avgChange !== null ? (avgChange >= 0 ? `+${avgChange}` : `${avgChange}`) : 'N/A';

      const record = {
        evidenceId,
        organisationId: ORGANISATION_ID,
        source: 'automatic',
        automaticKey: autoKey,
        evidenceType: 'confidence_outcomes',
        activityTitle: `${cTitle} — Learner Confidence Outcomes`,
        description: `Authoritative Before-vs-After outcome evaluation for "${cTitle}". Based on ${validPairsCount} linked baseline and final assessment pairs, measuring change on a 1–5 confidence scale.`,
        reportingPeriod: 'all_time',
        reportingStartDate: null,
        reportingEndDate: null,
        courseId: cid,
        courseTitle: cTitle,
        activityDate: now.split('T')[0],
        activityDateUK: todayUK,
        location: 'Online Training Centre — One Community Ely',
        category: 'Training',
        customCategory: '',
        attendanceCount: validPairsCount,
        systemMetrics,
        mainResult: `${changeStr} confidence change (${avgBaseline ?? 'N/A'} → ${avgFinal ?? 'N/A'})`,
        calculationVersion: '1.0',
        calculationMetadata: {
          formula: 'Confidence Change = Average Final Confidence - Average Baseline Confidence. Missing baseline data not treated as zero.',
          dataSources: ['baselineAssessments', 'afterAssessments'],
          generatedFrom: 'verified_platform_activity',
          lastCalculationRun: now
        },
        dataSources: ['baselineAssessments', 'afterAssessments'],
        adminNotes: existing?.adminNotes || '',
        outcomeSummary: existing?.outcomeSummary || '',
        attachments: existing?.attachments || [],
        externalLinks: existing?.externalLinks || [],
        status: existing?.status || 'draft',
        consentStatus: 'Anonymous use permitted',
        generatedAt: existing?.generatedAt || now,
        lastRefreshedAt: now,
        version: existing ? (existing.version || 1) + 1 : 1
      };

      await saveAutomaticRecord(record);
      generatedSummaries.push(record);
    }
  }

  // ------------------------------------------------------------------------
  // SUMMARY 4: Platform-wide Beneficiary Feedback Summary
  // ------------------------------------------------------------------------
  if (feedbackList.length > 0) {
    const autoKey = generateAutomaticEvidenceKey({
      evidenceType: 'beneficiary_feedback',
      courseId: 'all',
      reportingPeriod: 'all_time'
    });
    const evidenceId = getAutomaticEvidenceId(autoKey);
    const existing = inMemoryEvidence.get(evidenceId);

    const usefulnessRatings = feedbackList.map(f => Number(f.usefulnessRating) || 0).filter(r => r >= 1 && r <= 5);
    const confidenceRatings = feedbackList.map(f => Number(f.confidenceRating) || 0).filter(r => r >= 1 && r <= 5);
    const recommendYesCount = feedbackList.filter(f => f.wouldRecommend === true || f.wouldRecommend === 'yes').length;
    const avgUsefulness = usefulnessRatings.length > 0 ? Number((usefulnessRatings.reduce((a, b) => a + b, 0) / usefulnessRatings.length).toFixed(1)) : 0;
    const avgConfidence = confidenceRatings.length > 0 ? Number((confidenceRatings.reduce((a, b) => a + b, 0) / confidenceRatings.length).toFixed(1)) : 0;
    const recommendRate = feedbackList.length > 0 ? Number(((recommendYesCount / feedbackList.length) * 100).toFixed(1)) : 0;

    const systemMetrics = {
      registeredLearnersCount: learners.length,
      activeLearnersCount: feedbackList.length,
      coursesSelectedCount: selections.length,
      coursesStartedCount: 0,
      lessonsCompletedCount: 0,
      quizAttemptsCount: 0,
      uniqueQuizLearnersCount: 0,
      averageQuizScore: 0,
      quizPassRate: 0,
      coursesCompletedCount: 0,
      overallCompletionRate: 0,
      baselineSubmissionsCount: baselines.length,
      finalAssessmentSubmissionsCount: afterResponses.length,
      validComparisonCount: 0,
      averageBaselineConfidence: null,
      averageFinalConfidence: null,
      averageConfidenceChange: null,
      feedbackSubmissionsCount: feedbackList.length,
      averageUsefulnessRating: avgUsefulness,
      averageConfidenceRating: avgConfidence,
      recommendationPercentage: recommendRate,
      certificatesIssuedCount: certificates.length
    };

    const record = {
      evidenceId,
      organisationId: ORGANISATION_ID,
      source: 'automatic',
      automaticKey: autoKey,
      evidenceType: 'beneficiary_feedback',
      activityTitle: 'Beneficiary Feedback & Quality Evaluation (All Courses)',
      description: `Authoritative post-course satisfaction metrics collected from adult learners across all One Community Ely courses. Summarises ${feedbackList.length} verified responses.`,
      reportingPeriod: 'all_time',
      reportingStartDate: null,
      reportingEndDate: null,
      courseId: null,
      courseTitle: 'All Courses',
      activityDate: now.split('T')[0],
      activityDateUK: todayUK,
      location: 'Online Training Centre — One Community Ely',
      category: 'Outreach',
      customCategory: '',
      attendanceCount: feedbackList.length,
      systemMetrics,
      mainResult: `${avgUsefulness}/5 usefulness rating • ${recommendRate}% recommend`,
      calculationVersion: '1.0',
      calculationMetadata: {
        formula: 'Usefulness & Confidence averaged across validated 1–5 scales. Private feedback comments kept confidential.',
        dataSources: ['feedback'],
        generatedFrom: 'verified_platform_activity',
        lastCalculationRun: now
      },
      dataSources: ['feedback'],
      adminNotes: existing?.adminNotes || '',
      outcomeSummary: existing?.outcomeSummary || '',
      attachments: existing?.attachments || [],
      externalLinks: existing?.externalLinks || [],
      status: existing?.status || 'draft',
      consentStatus: 'Anonymous use permitted',
      generatedAt: existing?.generatedAt || now,
      lastRefreshedAt: now,
      version: existing ? (existing.version || 1) + 1 : 1
    };

    await saveAutomaticRecord(record);
    generatedSummaries.push(record);
  }

  return generatedSummaries;
}

/**
 * Refresh a single automatic evidence record or all automatic evidence records
 */
export async function refreshAutomaticEvidenceRecord(evidenceId, user) {
  if (evidenceId && evidenceId !== 'all') {
    const existing = inMemoryEvidence.get(evidenceId) || await getEvidenceById(evidenceId);
    if (!existing) {
      throw new Error(`Automatic evidence record "${evidenceId}" not found.`);
    }
    if (existing.source !== 'automatic') {
      throw new Error(`Record "${evidenceId}" is a manual record and cannot be automatically regenerated.`);
    }
  }

  // Regenerate all summaries (idempotent, preserves notes)
  const summaries = await generateAllAutomaticEvidence({}, user);

  if (evidenceId && evidenceId !== 'all') {
    const updated = summaries.find(s => s.evidenceId === evidenceId);
    return updated || (await getEvidenceById(evidenceId));
  }

  return summaries;
}

/**
 * Admin update for Admin-editable fields ONLY (notes, outcomeSummary, status, attachments, externalLinks)
 * Strictly protects system-calculated metrics against tampering!
 */
export async function updateAutomaticEvidenceNotes(evidenceId, updateData, user) {
  const existing = inMemoryEvidence.get(evidenceId) || await getEvidenceById(evidenceId);
  if (!existing) {
    throw new Error('Evidence record not found.');
  }

  if (existing.source !== 'automatic') {
    throw new Error('This endpoint is reserved for automatic evidence records.');
  }

  const userEmail = (user?.email || 'admin@onecommunityely.com').toLowerCase().trim();
  const now = new Date().toISOString();

  // Protect system metrics
  if (updateData.systemMetrics !== undefined || updateData.attendanceCount !== undefined) {
    throw new Error('System-calculated platform metrics are read-only and cannot be manually modified.');
  }

  let adminNotes = existing.adminNotes || '';
  if (updateData.adminNotes !== undefined) {
    adminNotes = (updateData.adminNotes || '').trim().substring(0, 4000);
  }

  let outcomeSummary = existing.outcomeSummary || '';
  if (updateData.outcomeSummary !== undefined) {
    outcomeSummary = (updateData.outcomeSummary || '').trim().substring(0, 4000);
  }

  let status = existing.status || 'draft';
  if (updateData.status !== undefined) {
    const cleanStatus = (updateData.status || '').toLowerCase().trim();
    if (['draft', 'published', 'archived'].includes(cleanStatus)) {
      status = cleanStatus;
    }
  }

  let externalLinks = existing.externalLinks || [];
  if (Array.isArray(updateData.externalLinks)) {
    externalLinks = updateData.externalLinks.filter(l => typeof l === 'string' && l.trim().startsWith('https://'));
  }

  let attachments = existing.attachments || [];
  if (Array.isArray(updateData.attachments)) {
    attachments = updateData.attachments;
  }

  const updatedRecord = {
    ...existing,
    adminNotes,
    outcomeSummary,
    status,
    externalLinks,
    attachments,
    updatedBy: userEmail,
    updatedAt: now,
    version: (existing.version || 1) + 1
  };

  return await saveAutomaticRecord(updatedRecord);
}

/**
 * Generate formatted CSV export for a single automatic evidence record
 */
export async function getAutomaticEvidenceExport(evidenceId) {
  const existing = inMemoryEvidence.get(evidenceId) || await getEvidenceById(evidenceId);
  if (!existing) {
    throw new Error('Evidence record not found.');
  }

  const m = existing.systemMetrics || {};

  const headers = [
    { label: 'Metric / Field', key: 'label' },
    { label: 'Value', key: 'value' }
  ];

  const rows = [
    { label: 'Evidence ID', value: existing.evidenceId },
    { label: 'Source', value: 'Automatically generated from verified platform activity' },
    { label: 'Title', value: existing.activityTitle },
    { label: 'Evidence Type', value: existing.evidenceType },
    { label: 'Course Title', value: existing.courseTitle || 'All Courses' },
    { label: 'Reporting Period', value: existing.reportingPeriod },
    { label: 'Reporting Start Date', value: existing.reportingStartDate || 'All time' },
    { label: 'Reporting End Date', value: existing.reportingEndDate || 'Present' },
    { label: 'Status', value: existing.status },
    { label: 'Main Result', value: existing.mainResult },
    { label: 'Registered Learners Count', value: m.registeredLearnersCount ?? 'N/A' },
    { label: 'Active Learners Count', value: m.activeLearnersCount ?? 'N/A' },
    { label: 'Courses Selected Count', value: m.coursesSelectedCount ?? 'N/A' },
    { label: 'Courses Started Count', value: m.coursesStartedCount ?? 'N/A' },
    { label: 'Courses Completed Count', value: m.coursesCompletedCount ?? 'N/A' },
    { label: 'Overall Completion Rate', value: m.overallCompletionRate !== undefined ? `${m.overallCompletionRate}%` : 'N/A' },
    { label: 'Lessons Completed Count', value: m.lessonsCompletedCount ?? 'N/A' },
    { label: 'Quiz Attempts Count', value: m.quizAttemptsCount ?? 'N/A' },
    { label: 'Average Quiz Score', value: m.averageQuizScore !== undefined ? `${m.averageQuizScore}%` : 'N/A' },
    { label: 'Quiz Pass Rate', value: m.quizPassRate !== undefined ? `${m.quizPassRate}%` : 'N/A' },
    { label: 'Baseline Submissions Count', value: m.baselineSubmissionsCount ?? 'N/A' },
    { label: 'Final Assessment Submissions Count', value: m.finalAssessmentSubmissionsCount ?? 'N/A' },
    { label: 'Valid Comparison Count', value: m.validComparisonCount ?? 'N/A' },
    { label: 'Average Baseline Confidence', value: m.averageBaselineConfidence ?? 'N/A' },
    { label: 'Average Final Confidence', value: m.averageFinalConfidence ?? 'N/A' },
    { label: 'Average Confidence Change', value: m.averageConfidenceChange !== undefined && m.averageConfidenceChange !== null ? (m.averageConfidenceChange >= 0 ? `+${m.averageConfidenceChange}` : `${m.averageConfidenceChange}`) : 'N/A' },
    { label: 'Feedback Submissions Count', value: m.feedbackSubmissionsCount ?? 'N/A' },
    { label: 'Average Usefulness Rating (1-5)', value: m.averageUsefulnessRating ?? 'N/A' },
    { label: 'Average Confidence Rating (1-5)', value: m.averageConfidenceRating ?? 'N/A' },
    { label: 'Recommendation Rate', value: m.recommendationPercentage !== undefined ? `${m.recommendationPercentage}%` : 'N/A' },
    { label: 'Certificates Issued Count', value: m.certificatesIssuedCount ?? 'N/A' },
    { label: 'Admin Notes', value: existing.adminNotes || 'None' },
    { label: 'Admin Outcome Summary', value: existing.outcomeSummary || 'None' },
    { label: 'Generated At', value: existing.generatedAt },
    { label: 'Last Refreshed At', value: existing.lastRefreshedAt }
  ];

  return formatCsv(headers, rows);
}
