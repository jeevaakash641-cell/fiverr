/**
 * Impact Reporting Service — One Community Ely Online Training Centre
 * Aggregates verified backend data across all platform subsystems into authoritative impact reports.
 * Strict privacy, zero mock data, formula injection protection, and UK date formatting.
 */

import { getAllUsersAdmin } from './userService.js';
import { getAllCoursesAdmin } from './courseService.js';
import { getAllCourseSelectionsAdmin } from './courseSelectionService.js';
import { getAllProgressRecordsAdmin } from './progressService.js';
import { getAllQuizzesAdmin, getAllQuizAttemptsAdmin } from './quizService.js';
import { getAllBaselineResponsesAdmin } from './baselineAssessmentService.js';
import { getAllAfterAssessmentResponsesAdmin } from './afterAssessmentService.js';
import { getAllFeedbackSubmissions } from './beneficiaryFeedbackService.js';
import { getAllCertificatesAdmin } from './certificateService.js';
import { listEvidenceRecords } from './evidenceService.js';

/**
 * Format a Date to UK date format (DD/MM/YYYY)
 */
export function formatUKDate(dateInput) {
  if (!dateInput) return 'Not available';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Not available';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse and validate incoming filter query parameters
 */
export function parseFilters(query = {}) {
  const filters = {
    startDate: null,
    endDate: null,
    courseId: query.courseId && query.courseId !== 'all' ? query.courseId.trim() : null,
    category: query.category && query.category !== 'all' ? query.category.trim() : null,
    status: query.status && query.status !== 'all' ? query.status.trim() : null,
    rangePreset: query.rangePreset || null
  };

  // Quick Range Presets
  const now = new Date();
  if (filters.rangePreset) {
    if (filters.rangePreset === '7d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      filters.startDate = start.toISOString().split('T')[0];
      filters.endDate = now.toISOString().split('T')[0];
    } else if (filters.rangePreset === '30d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      filters.startDate = start.toISOString().split('T')[0];
      filters.endDate = now.toISOString().split('T')[0];
    } else if (filters.rangePreset === '3m') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      filters.startDate = start.toISOString().split('T')[0];
      filters.endDate = now.toISOString().split('T')[0];
    } else if (filters.rangePreset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      filters.startDate = start.toISOString().split('T')[0];
      filters.endDate = now.toISOString().split('T')[0];
    } else if (filters.rangePreset === 'all') {
      filters.startDate = null;
      filters.endDate = null;
    }
  }

  // Explicit dates override preset if provided
  if (query.startDate) {
    const d = new Date(query.startDate);
    if (!isNaN(d.getTime())) {
      filters.startDate = query.startDate.split('T')[0];
    }
  }

  if (query.endDate) {
    const d = new Date(query.endDate);
    if (!isNaN(d.getTime())) {
      filters.endDate = query.endDate.split('T')[0];
    }
  }

  // Validate date range logic
  if (filters.startDate && filters.endDate) {
    const s = new Date(filters.startDate);
    const e = new Date(filters.endDate);
    if (e < s) {
      const err = new Error('Invalid date range: End date cannot be earlier than Start date');
      err.statusCode = 400;
      throw err;
    }
  }

  return filters;
}

/**
 * Check if a date string falls within [startDate, endDate]
 */
function isDateInRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  if (!startDate && !endDate) return true;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;

  if (startDate) {
    const s = new Date(startDate).getTime();
    if (t < s) return false;
  }
  if (endDate) {
    // End date inclusive to end of day
    const e = new Date(endDate + 'T23:59:59.999Z').getTime();
    if (t > e) return false;
  }
  return true;
}

/**
 * Determine if a user is an Admin account (to exclude from learner reporting)
 */
function isAdminUser(user) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase().trim();
  const userType = (user.userType || '').toLowerCase().trim();

  return (
    email === 'admin@onecommunityely.com' ||
    userType === 'teacher' ||
    userType === 'admin' ||
    role === 'admin'
  );
}

/**
 * Sanitize cell values against CSV / Formula Injection
 * Prepends a single quote if the string begins with =, +, -, @, or tab/return.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (!str) return '';

  // Check dangerous formula lead characters
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Format rows into CSV with RFC 4180 escaping
 */
