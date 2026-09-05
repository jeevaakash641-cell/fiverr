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

/**
 * =========================================================================
 * ENHANCED PLATFORM ACTIVITY & LEARNER PROGRESS DETAILED AGGREGATOR
 * =========================================================================
 */

export async function getPlatformActivityDetails(filters = {}) {
  const { search, courseId, category, startDate, endDate, sort = 'newest' } = filters;

  // 1. Fetch data from verified authoritative subsystems
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

  // Exclude administrators strictly
  const learners = (rawUsers || []).filter(isLearnerUser);
  const learnerMap = new Map();
  learners.forEach(l => {
    const email = (l.email || '').toLowerCase().trim();
    if (email) {
      learnerMap.set(email, {
        id: l.id || `learner_${email}`,
        name: l.name || 'Anonymous Learner',
        email,
        registeredAt: l.registeredAt || l.createdAt || null,
        lastActiveAt: l.lastActiveAt || null,
        location: l.generalLocation || l.location || null
      });
    }
  });

  const courses = rawCourses || [];
  const courseMap = new Map();
  courses.forEach(c => {
    courseMap.set(c.courseId, {
      courseId: c.courseId,
      title: c.title || 'Untitled Course',
      category: c.category || 'General',
      level: c.level || 'All Levels',
      duration: c.duration || null,
      modulesCount: Array.isArray(c.modules) ? c.modules.length : (c.modulesCount || 0),
      lessonsCount: typeof c.lessonsCount === 'number' ? c.lessonsCount : 0
    });
  });

  const quizMap = new Map();
  (rawQuizzes || []).forEach(q => {
    quizMap.set(q.quizId, {
      quizId: q.quizId,
      title: q.title || 'Quiz',
      courseId: q.courseId,
      passingScore: typeof q.passingScore === 'number' ? q.passingScore : (q.passingPercentage || 80),
      moduleId: q.moduleId,
      lessonId: q.lessonId
    });
  });

  // Filter helper functions
  const searchFilter = (itemStr) => {
    if (!search || !search.trim()) return true;
    const q = search.toLowerCase().trim();
    return String(itemStr || '').toLowerCase().includes(q);
  };

  const courseFilter = (cId) => {
    if (!courseId || courseId === 'all') return true;
    return String(cId) === String(courseId);
  };

  const categoryFilter = (cat) => {
    if (!category || category === 'all') return true;
    return String(cat).toLowerCase() === String(category).toLowerCase();
  };

  // -------------------------------------------------------------------------
  // 1. COURSE SELECTIONS DATASET
  // -------------------------------------------------------------------------
  const selectionsList = [];
  const uniqueLearnersWithSelections = new Set();
  const learnerCourseSelectionMap = new Map();

  (rawSelections || []).forEach(s => {
    const email = (s.learnerId || s.learnerEmail || '').toLowerCase().trim();
    if (!learnerMap.has(email)) return; // Exclude non-learners / admins
    const cId = s.courseId;
    const cInfo = courseMap.get(cId) || { title: s.courseTitle || 'Course', category: 'Other' };

    if (!courseFilter(cId) || !categoryFilter(cInfo.category)) return;

    const selDate = s.selectedAt || s.createdAt || null;
    if (!isDateInRange(selDate, startDate, endDate)) return;

    const lInfo = learnerMap.get(email);
    if (!searchFilter(`${lInfo.name} ${lInfo.email} ${cInfo.title}`)) return;

    uniqueLearnersWithSelections.add(email);
    learnerCourseSelectionMap.set(`${email}#${cId}`, s);

    selectionsList.push({
      id: s.selectionId || `sel_${email}_${cId}`,
      learnerId: lInfo.id,
      learnerName: lInfo.name,
      learnerEmail: lInfo.email,
      courseId: cId,
      courseTitle: cInfo.title,
      courseCategory: cInfo.category,
      selectionDate: selDate,
      selectionDateUK: formatUKDate(selDate),
      status: s.status === 'withdrawn' ? 'Withdrawn' : (s.status === 'completed' ? 'Completed' : (s.status === 'in_progress' ? 'In Progress' : 'Selected')),
      lastActivity: s.lastActivityAt || selDate,
      lastActivityUK: formatUKDate(s.lastActivityAt || selDate)
    });
  });

  // -------------------------------------------------------------------------
  // 2. COURSE PROGRESS DATASET
  // -------------------------------------------------------------------------
  const progressList = [];
  const uniqueLearnersStarted = new Set();
  const uniqueLearnersCompleted = new Set();
  const completionsList = [];

  (rawProgress || []).forEach(p => {
    const email = (p.learnerEmail || '').toLowerCase().trim();
    if (!learnerMap.has(email)) return;
    const cId = p.courseId;
    const cInfo = courseMap.get(cId) || { title: p.courseTitle || 'Course', category: 'Other', lessonsCount: p.totalLessonsCount || 0 };

    if (!courseFilter(cId) || !categoryFilter(cInfo.category)) return;

    const startedDate = p.startedAt || p.firstAccessedAt || p.createdAt || null;
    const lastActivity = p.lastAccessedAt || p.updatedAt || startedDate;
    const completedDate = p.completedAt || (p.status === 'completed' ? lastActivity : null);

    // Apply date range filter on lastActivity or completion date
    if (startDate || endDate) {
      const targetDate = completedDate || lastActivity || startedDate;
      if (!isDateInRange(targetDate, startDate, endDate)) return;
    }

    const lInfo = learnerMap.get(email);
    if (!searchFilter(`${lInfo.name} ${lInfo.email} ${cInfo.title}`)) return;

    const totalLessons = Math.max(Number(p.totalLessonsCount) || 0, Number(cInfo.lessonsCount) || 0, 1);
    const completedLessons = Math.min(Number(p.completedLessonsCount) || 0, totalLessons);
    let progressPercent = typeof p.progressPercent === 'number'
      ? p.progressPercent
      : Math.round((completedLessons / totalLessons) * 100);
    if (p.status === 'completed' || completedLessons >= totalLessons) {
      progressPercent = 100;
    }

    const isStarted = completedLessons > 0 || p.status === 'in_progress' || p.status === 'completed' || Boolean(p.startedAt);
    const isCompleted = progressPercent >= 100 || p.status === 'completed';

    if (isStarted) uniqueLearnersStarted.add(email);
    if (isCompleted) uniqueLearnersCompleted.add(email);

    const continueStatus = isCompleted ? 'Completed' : (isStarted ? 'In Progress' : 'Not Started');

    progressList.push({
      id: p.progressId || `prog_${email}_${cId}`,
      progressId: p.progressId || `prog_${email}_${cId}`,
      learnerId: lInfo.id,
      learnerName: lInfo.name,
      learnerEmail: lInfo.email,
      courseId: cId,
      courseTitle: cInfo.title,
      courseCategory: cInfo.category,
      completedLessons,
      totalLessons,
      progressPercent,
      currentModule: p.currentModuleTitle || p.currentModuleId || 'Module 1',
      currentLesson: p.currentLessonTitle || p.currentLessonId || 'Introduction',
      lastVisitedLesson: p.lastVisitedLessonTitle || p.currentLessonTitle || 'Overview',
      requiredQuizStatus: p.quizStatus || (p.quizzesPassed ? 'Passed' : (isCompleted ? 'Passed' : 'Pending')),
      startedDate: startedDate,
      startedDateUK: formatUKDate(startedDate),
      lastActivity: lastActivity,
      lastActivityUK: formatUKDate(lastActivity),
      continueStatus
    });

    // If completed, add to Course Completions dataset
    if (isCompleted) {
      let timeTaken = 'N/A';
      if (startedDate && completedDate) {
        const ms = new Date(completedDate) - new Date(startedDate);
        if (ms >= 0) {
          const days = Math.round(ms / (1000 * 60 * 60 * 24));
          timeTaken = days === 0 ? 'Same day' : `${days} day${days > 1 ? 's' : ''}`;
        }
      }

      completionsList.push({
        id: `comp_${email}_${cId}`,
        completionId: `comp_${email}_${cId}`,
        learnerId: lInfo.id,
        learnerName: lInfo.name,
        learnerEmail: lInfo.email,
        courseId: cId,
        courseTitle: cInfo.title,
        courseCategory: cInfo.category,
        completionDate: completedDate,
        completionDateUK: formatUKDate(completedDate),
        timeTaken,
        requiredQuizStatus: 'Passed',
        baselineStatus: 'Completed',
        finalAssessmentStatus: 'Completed',
        feedbackStatus: 'Submitted',
        certificateEligibility: 'Eligible',
        certificateStatus: 'Pending',
        certificateNumber: null,
        certificateId: null
      });
    }
  });

  // -------------------------------------------------------------------------
  // 3. QUIZ RESULTS DATASET
  // -------------------------------------------------------------------------
  const quizResultsList = [];
  const uniqueLearnersAttemptedQuiz = new Set();
  const uniqueLearnersPassedQuiz = new Set();

  // Group quiz attempts by learner + quiz
  const learnerQuizAttemptsMap = new Map();
  (rawQuizAttempts || []).forEach(a => {
    const email = (a.learnerEmail || '').toLowerCase().trim();
    if (!learnerMap.has(email)) return;

    const qId = a.quizId;
    const qInfo = quizMap.get(qId) || { title: a.quizTitle || 'Quiz', courseId: a.courseId || 'unknown', passingScore: 80 };
    const cInfo = courseMap.get(qInfo.courseId) || { title: a.courseTitle || 'Course', category: 'Other' };

    if (!courseFilter(qInfo.courseId) || !categoryFilter(cInfo.category)) return;

    const subDate = a.submittedAt || a.createdAt || null;
    if (!isDateInRange(subDate, startDate, endDate)) return;

    const lInfo = learnerMap.get(email);
    if (!searchFilter(`${lInfo.name} ${lInfo.email} ${qInfo.title} ${cInfo.title}`)) return;

    uniqueLearnersAttemptedQuiz.add(email);
    if (a.passed || (typeof a.percentage === 'number' && a.percentage >= qInfo.passingScore)) {
      uniqueLearnersPassedQuiz.add(email);
    }

    const key = `${email}#${qId}`;
    if (!learnerQuizAttemptsMap.has(key)) {
      learnerQuizAttemptsMap.set(key, {
        id: `qa_${email}_${qId}`,
        learnerId: lInfo.id,
        learnerName: lInfo.name,
        learnerEmail: lInfo.email,
        quizId: qId,
        quizTitle: qInfo.title,
        courseId: qInfo.courseId,
        courseTitle: cInfo.title,
        moduleLesson: a.lessonTitle || a.moduleTitle || 'Core Curriculum',
        attemptCount: 0,
        latestScore: 0,
        bestScore: 0,
        passingScore: qInfo.passingScore,
        isAttempted: true,
        isPassed: false,
        attemptsExhausted: false,
        lastAttemptDate: subDate,
        attempts: []
      });
    }

    const item = learnerQuizAttemptsMap.get(key);
    item.attemptCount += 1;
    const scoreVal = typeof a.percentage === 'number' ? Math.round(a.percentage) : (typeof a.score === 'number' ? a.score : 0);
    item.latestScore = scoreVal;
    item.bestScore = Math.max(item.bestScore, scoreVal);
    if (a.passed || scoreVal >= qInfo.passingScore) {
      item.isPassed = true;
    }
    if (subDate && (!item.lastAttemptDate || new Date(subDate) > new Date(item.lastAttemptDate))) {
      item.lastAttemptDate = subDate;
    }
  });

  learnerQuizAttemptsMap.forEach(item => {
    item.lastAttemptDateUK = formatUKDate(item.lastAttemptDate);
    quizResultsList.push(item);
  });

  // -------------------------------------------------------------------------
  // 4. ASSESSMENTS DATASET (Paired Baseline & After Assessments)
  // -------------------------------------------------------------------------
  const assessmentsList = [];
  const baselineMap = new Map();
  (rawBaselines || []).forEach(b => {
    const email = (b.learnerEmail || '').toLowerCase().trim();
    if (email && b.courseId) {
      baselineMap.set(`${email}#${b.courseId}`, b);
    }
  });

  const afterMap = new Map();
  (rawAfterResponses || []).forEach(a => {
    const email = (a.learnerEmail || '').toLowerCase().trim();
    if (email && a.courseId) {
      afterMap.set(`${email}#${a.courseId}`, a);
    }
  });

  // Unique (learner, course) assessment pairings
  const assessmentKeys = new Set([...baselineMap.keys(), ...afterMap.keys()]);
  assessmentKeys.forEach(pairKey => {
    const [email, cId] = pairKey.split('#');
    if (!learnerMap.has(email)) return;
    const cInfo = courseMap.get(cId) || { title: 'Course', category: 'Other' };

    if (!courseFilter(cId) || !categoryFilter(cInfo.category)) return;

    const bRes = baselineMap.get(pairKey);
    const aRes = afterMap.get(pairKey);

    const bDate = bRes?.submittedAt || null;
    const aDate = aRes?.submittedAt || null;

    if (startDate || endDate) {
      const relevantDate = aDate || bDate;
      if (!isDateInRange(relevantDate, startDate, endDate)) return;
    }

    const lInfo = learnerMap.get(email);
    if (!searchFilter(`${lInfo.name} ${lInfo.email} ${cInfo.title}`)) return;

    const bConf = typeof bRes?.confidenceRating === 'number' ? bRes.confidenceRating : (typeof bRes?.averageConfidence === 'number' ? bRes.averageConfidence : null);
    const aConf = typeof aRes?.confidenceRating === 'number' ? aRes.confidenceRating : (typeof aRes?.averageConfidence === 'number' ? aRes.averageConfidence : null);

    let confidenceChange = 'Comparison Unavailable';
    let comparisonStatus = 'Comparison Unavailable';

    if (bConf !== null && aConf !== null) {
      const delta = Number((aConf - bConf).toFixed(1));
      confidenceChange = delta >= 0 ? `+${delta}` : `${delta}`;
      if (delta >= 1.5) comparisonStatus = 'Significant Gain';
      else if (delta > 0) comparisonStatus = 'Moderate Gain';
      else if (delta === 0) comparisonStatus = 'Neutral';
      else comparisonStatus = 'No Gain';
    }

    assessmentsList.push({
      id: `ass_${email}_${cId}`,
      learnerId: lInfo.id,
      learnerName: lInfo.name,
      learnerEmail: lInfo.email,
      courseId: cId,
      courseTitle: cInfo.title,
      courseCategory: cInfo.category,
      baselineStatus: bRes ? 'Completed' : 'Not Started',
      baselineDate: bDate,
      baselineDateUK: formatUKDate(bDate),
      baselineConfidence: bConf !== null ? `${bConf} / 5` : 'Not recorded',
      afterStatus: aRes ? 'Completed' : 'Not Started',
      finalDate: aDate,
      finalDateUK: formatUKDate(aDate),
      finalConfidence: aConf !== null ? `${aConf} / 5` : 'Not recorded',
      confidenceChange,
      comparisonStatus
    });
  });

  // -------------------------------------------------------------------------
  // 5. BENEFICIARY FEEDBACK DATASET
  // -------------------------------------------------------------------------
  const feedbackList = [];
  (rawFeedback || []).forEach(f => {
    const email = (f.learnerEmail || '').toLowerCase().trim();
    if (!learnerMap.has(email)) return;
    const cId = f.courseId;
    const cInfo = courseMap.get(cId) || { title: f.courseTitle || 'Course', category: 'Other' };

    if (!courseFilter(cId) || !categoryFilter(cInfo.category)) return;

    const subDate = f.submittedAt || f.createdAt || null;
    if (!isDateInRange(subDate, startDate, endDate)) return;

    const lInfo = learnerMap.get(email);
    if (!searchFilter(`${lInfo.name} ${lInfo.email} ${cInfo.title} ${f.testimonial || ''}`)) return;

    feedbackList.push({
      id: f.feedbackId || `fb_${email}_${cId}`,
      feedbackId: f.feedbackId || `fb_${email}_${cId}`,
      learnerId: lInfo.id,
      learnerName: f.consentStatus === 'Named use permitted' ? lInfo.name : 'Anonymous Learner',
      learnerEmail: lInfo.email,
      courseId: cId,
      courseTitle: cInfo.title,
      courseCategory: cInfo.category,
      submissionStatus: 'Submitted',
      submissionDate: subDate,
      submissionDateUK: formatUKDate(subDate),
      usefulnessRating: f.usefulnessRating ?? f.rating ?? 'N/A',
      confidenceRating: f.confidenceRating ?? 'N/A',
      wouldRecommend: (f.wouldRecommend === true || f.wouldRecommend === 'yes' || (f.recommendRating && f.recommendRating >= 4)) ? 'Yes' : 'No',
      testimonialConsent: f.consentStatus || 'Anonymous use permitted',
      consentWithdrawn: Boolean(f.consentWithdrawn),
      testimonial: f.testimonial || f.comments || ''
    });
  });

  // -------------------------------------------------------------------------
  // 6. CERTIFICATES DATASET
  // -------------------------------------------------------------------------
  const certificatesList = [];
  const certMapByCourseLearner = new Map();

  (rawCertificates || []).forEach(c => {
    const email = (c.learnerEmail || '').toLowerCase().trim();
    if (!learnerMap.has(email)) return;
    const cId = c.courseId;
    const cInfo = courseMap.get(cId) || { title: c.courseTitleSnapshot || 'Course', category: 'Other' };

    if (!courseFilter(cId) || !categoryFilter(cInfo.category)) return;

    const issueDate = c.issuedAt || c.createdAt || null;
    if (!isDateInRange(issueDate, startDate, endDate)) return;

    const lInfo = learnerMap.get(email);
    if (!searchFilter(`${lInfo.name} ${lInfo.email} ${c.certificateNumber} ${cInfo.title}`)) return;

    const certItem = {
      id: c.certificateId,
      certificateId: c.certificateId,
      certificateNumber: c.certificateNumber || 'N/A',
      learnerId: lInfo.id,
      learnerName: c.learnerNameSnapshot || lInfo.name,
      learnerEmail: lInfo.email,
      courseId: cId,
      courseTitle: c.courseTitleSnapshot || cInfo.title,
      courseCategory: cInfo.category,
      completionDate: c.courseCompletionDate,
      completionDateUK: formatUKDate(c.courseCompletionDate),
      issueDate: issueDate,
      issueDateUK: formatUKDate(issueDate),
      status: c.status === 'revoked' ? 'Revoked' : 'Valid',
      revokedAt: c.revokedAt || null,
      revokedAtUK: formatUKDate(c.revokedAt),
      revocationReason: c.revocationReason || null,
      pdfUrl: c.pdfUrl || null
    };

    certificatesList.push(certItem);
    certMapByCourseLearner.set(`${email}#${cId}`, certItem);
  });

  // Synchronize certificate statuses into completionsList
  completionsList.forEach(comp => {
    const key = `${comp.learnerEmail}#${comp.courseId}`;
    const cert = certMapByCourseLearner.get(key);
    if (cert) {
      comp.certificateStatus = cert.status === 'Revoked' ? 'Revoked' : 'Issued';
      comp.certificateNumber = cert.certificateNumber;
      comp.certificateId = cert.certificateId;
    }
  });

  // Sorting
  const sortComparator = (a, b) => {
    const dateA = new Date(a.lastActivity || a.selectionDate || a.completionDate || a.lastAttemptDate || a.finalDate || a.submissionDate || a.issueDate || 0);
    const dateB = new Date(b.lastActivity || b.selectionDate || b.completionDate || b.lastAttemptDate || b.finalDate || b.submissionDate || b.issueDate || 0);
    return sort === 'oldest' ? dateA - dateB : dateB - dateA;
  };

  selectionsList.sort(sortComparator);
  progressList.sort(sortComparator);
  completionsList.sort(sortComparator);
  quizResultsList.sort(sortComparator);
  assessmentsList.sort(sortComparator);
  feedbackList.sort(sortComparator);
  certificatesList.sort(sortComparator);

  // -------------------------------------------------------------------------
  // 7. COURSE PERFORMANCE BREAKDOWN (Tab 1 Summary Matrix)
  // -------------------------------------------------------------------------
  const coursePerformance = [];
  courses.forEach(c => {
    if (!courseFilter(c.courseId) || !categoryFilter(c.category)) return;

    const cSelections = selectionsList.filter(s => s.courseId === c.courseId);
    const cProgress = progressList.filter(p => p.courseId === c.courseId);
    const cCompletions = completionsList.filter(cp => cp.courseId === c.courseId);
    const cQuizzes = quizResultsList.filter(q => q.courseId === c.courseId);
    const cBaselines = assessmentsList.filter(a => a.courseId === c.courseId && a.baselineStatus === 'Completed');
    const cAfters = assessmentsList.filter(a => a.courseId === c.courseId && a.afterStatus === 'Completed');
    const cFeedbacks = feedbackList.filter(f => f.courseId === c.courseId);
    const cCerts = certificatesList.filter(cert => cert.courseId === c.courseId && cert.status === 'Valid');

    const selectedCount = cSelections.length;
    const startedCount = cProgress.filter(p => p.completedLessons > 0 || p.continueStatus === 'In Progress' || p.continueStatus === 'Completed').length;
    const completedCount = cCompletions.length;
    const inProgressCount = cProgress.filter(p => p.continueStatus === 'In Progress').length;
    const notStartedCount = Math.max(0, selectedCount - startedCount);
    const withdrawnCount = cSelections.filter(s => s.status === 'Withdrawn').length;

    const completionRate = startedCount > 0
      ? Number(((completedCount / startedCount) * 100).toFixed(1)) + '%'
      : 'Not available';

    const avgProgress = cProgress.length > 0
      ? Number((cProgress.reduce((sum, p) => sum + (p.progressPercent || 0), 0) / cProgress.length).toFixed(1)) + '%'
      : '0%';

    coursePerformance.push({
      courseId: c.courseId,
      courseTitle: c.title,
      category: c.category,
      selectedCount,
      notStartedCount,
      startedCount,
      inProgressCount,
      withdrawnCount,
      completedCount,
      completionRate,
      averageProgress: avgProgress,
      quizzesAttempted: cQuizzes.reduce((sum, q) => sum + q.attemptCount, 0),
      quizzesPassed: cQuizzes.filter(q => q.isPassed).length,
      baselineSubmissions: cBaselines.length,
      finalAssessmentSubmissions: cAfters.length,
      feedbackSubmissions: cFeedbacks.length,
      certificatesIssued: cCerts.length
    });
  });

  // -------------------------------------------------------------------------
  // 8. OVERVIEW SUMMARY METRICS (Real & Authoritative)
  // -------------------------------------------------------------------------
  const totalLearnersCount = learners.length;
  const activeLearnersCount = new Set([
    ...uniqueLearnersWithSelections,
    ...uniqueLearnersStarted,
    ...uniqueLearnersAttemptedQuiz,
    ...assessmentsList.map(a => a.learnerEmail),
    ...feedbackList.map(f => f.learnerEmail)
  ]).size;

  const validCertificatesCount = certificatesList.filter(c => c.status === 'Valid').length;
  const revokedCertificatesCount = certificatesList.filter(c => c.status === 'Revoked').length;

  const overview = {
    totalLearners: totalLearnersCount,
    activeLearners: activeLearnersCount,
    learnersWithSelections: uniqueLearnersWithSelections.size,
    totalSelections: selectionsList.length,
    learnersStarted: uniqueLearnersStarted.size,
    coursesInProgress: progressList.filter(p => p.continueStatus === 'In Progress').length,
    learnersCompleted: uniqueLearnersCompleted.size,
    totalCompletions: completionsList.length,
    learnersAttemptedQuiz: uniqueLearnersAttemptedQuiz.size,
    learnersPassedQuiz: uniqueLearnersPassedQuiz.size,
    baselineCompleted: assessmentsList.filter(a => a.baselineStatus === 'Completed').length,
    afterCompleted: assessmentsList.filter(a => a.afterStatus === 'Completed').length,
    feedbackSubmissions: feedbackList.length,
    certificatesIssued: certificatesList.length,
    validCertificates: validCertificatesCount,
    revokedCertificates: revokedCertificatesCount,
    lastRefreshedAt: new Date().toISOString()
  };

  return {
    overview,
    coursePerformance,
    selectionsList,
    progressList,
    completionsList,
    quizResultsList,
    assessmentsList,
    feedbackList,
    certificatesList,
    courses: courses.map(c => ({ courseId: c.courseId, title: c.title, category: c.category }))
  };
}