export function formatCsv(headers, rows) {
  const escapeCell = (val) => {
    const sanitized = sanitizeCsvCell(val);
    const needsQuotes = /[",\n\r]/.test(sanitized);
    if (needsQuotes) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  };

  const headerLine = headers.map(h => escapeCell(h.label || h)).join(',');
  const rowLines = rows.map(r => {
    if (Array.isArray(r)) {
      return r.map(escapeCell).join(',');
    }
    return headers.map(h => escapeCell(r[h.key || h])).join(',');
  });

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * 1. GET OVERVIEW REPORT
 */
export async function getOverviewReport(filters = {}) {
  const [
    users,
    courses,
    selections,
    progressList,
    quizzes,
    quizAttempts,
    feedbackList,
    certificates,
    evidenceResult
  ] = await Promise.all([
    getAllUsersAdmin(),
    getAllCoursesAdmin(),
    getAllCourseSelectionsAdmin(),
    getAllProgressRecordsAdmin(),
    getAllQuizzesAdmin(),
    getAllQuizAttemptsAdmin(),
    getAllFeedbackSubmissions(),
    getAllCertificatesAdmin(),
    listEvidenceRecords({ status: 'all' }).catch(() => ({ records: [] }))
  ]);

  // Filter out Admins strictly
  const learners = users.filter(u => !isAdminUser(u));

  // Registered learners in period
  const totalRegisteredLearners = learners.length;
  const newLearnersInPeriod = learners.filter(u => 
    isDateInRange(u.registeredAt || u.createdAt, filters.startDate, filters.endDate)
  ).length;

  // Build active learner set based on activity in period:
  // Activity events: login/activity, course selection, progress update, quiz attempt, feedback, cert
  const activeLearnerEmails = new Set();

  learners.forEach(u => {
    if (isDateInRange(u.lastActiveAt, filters.startDate, filters.endDate)) {
      activeLearnerEmails.add(u.email.toLowerCase());
    }
  });

  selections.forEach(s => {
    if (isDateInRange(s.selectedAt || s.createdAt, filters.startDate, filters.endDate)) {
      if (!filters.courseId || s.courseId === filters.courseId) {
        if (s.learnerId) activeLearnerEmails.add(s.learnerId.toLowerCase());
      }
    }
  });

  progressList.forEach(p => {
    if (isDateInRange(p.lastAccessedAt || p.startedAt || p.completedAt, filters.startDate, filters.endDate)) {
      if (!filters.courseId || p.courseId === filters.courseId) {
        if (p.learnerEmail) activeLearnerEmails.add(p.learnerEmail.toLowerCase());
      }
    }
  });

  quizAttempts.forEach(a => {
    if (isDateInRange(a.submittedAt, filters.startDate, filters.endDate)) {
      if (a.learnerEmail) activeLearnerEmails.add(a.learnerEmail.toLowerCase());
    }
  });

  feedbackList.forEach(f => {
    if (isDateInRange(f.submittedAt, filters.startDate, filters.endDate)) {
      if (!filters.courseId || f.courseId === filters.courseId) {
        if (f.learnerEmail) activeLearnerEmails.add(f.learnerEmail.toLowerCase());
      }
    }
  });

  // Keep only registered non-admin learners in active count
  const validLearnerEmailSet = new Set(learners.map(l => l.email.toLowerCase()));
  const activeLearnersCount = Array.from(activeLearnerEmails).filter(em => validLearnerEmailSet.has(em)).length;
  const inactiveLearnersCount = Math.max(0, totalRegisteredLearners - activeLearnersCount);

  // Courses selected & started & completed (filtered by date and courseId)
  const filteredSelections = selections.filter(s => {
    if (filters.courseId && s.courseId !== filters.courseId) return false;
    return isDateInRange(s.selectedAt || s.createdAt, filters.startDate, filters.endDate);
  });
  const coursesSelectedCount = filteredSelections.length;

  const filteredProgress = progressList.filter(p => {
    if (filters.courseId && p.courseId !== filters.courseId) return false;
    return isDateInRange(p.startedAt, filters.startDate, filters.endDate);
  });
  const coursesStartedCount = filteredProgress.length;

  const completedProgress = progressList.filter(p => {
    if (filters.courseId && p.courseId !== filters.courseId) return false;
    if (p.status !== 'completed') return false;
    return isDateInRange(p.completedAt || p.lastAccessedAt, filters.startDate, filters.endDate);
  });
  const coursesCompletedCount = completedProgress.length;

  // Overall Completion Rate: completed ÷ started * 100
  const overallCompletionRate = coursesStartedCount > 0
    ? Number(((coursesCompletedCount / coursesStartedCount) * 100).toFixed(1))
    : 0;

  // Quiz Performance in period
  const filteredQuizAttempts = quizAttempts.filter(a => {
    if (filters.courseId) {
      const q = quizzes.find(item => item.quizId === a.quizId);
      if (!q || q.courseId !== filters.courseId) return false;
    }
    return isDateInRange(a.submittedAt, filters.startDate, filters.endDate);
  });

  const totalQuizAttempts = filteredQuizAttempts.length;
  const avgQuizScore = totalQuizAttempts > 0
    ? Number((filteredQuizAttempts.reduce((acc, a) => acc + (Number(a.percentage) || 0), 0) / totalQuizAttempts).toFixed(1))
    : 0;

  // Feedback Metrics in period
  const filteredFeedback = feedbackList.filter(f => {
    if (filters.courseId && f.courseId !== filters.courseId) return false;
    return isDateInRange(f.submittedAt, filters.startDate, filters.endDate);
  });

  const feedbackWithUsefulness = filteredFeedback.filter(f => typeof f.usefulnessRating === 'number' && f.usefulnessRating >= 1 && f.usefulnessRating <= 5);
  const avgUsefulnessRating = feedbackWithUsefulness.length > 0
    ? Number((feedbackWithUsefulness.reduce((acc, f) => acc + f.usefulnessRating, 0) / feedbackWithUsefulness.length).toFixed(1))
    : 0;

  const feedbackWithConfidence = filteredFeedback.filter(f => typeof f.confidenceRating === 'number' && f.confidenceRating >= 1 && f.confidenceRating <= 5);
  const avgConfidenceRating = feedbackWithConfidence.length > 0
    ? Number((feedbackWithConfidence.reduce((acc, f) => acc + f.confidenceRating, 0) / feedbackWithConfidence.length).toFixed(1))
    : 0;

  // Certificates in period
  const filteredCertificates = certificates.filter(c => {
    if (filters.courseId && c.courseId !== filters.courseId) return false;
    return isDateInRange(c.issuedAt, filters.startDate, filters.endDate);
  });

  const certificatesIssuedCount = filteredCertificates.length;
  const activeCertificatesCount = filteredCertificates.filter(c => c.status === 'active').length;
  const revokedCertificatesCount = filteredCertificates.filter(c => c.status === 'revoked').length;

  // Evidence activities & attendance in period
  const allEvidence = (evidenceResult && evidenceResult.records) ? evidenceResult.records : [];
  const activeEvidence = allEvidence.filter(r => (r.status || 'draft').toLowerCase() !== 'archived');
  const evidenceInPeriod = activeEvidence.filter(r => isDateInRange(r.activityDate, filters.startDate, filters.endDate));

  let totalEvidenceAttendance = 0;
  let recordsWithAttendance = 0;
  let recordsMissingAttendance = 0;
  evidenceInPeriod.forEach(r => {
    if (r.attendanceCount !== null && r.attendanceCount !== undefined && r.attendanceCount !== '') {
      totalEvidenceAttendance += Number(r.attendanceCount);
      recordsWithAttendance++;
    } else {
      recordsMissingAttendance++;
    }
  });

  return {
    summary: {
      totalRegisteredLearners,
      newLearnersInPeriod,
      activeLearnersCount,
      inactiveLearnersCount,
      coursesSelectedCount,
      coursesStartedCount,
      coursesCompletedCount,
      overallCompletionRate,
      averageQuizScore: avgQuizScore,
      averageUsefulnessRating: avgUsefulnessRating,
      averageConfidenceRating: avgConfidenceRating,
      certificatesIssuedCount,
      activeCertificatesCount,
      revokedCertificatesCount,
      evidenceActivitiesCount: evidenceInPeriod.length,
      totalEvidenceAttendance,
      evidenceRecordsWithAttendance: recordsWithAttendance,
      evidenceRecordsMissingAttendance: recordsMissingAttendance
    },
    filtersApplied: {
      startDate: filters.startDate ? formatUKDate(filters.startDate) : 'All time',
      endDate: filters.endDate ? formatUKDate(filters.endDate) : 'Present',
      courseId: filters.courseId || 'All courses',
      category: filters.category || 'All categories'
    },
    meta: {
      generatedAt: new Date().toISOString(),
      formulaNotice: 'Completion Rate = (Completed ÷ Started) × 100. Admin accounts strictly excluded.'
    }
  };
}

/**
 * 2. GET LEARNER ACTIVITY REPORT
 */
export async function getLearnerActivityReport(filters = {}) {
  const [users, selections, progressList, quizAttempts, feedbackList, certificates] = await Promise.all([
    getAllUsersAdmin(),
    getAllCourseSelectionsAdmin(),
    getAllProgressRecordsAdmin(),
    getAllQuizAttemptsAdmin(),
    getAllFeedbackSubmissions(),
    getAllCertificatesAdmin()
  ]);

  const learners = users.filter(u => !isAdminUser(u));

  const learnerRows = learners.map(learner => {
    const email = learner.email.toLowerCase();

    // User's selections
    const userSelections = selections.filter(s => 
      s.learnerId?.toLowerCase() === email &&
      (!filters.courseId || s.courseId === filters.courseId) &&
      isDateInRange(s.selectedAt || s.createdAt, filters.startDate, filters.endDate)
    );

    // User's progress
    const userProgress = progressList.filter(p =>
      p.learnerEmail?.toLowerCase() === email &&
      (!filters.courseId || p.courseId === filters.courseId)
    );

    const startedInPeriod = userProgress.filter(p => isDateInRange(p.startedAt, filters.startDate, filters.endDate));
    const completedInPeriod = userProgress.filter(p => p.status === 'completed' && isDateInRange(p.completedAt || p.lastAccessedAt, filters.startDate, filters.endDate));

    // User's quiz attempts in period
    const userAttempts = quizAttempts.filter(a =>
      a.learnerEmail?.toLowerCase() === email &&
      isDateInRange(a.submittedAt, filters.startDate, filters.endDate)
    );

    // User's feedback in period
    const userFeedback = feedbackList.filter(f =>
      f.learnerEmail?.toLowerCase() === email &&
      (!filters.courseId || f.courseId === filters.courseId) &&
      isDateInRange(f.submittedAt, filters.startDate, filters.endDate)
    );

    // Active in period evaluation
    const hasActivity = (
      isDateInRange(learner.lastActiveAt, filters.startDate, filters.endDate) ||
      userSelections.length > 0 ||
      startedInPeriod.length > 0 ||
      userAttempts.length > 0 ||
      userFeedback.length > 0
    );

    return {
      learnerId: learner.id || `usr_${email}`,
      name: learner.name || 'Learner',
      email: learner.email,
      registeredAt: learner.registeredAt || learner.createdAt,
      registeredAtFormatted: formatUKDate(learner.registeredAt || learner.createdAt),
      lastActiveAt: learner.lastActiveAt || null,
      lastActiveAtFormatted: formatUKDate(learner.lastActiveAt),
      isActive: hasActivity,
      isBanned: Boolean(learner.isBanned || learner.status === 'banned'),
      coursesSelectedCount: userSelections.length,
      coursesStartedCount: startedInPeriod.length,
      coursesCompletedCount: completedInPeriod.length,
      quizAttemptsCount: userAttempts.length
    };
  });

  // Apply status filter if provided
  let filteredList = learnerRows;
  if (filters.status === 'active') {
    filteredList = filteredList.filter(l => l.isActive);
  } else if (filters.status === 'inactive') {
    filteredList = filteredList.filter(l => !l.isActive);
  } else if (filters.status === 'banned') {
    filteredList = filteredList.filter(l => l.isBanned);
  }

  // Sort by lastActiveAt descending
  filteredList.sort((a, b) => new Date(b.lastActiveAt || b.registeredAt || 0) - new Date(a.lastActiveAt || a.registeredAt || 0));

  return {
    learners: filteredList,
    totalCount: filteredList.length,
    activeCount: learnerRows.filter(l => l.isActive).length,
    inactiveCount: learnerRows.filter(l => !l.isActive).length,
    bannedCount: learnerRows.filter(l => l.isBanned).length
  };
}

/**
 * 3. GET COURSE PERFORMANCE REPORT
 */
export async function getCoursePerformanceReport(filters = {}) {
  const [courses, selections, progressList, baselines, afterAssessments, feedbackList, certificates] = await Promise.all([
    getAllCoursesAdmin(),
    getAllCourseSelectionsAdmin(),
    getAllProgressRecordsAdmin(),
    getAllBaselineResponsesAdmin(),
    getAllAfterAssessmentResponsesAdmin(),
    getAllFeedbackSubmissions(),
    getAllCertificatesAdmin()
  ]);

  let targetCourses = courses;
  if (filters.courseId) {
    targetCourses = targetCourses.filter(c => c.courseId === filters.courseId);
  }
  if (filters.category) {
    targetCourses = targetCourses.filter(c => c.category === filters.category);
  }

  const performanceRows = targetCourses.map(course => {
    const cid = course.courseId;

    // Selections for this course
    const courseSelections = selections.filter(s =>
      s.courseId === cid &&
      isDateInRange(s.selectedAt || s.createdAt, filters.startDate, filters.endDate)
    );

    // Progress records
    const courseProgress = progressList.filter(p => p.courseId === cid);

    const startedRecords = courseProgress.filter(p => isDateInRange(p.startedAt, filters.startDate, filters.endDate));
    const completedRecords = courseProgress.filter(p => p.status === 'completed' && isDateInRange(p.completedAt || p.lastAccessedAt, filters.startDate, filters.endDate));
    const inProgressRecords = courseProgress.filter(p => p.status === 'in_progress');
    const notStartedCount = Math.max(0, courseSelections.length - startedRecords.length);

    const startedCount = startedRecords.length;
    const completedCount = completedRecords.length;

    // Completion rate: (completed / started) * 100
    const completionRate = startedCount > 0
      ? Number(((completedCount / startedCount) * 100).toFixed(1))
      : 0;

    // Average progress
    const totalProgressPercentage = startedRecords.reduce((acc, p) => acc + (Number(p.progressPercentage) || 0), 0);
    const averageProgress = startedCount > 0
      ? Number((totalProgressPercentage / startedCount).toFixed(1))
      : 0;

    // Submissions & certificates for this course
    const baselineCount = baselines.filter(b => b.courseId === cid && isDateInRange(b.submittedAt, filters.startDate, filters.endDate)).length;
    const finalCount = afterAssessments.filter(a => a.courseId === cid && isDateInRange(a.submittedAt, filters.startDate, filters.endDate)).length;
    const feedbackCount = feedbackList.filter(f => f.courseId === cid && isDateInRange(f.submittedAt, filters.startDate, filters.endDate)).length;
    const certCount = certificates.filter(c => c.courseId === cid && isDateInRange(c.issuedAt, filters.startDate, filters.endDate)).length;

    return {
      courseId: cid,
      title: course.title,
      category: course.category || 'General',
      status: course.status,
      selectedCount: courseSelections.length,
      startedCount,
      completedCount,
      inProgressCount: inProgressRecords.length,
      notStartedCount,
      completionRate,
      averageProgress,
      baselineSubmissions: baselineCount,
      finalAssessmentSubmissions: finalCount,
      feedbackSubmissions: feedbackCount,
      certificatesIssued: certCount
    };
  });

  return {
    courses: performanceRows,
    totalCourses: performanceRows.length
  };
}

/**
 * 4. GET QUIZ RESULTS REPORT
 */
export async function getQuizResultsReport(filters = {}) {
  const [quizzes, attempts, courses] = await Promise.all([
    getAllQuizzesAdmin(),
    getAllQuizAttemptsAdmin(),
    getAllCoursesAdmin()
  ]);

  const courseMap = new Map(courses.map(c => [c.courseId, c.title]));

  let targetQuizzes = quizzes;
  if (filters.courseId) {
    targetQuizzes = targetQuizzes.filter(q => q.courseId === filters.courseId);
  }

  const results = targetQuizzes.map(quiz => {
    const qid = quiz.quizId;
    const quizAttempts = attempts.filter(a => 
      a.quizId === qid &&
      isDateInRange(a.submittedAt, filters.startDate, filters.endDate)
    );

    const totalAttempts = quizAttempts.length;
    const uniqueLearners = new Set(quizAttempts.map(a => a.learnerEmail?.toLowerCase()).filter(Boolean));
    const learnersCount = uniqueLearners.size;

    // Passed learners count (unique learners who passed at least once)
    const passedLearners = new Set(
      quizAttempts.filter(a => a.passed === true).map(a => a.learnerEmail?.toLowerCase()).filter(Boolean)
    );

    const passRate = learnersCount > 0
      ? Number(((passedLearners.size / learnersCount) * 100).toFixed(1))
      : 0;

    const scores = quizAttempts.map(a => Number(a.percentage) || 0);
    const avgScore = totalAttempts > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / totalAttempts).toFixed(1))
      : 0;
    const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0;

    const avgAttemptsPerLearner = learnersCount > 0
      ? Number((totalAttempts / learnersCount).toFixed(1))
      : 0;

    return {
      quizId: qid,
      title: quiz.title,
      courseId: quiz.courseId,
      courseTitle: courseMap.get(quiz.courseId) || 'Course',
      moduleId: quiz.moduleId || null,
      lessonId: quiz.lessonId || null,
      learnersAttempted: learnersCount,
      totalAttempts,
      averageScore: avgScore,
      highestScore,
      lowestScore,
      passedLearnersCount: passedLearners.size,
      passRate,
      averageAttemptsPerLearner: avgAttemptsPerLearner
    };
  });

  return {
    quizzes: results,
    totalQuizzes: results.length
  };
}

/**
 * 5. GET BEFORE-VS-AFTER OUTCOMES REPORT
 */
export async function getOutcomesReport(filters = {}) {
  const [baselines, afterResponses, courses] = await Promise.all([
    getAllBaselineResponsesAdmin(),
    getAllAfterAssessmentResponsesAdmin(),
    getAllCoursesAdmin()
  ]);

  const courseMap = new Map(courses.map(c => [c.courseId, c.title]));

  // Index baselines by learnerEmail + courseId
  const baselineMap = new Map();
  baselines.forEach(b => {
    if (b.learnerEmail && b.courseId) {
      const key = `${b.learnerEmail.toLowerCase()}#${b.courseId}`;
      baselineMap.set(key, b);
    }
  });

  // Filter after responses by date and courseId
  const filteredAfter = afterResponses.filter(a => {
    if (filters.courseId && a.courseId !== filters.courseId) return false;
    return isDateInRange(a.submittedAt, filters.startDate, filters.endDate);
  });

  let validComparisonsCount = 0;
  let unavailableCount = 0;
  let sumBaselineConfidence = 0;
  let sumFinalConfidence = 0;
  let confidenceComparisonCount = 0;

  let increasedCount = 0;
  let maintainedCount = 0;
  let reducedCount = 0;

  const comparisonRows = [];

  filteredAfter.forEach(afterResp => {
    const email = afterResp.learnerEmail?.toLowerCase();
    const cid = afterResp.courseId;
    const key = `${email}#${cid}`;
    const baseResp = baselineMap.get(key);

    if (!baseResp) {
      unavailableCount += 1;
      return;
    }

    // Compare confidence ratings
    const baseAnswers = baseResp.answers || {};
    const finalAnswers = afterResp.answers || {};

    let learnerBaseTotal = 0;
    let learnerFinalTotal = 0;
    let learnerPairs = 0;

    for (const [qid, finalAns] of Object.entries(finalAnswers)) {
      const finalRating = typeof finalAns?.rating === 'number' ? finalAns.rating : (typeof finalAns?.ratingValue === 'number' ? finalAns.ratingValue : null);
      if (finalRating !== null) {
        const matchingBase = Object.values(baseAnswers).find(b => {
          const bRating = typeof b?.rating === 'number' ? b.rating : (typeof b?.ratingValue === 'number' ? b.ratingValue : null);
          return bRating !== null && (b.questionId === finalAns.baselineQuestionId || b.questionId === qid);
        });

        if (matchingBase) {
          const baseRating = typeof matchingBase.rating === 'number' ? matchingBase.rating : matchingBase.ratingValue;
          learnerBaseTotal += baseRating;
          learnerFinalTotal += finalRating;
          learnerPairs += 1;
        }
      }
    }

    if (learnerPairs > 0) {
      validComparisonsCount += 1;
      const baseAvg = learnerBaseTotal / learnerPairs;
      const finalAvg = learnerFinalTotal / learnerPairs;
      const change = Number((finalAvg - baseAvg).toFixed(1));

      sumBaselineConfidence += baseAvg;
      sumFinalConfidence += finalAvg;
      confidenceComparisonCount += 1;

      let outcome = 'maintained';
      if (change > 0) {
        outcome = 'increased';
        increasedCount += 1;
      } else if (change < 0) {
        outcome = 'reduced';
        reducedCount += 1;
      } else {
        maintainedCount += 1;
      }

      comparisonRows.push({
        comparisonId: `comp_${email}_${cid}`,
        learnerName: afterResp.learnerName || 'Learner',
        courseId: cid,
        courseTitle: courseMap.get(cid) || 'Course',
        baselineConfidence: Number(baseAvg.toFixed(1)),
        finalConfidence: Number(finalAvg.toFixed(1)),
        change,
        outcome,
        completedAt: afterResp.submittedAt,
        completedAtFormatted: formatUKDate(afterResp.submittedAt)
      });
    } else {
      unavailableCount += 1;
    }
  });

  const avgBaseline = confidenceComparisonCount > 0
    ? Number((sumBaselineConfidence / confidenceComparisonCount).toFixed(1))
    : null;
  const avgFinal = confidenceComparisonCount > 0
    ? Number((sumFinalConfidence / confidenceComparisonCount).toFixed(1))
    : null;
  const avgChange = (avgBaseline !== null && avgFinal !== null)
    ? Number((avgFinal - avgBaseline).toFixed(1))
    : 0;

  const increasedPercentage = validComparisonsCount > 0
    ? Number(((increasedCount / validComparisonsCount) * 100).toFixed(1))
    : 0;
  const maintainedPercentage = validComparisonsCount > 0
    ? Number(((maintainedCount / validComparisonsCount) * 100).toFixed(1))
    : 0;
  const reducedPercentage = validComparisonsCount > 0
    ? Number(((reducedCount / validComparisonsCount) * 100).toFixed(1))
    : 0;

  return {
    summary: {
      validComparisonsCount,
      unavailableCount,
      averageBaselineConfidence: avgBaseline,
      averageFinalConfidence: avgFinal,
      averageChange: avgChange,
      increasedCount,
      increasedPercentage,
      maintainedCount,
      maintainedPercentage,
      reducedCount,
      reducedPercentage
    },
    wording: 'Learner-reported confidence increased after training.',
    disclaimer: 'Data reflects self-reported learner confidence before and after course completion. It does not constitute an accredited or regulated educational qualification.',
    comparisons: comparisonRows
  };
}