/**
 * Generate CSV for a specific Platform Activity tab with formula-injection protection
 */
export async function exportPlatformActivityCsv(tabType, filters = {}) {
  const details = await getPlatformActivityDetails(filters);
  let headers = [];
  let rows = [];

  switch (tabType) {
    case 'selections':
      headers = [
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Learner Email', key: 'learnerEmail' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Category', key: 'courseCategory' },
        { label: 'Selection Date', key: 'selectionDateUK' },
        { label: 'Status', key: 'status' },
        { label: 'Last Activity', key: 'lastActivityUK' }
      ];
      rows = details.selectionsList;
      break;

    case 'progress':
      headers = [
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Learner Email', key: 'learnerEmail' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Completed Lessons', key: 'completedLessons' },
        { label: 'Total Lessons', key: 'totalLessons' },
        { label: 'Progress (%)', key: 'progressPercent' },
        { label: 'Current Module', key: 'currentModule' },
        { label: 'Current Lesson', key: 'currentLesson' },
        { label: 'Quiz Status', key: 'requiredQuizStatus' },
        { label: 'Started Date', key: 'startedDateUK' },
        { label: 'Last Activity', key: 'lastActivityUK' },
        { label: 'Status', key: 'continueStatus' }
      ];
      rows = details.progressList;
      break;

    case 'completions':
      headers = [
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Learner Email', key: 'learnerEmail' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Completion Date', key: 'completionDateUK' },
        { label: 'Time Taken', key: 'timeTaken' },
        { label: 'Quiz Status', key: 'requiredQuizStatus' },
        { label: 'Baseline Status', key: 'baselineStatus' },
        { label: 'Final Assessment', key: 'finalAssessmentStatus' },
        { label: 'Feedback Status', key: 'feedbackStatus' },
        { label: 'Certificate Status', key: 'certificateStatus' },
        { label: 'Certificate Number', key: 'certificateNumber' }
      ];
      rows = details.completionsList;
      break;

    case 'quizzes':
      headers = [
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Learner Email', key: 'learnerEmail' },
        { label: 'Quiz Title', key: 'quizTitle' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Module / Lesson', key: 'moduleLesson' },
        { label: 'Attempts', key: 'attemptCount' },
        { label: 'Latest Score (%)', key: 'latestScore' },
        { label: 'Best Score (%)', key: 'bestScore' },
        { label: 'Passing Score (%)', key: 'passingScore' },
        { label: 'Passed', key: 'isPassed' },
        { label: 'Last Attempt Date', key: 'lastAttemptDateUK' }
      ];
      rows = details.quizResultsList.map(q => ({
        ...q,
        isPassed: q.isPassed ? 'Yes' : 'No'
      }));
      break;

    case 'assessments':
      headers = [
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Learner Email', key: 'learnerEmail' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Baseline Status', key: 'baselineStatus' },
        { label: 'Baseline Date', key: 'baselineDateUK' },
        { label: 'Baseline Confidence', key: 'baselineConfidence' },
        { label: 'Final Assessment Status', key: 'afterStatus' },
        { label: 'Final Assessment Date', key: 'finalDateUK' },
        { label: 'Final Confidence', key: 'finalConfidence' },
        { label: 'Confidence Change', key: 'confidenceChange' },
        { label: 'Comparison Status', key: 'comparisonStatus' }
      ];
      rows = details.assessmentsList;
      break;

    case 'feedback':
      headers = [
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Submission Date', key: 'submissionDateUK' },
        { label: 'Usefulness (1-5)', key: 'usefulnessRating' },
        { label: 'Confidence (1-5)', key: 'confidenceRating' },
        { label: 'Would Recommend', key: 'wouldRecommend' },
        { label: 'Consent Status', key: 'testimonialConsent' },
        { label: 'Testimonial', key: 'testimonial' }
      ];
      rows = details.feedbackList.map(f => ({
        ...f,
        testimonial: f.testimonialConsent === 'No public-use permission' || f.consentWithdrawn ? '[Withheld - Internal Only]' : f.testimonial
      }));
      break;

    case 'certificates':
      headers = [
        { label: 'Certificate Number', key: 'certificateNumber' },
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Learner Email', key: 'learnerEmail' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Completion Date', key: 'completionDateUK' },
        { label: 'Issue Date', key: 'issueDateUK' },
        { label: 'Status', key: 'status' },
        { label: 'Revocation Reason', key: 'revocationReason' }
      ];
      rows = details.certificatesList;
      break;

    default: // overview course performance
      headers = [
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Category', key: 'category' },
        { label: 'Selected Count', key: 'selectedCount' },
        { label: 'Not Started', key: 'notStartedCount' },
        { label: 'Started', key: 'startedCount' },
        { label: 'In Progress', key: 'inProgressCount' },
        { label: 'Withdrawn', key: 'withdrawnCount' },
        { label: 'Completed', key: 'completedCount' },
        { label: 'Completion Rate', key: 'completionRate' },
        { label: 'Average Progress', key: 'averageProgress' },
        { label: 'Quizzes Attempted', key: 'quizzesAttempted' },
        { label: 'Quizzes Passed', key: 'quizzesPassed' },
        { label: 'Baseline Submissions', key: 'baselineSubmissions' },
        { label: 'Final Submissions', key: 'finalAssessmentSubmissions' },
        { label: 'Feedback Submissions', key: 'feedbackSubmissions' },
        { label: 'Certificates Issued', key: 'certificatesIssued' }
      ];
      rows = details.coursePerformance;
  }

  // Format CSV safely with formula injection protection
  return formatCsv(headers, rows);
}

export default {
  generateAutomaticEvidenceKey,
  getAutomaticEvidenceId,
  generateAllAutomaticEvidence,
  refreshAutomaticEvidenceRecord,
  updateAutomaticEvidenceNotes,
  getAutomaticEvidenceExport,
  getPlatformActivityDetails,
  exportPlatformActivityCsv
};