/**
 * 6. GET BENEFICIARY FEEDBACK REPORT
 */
export async function getFeedbackReport(filters = {}) {
  const [feedbackList, courses] = await Promise.all([
    getAllFeedbackSubmissions(),
    getAllCoursesAdmin()
  ]);

  const courseMap = new Map(courses.map(c => [c.courseId, c.title]));

  const filtered = feedbackList.filter(f => {
    if (filters.courseId && f.courseId !== filters.courseId) return false;
    return isDateInRange(f.submittedAt, filters.startDate, filters.endDate);
  });

  const totalCount = filtered.length;

  const withUsefulness = filtered.filter(f => typeof f.usefulnessRating === 'number' && f.usefulnessRating >= 1 && f.usefulnessRating <= 5);
  const avgUsefulness = withUsefulness.length > 0
    ? Number((withUsefulness.reduce((acc, f) => acc + f.usefulnessRating, 0) / withUsefulness.length).toFixed(1))
    : 0;

  const withConfidence = filtered.filter(f => typeof f.confidenceRating === 'number' && f.confidenceRating >= 1 && f.confidenceRating <= 5);
  const avgConfidence = withConfidence.length > 0
    ? Number((withConfidence.reduce((acc, f) => acc + f.confidenceRating, 0) / withConfidence.length).toFixed(1))
    : 0;

  // Percentage who would recommend (missing not treated as No)
  const answeredRecommend = filtered.filter(f => typeof f.wouldRecommend === 'boolean');
  const yesCount = answeredRecommend.filter(f => f.wouldRecommend === true).length;
  const recommendPercentage = answeredRecommend.length > 0
    ? Number(((yesCount / answeredRecommend.length) * 100).toFixed(1))
    : 0;

  // Testimonial Consent Breakdown: none, anonymous, named, withdrawn
  let consentNone = 0;
  let consentAnonymous = 0;
  let consentNamed = 0;
  let consentWithdrawn = 0;

  const comments = [];
  const requestedTopicsMap = new Map();

  filtered.forEach(f => {
    const consent = f.testimonialConsent || 'none';
    if (consent === 'withdrawn') {
      consentWithdrawn += 1;
    } else if (consent === 'named') {
      consentNamed += 1;
    } else if (consent === 'anonymous') {
      consentAnonymous += 1;
    } else {
      consentNone += 1;
    }

    // Tally requested next training topics safely
    if (f.nextTrainingTopic && typeof f.nextTrainingTopic === 'string') {
      const topic = f.nextTrainingTopic.trim();
      if (topic) {
        requestedTopicsMap.set(topic, (requestedTopicsMap.get(topic) || 0) + 1);
      }
    }

    // Protect learner comments: if consent is withdrawn or none, clearly label permitted usage
    if (f.generalComments && f.generalComments.trim()) {
      let displayName = 'Private Learner';
      if (consent === 'named') {
        displayName = f.learnerName || 'Community Learner';
      } else if (consent === 'anonymous') {
        displayName = 'Anonymous Learner';
      }

      comments.push({
        feedbackId: f.feedbackId,
        courseTitle: courseMap.get(f.courseId) || 'Course',
        comment: f.generalComments.trim(),
        consentStatus: consent,
        displayName,
        submittedAt: f.submittedAt,
        submittedAtFormatted: formatUKDate(f.submittedAt)
      });
    }
  });

  const requestedTopics = Array.from(requestedTopicsMap.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalSubmissions: totalCount,
      averageUsefulness: avgUsefulness,
      averageConfidence: avgConfidence,
      recommendationPercentage: recommendPercentage,
      consentBreakdown: {
        none: consentNone,
        anonymous: consentAnonymous,
        named: consentNamed,
        withdrawn: consentWithdrawn
      }
    },
    requestedTopics,
    comments
  };
}

/**
 * 7. GET CERTIFICATES REPORT
 */
export async function getCertificatesReport(filters = {}) {
  const [certificates, courses] = await Promise.all([
    getAllCertificatesAdmin(),
    getAllCoursesAdmin()
  ]);

  const courseMap = new Map(courses.map(c => [c.courseId, c.title]));

  const filtered = certificates.filter(c => {
    if (filters.courseId && c.courseId !== filters.courseId) return false;
    return isDateInRange(c.issuedAt, filters.startDate, filters.endDate);
  });

  const totalIssued = filtered.length;
  const activeCount = filtered.filter(c => c.status === 'active').length;
  const revokedCount = filtered.filter(c => c.status === 'revoked').length;

  // Certificates grouped by course
  const courseCountsMap = new Map();
  filtered.forEach(c => {
    const title = c.courseTitle || courseMap.get(c.courseId) || 'Course';
    courseCountsMap.set(title, (courseCountsMap.get(title) || 0) + 1);
  });

  const certificatesByCourse = Array.from(courseCountsMap.entries())
    .map(([courseTitle, count]) => ({ courseTitle, count }))
    .sort((a, b) => b.count - a.count);

  const registry = filtered.map(c => ({
    certificateNumber: c.certificateNumber,
    learnerName: c.learnerName,
    courseTitle: c.courseTitle || courseMap.get(c.courseId) || 'Course',
    completedAtFormatted: formatUKDate(c.completedAt),
    issuedAtFormatted: formatUKDate(c.issuedAt),
    status: c.status
  }));

  return {
    summary: {
      totalIssued,
      activeCount,
      revokedCount
    },
    certificatesByCourse,
    certificates: registry
  };
}

/**
 * 8. GET EVIDENCE IMPACT REPORT
 */
export async function getEvidenceImpactReport(filters = {}) {
  const result = await listEvidenceRecords({ status: 'all' });
  const allRecords = result.records || [];

  // Exclude archived from normal active totals
  const activeRecords = allRecords.filter(r => (r.status || 'draft').toLowerCase() !== 'archived');
  const archivedRecords = allRecords.filter(r => (r.status || 'draft').toLowerCase() === 'archived');

  // Filter active records by period & category
  const filteredRecords = activeRecords.filter(r => {
    if (filters.category && filters.category !== 'all') {
      if (r.category !== filters.category && r.customCategory !== filters.category) return false;
    }
    return isDateInRange(r.activityDate, filters.startDate, filters.endDate);
  });

  let totalRecordedAttendance = 0;
  let recordsWithRecordedAttendance = 0;
  let recordsMissingAttendance = 0;

  filteredRecords.forEach(r => {
    if (r.attendanceCount !== null && r.attendanceCount !== undefined && r.attendanceCount !== '') {
      totalRecordedAttendance += Number(r.attendanceCount);
      recordsWithRecordedAttendance++;
    } else {
      recordsMissingAttendance++;
    }
  });

  const averageAttendance = recordsWithRecordedAttendance > 0
    ? Math.round(totalRecordedAttendance / recordsWithRecordedAttendance)
    : 0;

  // Category breakdown
  const categoryCounts = {};
  filteredRecords.forEach(r => {
    const cat = r.category === 'Other' && r.customCategory ? r.customCategory : (r.category || 'Other');
    if (!categoryCounts[cat]) {
      categoryCounts[cat] = { count: 0, totalAttendance: 0 };
    }
    categoryCounts[cat].count++;
    if (r.attendanceCount !== null && r.attendanceCount !== undefined && r.attendanceCount !== '') {
      categoryCounts[cat].totalAttendance += Number(r.attendanceCount);
    }
  });

  // Location breakdown
  const locationCounts = {};
  filteredRecords.forEach(r => {
    const loc = (r.location || '').trim() || 'Not specified';
    if (!locationCounts[loc]) {
      locationCounts[loc] = { count: 0, totalAttendance: 0 };
    }
    locationCounts[loc].count++;
    if (r.attendanceCount !== null && r.attendanceCount !== undefined && r.attendanceCount !== '') {
      locationCounts[loc].totalAttendance += Number(r.attendanceCount);
    }
  });

  // Stories, reports/documents, outcomes
  let beneficiaryStoriesCount = 0;
  let documentsCount = 0;
  let photosCount = 0;
  let outcomeSummariesCount = 0;

  filteredRecords.forEach(r => {
    if (r.beneficiaryStories && r.beneficiaryStories.trim().length > 0) {
      beneficiaryStoriesCount++;
    }
    if (r.outcomeSummary && r.outcomeSummary.trim().length > 0) {
      outcomeSummariesCount++;
    }
    if (Array.isArray(r.attachments)) {
      r.attachments.forEach(att => {
        if (att.type === 'document') documentsCount++;
        else if (att.type === 'image') photosCount++;
      });
    }
  });

  return {
    summary: {
      totalActivitiesAllTime: activeRecords.length,
      archivedActivitiesCount: archivedRecords.length,
      activitiesInPeriod: filteredRecords.length,
      totalActivities: filteredRecords.length,
      totalRecordedAttendance,
      totalAttendance: totalRecordedAttendance,
      recordsWithRecordedAttendance,
      recordsWithAttendance: recordsWithRecordedAttendance,
      recordsMissingAttendance,
      averageAttendance,
      beneficiaryStoriesCount,
      documentsCount,
      photosCount,
      outcomeSummariesCount
    },
    categoryBreakdown: categoryCounts,
    locationBreakdown: locationCounts,
    activities: filteredRecords.map(r => ({
      evidenceId: r.evidenceId,
      activityTitle: r.activityTitle,
      category: r.category,
      customCategory: r.customCategory,
      activityDate: r.activityDate,
      activityDateFormatted: formatUKDate(r.activityDate),
      activityDateUK: formatUKDate(r.activityDate),
      location: r.location || 'Not specified',
      attendanceCount: r.attendanceCount !== null && r.attendanceCount !== undefined ? r.attendanceCount : null,
      attachmentCount: Array.isArray(r.attachments) ? r.attachments.length : 0,
      attachments: r.attachments || [],
      externalLinks: [...(r.socialLinks || []), ...(r.podcastLinks || []), ...(r.videoLinks || [])],
      hasStory: Boolean(r.beneficiaryStories && r.beneficiaryStories.trim().length > 0),
      hasOutcome: Boolean(r.outcomeSummary && r.outcomeSummary.trim().length > 0),
      status: r.status
    })),
    records: filteredRecords.map(r => ({
      evidenceId: r.evidenceId,
      activityTitle: r.activityTitle,
      title: r.activityTitle,
      category: r.category,
      customCategory: r.customCategory,
      activityDate: r.activityDate,
      activityDateFormatted: formatUKDate(r.activityDate),
      activityDateUK: formatUKDate(r.activityDate),
      location: r.location || 'Not specified',
      attendanceCount: r.attendanceCount !== null && r.attendanceCount !== undefined ? r.attendanceCount : null,
      attachmentCount: Array.isArray(r.attachments) ? r.attachments.length : 0,
      attachments: r.attachments || [],
      externalLinks: [...(r.socialLinks || []), ...(r.podcastLinks || []), ...(r.videoLinks || [])],
      hasStory: Boolean(r.beneficiaryStories && r.beneficiaryStories.trim().length > 0),
      hasOutcome: Boolean(r.outcomeSummary && r.outcomeSummary.trim().length > 0),
      status: r.status
    })),
    filtersApplied: {
      startDate: filters.startDate ? formatUKDate(filters.startDate) : 'All time',
      endDate: filters.endDate ? formatUKDate(filters.endDate) : 'Present',
      category: filters.category || 'All categories'
    }
  };
}

/**
 * 9. GENERATE CSV EXPORTS WITH FORMULA INJECTION PROTECTION
 */
export async function generateCsvExport(type, filters = {}) {
  switch (type) {
    case 'learners': {
      const data = await getLearnerActivityReport(filters);
      const headers = [
        { label: 'Learner Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Registration Date', key: 'registeredAtFormatted' },
        { label: 'Last Active', key: 'lastActiveAtFormatted' },
        { label: 'Status', key: 'statusLabel' },
        { label: 'Courses Selected', key: 'coursesSelectedCount' },
        { label: 'Courses Started', key: 'coursesStartedCount' },
        { label: 'Courses Completed', key: 'coursesCompletedCount' },
        { label: 'Quiz Attempts', key: 'quizAttemptsCount' }
      ];
      const rows = data.learners.map(l => ({
        ...l,
        statusLabel: l.isBanned ? 'Banned' : (l.isActive ? 'Active' : 'Inactive')
      }));
      return formatCsv(headers, rows);
    }

    case 'courses': {
      const data = await getCoursePerformanceReport(filters);
      const headers = [
        { label: 'Course Title', key: 'title' },
        { label: 'Category', key: 'category' },
        { label: 'Status', key: 'status' },
        { label: 'Selected', key: 'selectedCount' },
        { label: 'Started', key: 'startedCount' },
        { label: 'Completed', key: 'completedCount' },
        { label: 'In Progress', key: 'inProgressCount' },
        { label: 'Not Started', key: 'notStartedCount' },
        { label: 'Completion Rate (%)', key: 'completionRate' },
        { label: 'Average Progress (%)', key: 'averageProgress' },
        { label: 'Baseline Submissions', key: 'baselineSubmissions' },
        { label: 'Final Submissions', key: 'finalAssessmentSubmissions' },
        { label: 'Feedback Submissions', key: 'feedbackSubmissions' },
        { label: 'Certificates Issued', key: 'certificatesIssued' }
      ];
      return formatCsv(headers, data.courses);
    }

    case 'quizzes': {
      const data = await getQuizResultsReport(filters);
      const headers = [
        { label: 'Quiz Title', key: 'title' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Learners Attempted', key: 'learnersAttempted' },
        { label: 'Total Attempts', key: 'totalAttempts' },
        { label: 'Average Score (%)', key: 'averageScore' },
        { label: 'Highest Score (%)', key: 'highestScore' },
        { label: 'Lowest Score (%)', key: 'lowestScore' },
        { label: 'Pass Rate (%)', key: 'passRate' },
        { label: 'Avg Attempts per Learner', key: 'averageAttemptsPerLearner' }
      ];
      return formatCsv(headers, data.quizzes);
    }

    case 'outcomes': {
      const data = await getOutcomesReport(filters);
      const headers = [
        { label: 'Learner', key: 'learnerName' },
        { label: 'Course', key: 'courseTitle' },
        { label: 'Baseline Confidence (1-5)', key: 'baselineConfidence' },
        { label: 'Final Confidence (1-5)', key: 'finalConfidence' },
        { label: 'Change', key: 'change' },
        { label: 'Outcome', key: 'outcome' },
        { label: 'Completed Date', key: 'completedAtFormatted' }
      ];
      return formatCsv(headers, data.comparisons);
    }

    case 'feedback': {
      const data = await getFeedbackReport(filters);
      const headers = [
        { label: 'Course', key: 'courseTitle' },
        { label: 'Learner / Display', key: 'displayName' },
        { label: 'Testimonial Consent', key: 'consentStatus' },
        { label: 'Learner Comments', key: 'comment' },
        { label: 'Date', key: 'submittedAtFormatted' }
      ];
      return formatCsv(headers, data.comments);
    }

    case 'certificates': {
      const data = await getCertificatesReport(filters);
      const headers = [
        { label: 'Certificate Number', key: 'certificateNumber' },
        { label: 'Learner Name', key: 'learnerName' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Completion Date', key: 'completedAtFormatted' },
        { label: 'Issue Date', key: 'issuedAtFormatted' },
        { label: 'Status', key: 'status' }
      ];
      return formatCsv(headers, data.certificates);
    }

    case 'evidence': {
      const data = await getEvidenceImpactReport(filters);
      const headers = [
        { label: 'Activity Title', key: 'activityTitle' },
        { label: 'Category', key: 'category' },
        { label: 'Activity Date', key: 'activityDateFormatted' },
        { label: 'Location', key: 'location' },
        { label: 'Attendance', key: 'attendanceCount' },
        { label: 'Attachments', key: 'attachmentCount' },
        { label: 'Has Story', key: 'hasStory' },
        { label: 'Has Outcome Summary', key: 'hasOutcome' },
        { label: 'Status', key: 'status' }
      ];
      return formatCsv(headers, data.activities);
    }

    default:
      throw new Error(`Unknown export type: "${type}"`);
  }
}

export default {
  parseFilters,
  getOverviewReport,
  getLearnerActivityReport,
  getCoursePerformanceReport,
  getQuizResultsReport,
  getOutcomesReport,
  getFeedbackReport,
  getCertificatesReport,
  getEvidenceImpactReport,
  generateCsvExport,
  formatUKDate,
  sanitizeCsvCell,
  formatCsv
};
