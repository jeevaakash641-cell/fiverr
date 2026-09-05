/**
 * Learner Dashboard Summary Service
 * One Community Ely Online Training Centre
 * Aggregates authoritative learner data across all 9 platform subsystems
 */

import { getUserByEmail } from './userService.js';
import { getLearnerSelections } from './courseSelectionService.js';
import {
  getLearnerAllCoursesProgress,
  calculateCourseProgress,
  getCourseResume
} from './progressService.js';
import { getPublishedCourses, getCourseById } from './courseService.js';
import { getModulesByCourse } from './moduleService.js';
import { getLessonsByCourse } from './lessonService.js';
import {
  getPublishedAssessmentForCourse as getPublishedBaseline,
  getLearnerBaselineResponse
} from './baselineAssessmentService.js';
import {
  getPublishedAssessmentForCourse as getPublishedAfterAssessment,
  getLearnerAfterResponse
} from './afterAssessmentService.js';
import { getLearnerFeedback } from './beneficiaryFeedbackService.js';
import {
  getLearnerCertificates,
  getCertificateByLearnerAndCourse
} from './certificateService.js';
import {
  getAllLearnerQuizAttempts,
  getQuizzesByCourse,
  getAllQuizzesAdmin
} from './quizService.js';
import { computeCourseRecommendations } from './recommendationEngine.js';
import { getLearnerContentRequests } from './contentRequestService.js';

// In-memory dashboard cache: email -> { data, cachedAt }
const dashboardCache = new Map();
const CACHE_TTL_MS = 30_000; // 30 seconds

export function invalidateDashboardCache(email = null) {
  if (email) {
    dashboardCache.delete(String(email).toLowerCase().trim());
  } else {
    dashboardCache.clear();
  }
}

/**
 * Compile Authoritative Learner Dashboard Summary
 * @param {Object} learnerUser - Authenticated user object from req.user
 * @returns {Promise<Object>} Comprehensive learner state and next-action roadmap
 */
export async function getLearnerDashboardSummary(learnerUser) {
  if (!learnerUser || !learnerUser.email) {
    throw new Error('Authenticated learner identity is required');
  }

  const cleanEmail = String(learnerUser.email).toLowerCase().trim();

  // Serve from cache if fresh (< 30s old)
  const cached = dashboardCache.get(cleanEmail);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
    console.log(`[dashboard] Cache HIT for ${cleanEmail}`);
    return cached.data;
  }
  console.log(`[dashboard] Cache MISS for ${cleanEmail} — fetching fresh data`);

  // 1-6: Fire ALL top-level fetches in parallel
  const [
    userProfile,
    { inProgress, notStarted, completed, all },
    publishedCourses,
    certificates,
    allQuizAttempts,
    learnerRequests,
    allAdminQuizzes
  ] = await Promise.all([
    getUserByEmail(cleanEmail).catch(() => null),
    getLearnerAllCoursesProgress(cleanEmail),
    getPublishedCourses(),
    getLearnerCertificates(cleanEmail).catch(() => []),
    getAllLearnerQuizAttempts(cleanEmail).catch(() => []),
    getLearnerContentRequests(cleanEmail).catch(() => []),
    getAllQuizzesAdmin().catch(() => [])
  ]);

  const displayName = userProfile?.name || learnerUser.name || learnerUser.displayName || cleanEmail.split('@')[0];
  const learningInterest = userProfile?.learningInterests || userProfile?.learningInterest || '';

  const selectedCourseIdSet = new Set(all.map(item => item.courseId));
  const activeCertificates = certificates.filter(c => c.status === 'active');
  const quizzesPassedCount = allQuizAttempts.filter(a => a.passed).length;

  // 7. Enrich courses with deep state (module count, lesson count, assessment states, quiz states)
  let totalLessonsCompleted = 0;
  let afterResponsesCount = 0;
  let feedbackSubmissionsCount = 0;

  const enrichedCourses = await Promise.all(all.map(async (item) => {
    const cid = item.courseId;
    const course = item.course || (await getCourseById(cid));
    const prog = item.progress || {};

    const [modules, lessons, baselineAss, baselineResp, afterAss, afterResp, feedback, cert] = await Promise.all([
      getModulesByCourse(cid, false).catch(() => []),
      getLessonsByCourse(cid, false).catch(() => []),
      getPublishedBaseline(cid).catch(() => null),
      getLearnerBaselineResponse(cid, cleanEmail).catch(() => null),
      getPublishedAfterAssessment(cid).catch(() => null),
      getLearnerAfterResponse(cid, cleanEmail).catch(() => null),
      getLearnerFeedback(cid, cleanEmail).catch(() => null),
      getCertificateByLearnerAndCourse(cid, cleanEmail).catch(() => null)
    ]);

    const completedLessonIds = prog.completedLessonIds || [];
    totalLessonsCompleted += completedLessonIds.length;

    if (afterResp) afterResponsesCount++;
    if (feedback) feedbackSubmissionsCount++;

    const isBaselineRequired = !!baselineAss;
    const isBaselineCompleted = !!baselineResp;

    const isAfterRequired = !!afterAss;
    const isAfterCompleted = !!afterResp;

    const isFeedbackCompleted = !!feedback;
    const isCertificateIssued = !!cert;

    const courseTitle = course?.title || prog.courseTitle || 'Course';
    const cleanCourseTitle = courseTitle.trim().toLowerCase();

    // Check course quizzes & title matching across all quizzes
    const courseQuizzes = allAdminQuizzes.filter(q => 
      !q.isDeleted && (
        q.courseId === cid || 
        (q.courseTitle && q.courseTitle.trim().toLowerCase() === cleanCourseTitle)
      )
    );
    const publishedQuizzes = courseQuizzes.filter(q => q.status === 'published');
    const hasMatchingQuiz = publishedQuizzes.length > 0;
    const quizMismatchOrMissing = publishedQuizzes.length === 0;

    // Check assessment & title matching
    const baselineMatchesTitle = !baselineAss || !baselineAss.courseTitle || baselineAss.courseTitle.trim().toLowerCase() === cleanCourseTitle;
    const afterMatchesTitle = !afterAss || !afterAss.courseTitle || afterAss.courseTitle.trim().toLowerCase() === cleanCourseTitle;
    const hasPublishedAssessment = !!(baselineAss || afterAss);
    const hasMatchingAssessment = hasPublishedAssessment && baselineMatchesTitle && afterMatchesTitle;
    const assessmentMismatchOrMissing = !hasMatchingAssessment;

    // Check pending requests for this course
    const courseRequests = learnerRequests.filter(r => r.courseId === cid && r.status === 'pending');
    const quizRequestPending = courseRequests.some(r => r.requestType === 'quiz');
    const assessmentRequestPending = courseRequests.some(r => r.requestType === 'assessment');

    const pendingQuizzes = [];
    for (const q of publishedQuizzes) {
      const passed = allQuizAttempts.some(att => att.quizId === q.quizId && att.passed);
      if (!passed) {
        pendingQuizzes.push({
          quizId: q.quizId,
          title: q.title || 'Course Quiz',
          lessonId: q.lessonId || null
        });
      }
    }

    // Get exact resume target if in progress
    let resumeInfo = null;
    if (prog.status === 'in_progress') {
      resumeInfo = await getCourseResume(cid, cleanEmail).catch(() => null);
    }

    return {
      courseId: cid,
      courseTitle,
      shortDescription: course?.shortDescription || '',
      category: course?.category || 'General',
      selectedAt: item.selection?.selectedAt || prog.startedAt || null,
      status: prog.status,
      startedAt: prog.startedAt,
      completedAt: prog.completedAt,
      lastAccessedAt: prog.lastAccessedAt,
      progressPercentage: prog.progressPercentage || 0,
      completedLessonsCount: completedLessonIds.length,
      totalRequiredLessons: lessons.filter(l => l.status === 'published').length || prog.totalRequiredLessons || 0,
      moduleCount: modules.filter(m => m.status === 'published').length,
      lessonCount: lessons.filter(l => l.status === 'published').length,
      baselineRequired: isBaselineRequired,
      baselineCompleted: isBaselineCompleted,
      afterAssessmentRequired: isAfterRequired,
      afterAssessmentCompleted: isAfterCompleted,
      feedbackCompleted: isFeedbackCompleted,
      certificateIssued: isCertificateIssued,
      certificate: cert,
      hasMatchingQuiz,
      quizMismatchOrMissing,
      hasMatchingAssessment,
      assessmentMismatchOrMissing,
      quizRequestPending,
      assessmentRequestPending,
      pendingQuizzes,
      resumeInfo
    };
  }));

  // Separate enriched lists
  const enrichedInProgress = enrichedCourses.filter(c => c.status === 'in_progress');
  const enrichedNotStarted = enrichedCourses.filter(c => c.status === 'not_started');
  const enrichedCompleted = enrichedCourses.filter(c => c.status === 'completed');

  // Sort in-progress by lastAccessedAt descending
  enrichedInProgress.sort((a, b) => new Date(b.lastAccessedAt || b.startedAt || 0) - new Date(a.lastAccessedAt || a.startedAt || 0));

  // 7. Aggregate All Pending Actions
  const pendingActions = [];

  for (const c of enrichedCourses) {
    // A. Baseline Pending
    if (c.baselineRequired && !c.baselineCompleted && c.status !== 'completed') {
      pendingActions.push({
        id: `pending_baseline_${c.courseId}`,
        type: 'baseline_assessment',
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        title: 'Complete Baseline Assessment',
        description: `Take the initial reflection for ${c.courseTitle} before starting your lessons.`,
        buttonText: 'Take Baseline Assessment',
        buttonUrl: `/courses/${c.courseId}/baseline-assessment`,
        priority: 1,
        badge: 'Required Before Start'
      });
    }

    // B. Required Quizzes Pending
    if ((c.status === 'in_progress' || c.status === 'completed') && c.pendingQuizzes.length > 0) {
      c.pendingQuizzes.forEach(q => {
        pendingActions.push({
          id: `pending_quiz_${q.quizId}`,
          type: 'lesson_quiz',
          courseId: c.courseId,
          courseTitle: c.courseTitle,
          quizId: q.quizId,
          title: `Pass Quiz: ${q.title}`,
          description: `Complete and pass this required quiz for ${c.courseTitle}.`,
          buttonText: 'Take Quiz',
          buttonUrl: `/courses/${c.courseId}/quiz/${q.quizId}`,
          priority: 4,
          badge: 'Quiz Required'
        });
      });
    }

    // C. Course In Progress Incomplete Lessons
    if (c.status === 'in_progress' && c.progressPercentage < 100) {
      const targetLessonId = c.resumeInfo?.targetLesson?.lessonId || '';
      const targetLessonTitle = c.resumeInfo?.targetLesson?.title || 'Next Lesson';
      pendingActions.push({
        id: `pending_lesson_${c.courseId}`,
        type: 'course_content',
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        title: `Resume: ${c.courseTitle}`,
        description: `Continue learning at ${targetLessonTitle} (${c.progressPercentage}% complete).`,
        buttonText: 'Continue Learning',
        buttonUrl: targetLessonId ? `/courses/${c.courseId}/learn/${targetLessonId}` : `/courses/${c.courseId}/learn`,
        priority: 3,
        badge: `${c.progressPercentage}% Complete`
      });
    }

    // D. Final Assessment Pending (Content 100% completed)
    if (c.status === 'completed' && c.afterAssessmentRequired && !c.afterAssessmentCompleted) {
      pendingActions.push({
        id: `pending_after_${c.courseId}`,
        type: 'after_assessment',
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        title: 'Final Reflection Assessment',
        description: `You finished all lessons for ${c.courseTitle}! Measure your post-training confidence.`,
        buttonText: 'Complete Final Assessment',
        buttonUrl: `/courses/${c.courseId}/after-assessment`,
        priority: 5,
        badge: 'Assessment Pending'
      });
    }

    // E. Beneficiary Feedback Pending
    if (
      c.status === 'completed' &&
      (!c.afterAssessmentRequired || c.afterAssessmentCompleted) &&
      !c.feedbackCompleted
    ) {
      pendingActions.push({
        id: `pending_feedback_${c.courseId}`,
        type: 'beneficiary_feedback',
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        title: 'Share Course Feedback',
        description: `Provide feedback on ${c.courseTitle} to help One Community Ely improve future training.`,
        buttonText: 'Give Feedback',
        buttonUrl: `/courses/${c.courseId}/feedback`,
        priority: 6,
        badge: 'Feedback Ready'
      });
    }

    // F. Certificate Ready to Issue
    if (
      c.status === 'completed' &&
      (!c.afterAssessmentRequired || c.afterAssessmentCompleted) &&
      c.feedbackCompleted &&
      !c.certificateIssued
    ) {
      pendingActions.push({
        id: `pending_cert_${c.courseId}`,
        type: 'certificate_ready',
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        title: 'Claim Your Certificate',
        description: `All requirements for ${c.courseTitle} are fulfilled! Issue your official certificate.`,
        buttonText: 'View & Issue Certificate',
        buttonUrl: `/courses/${c.courseId}/certificate`,
        priority: 7,
        badge: 'Certificate Ready'
      });
    }
  }

  // Sort pending actions by priority ascending (1 = highest)
  pendingActions.sort((a, b) => a.priority - b.priority);

  // 8. Compute Recommendations (excluding selected/completed)
  const recResult = computeCourseRecommendations(learningInterest, publishedCourses);
  let filteredRecs = (recResult.recommendations || []).filter(
    r => !selectedCourseIdSet.has(r.courseId)
  );

  // If no direct matches remain after filtering selected/completed courses, provide fallback published courses
  if (filteredRecs.length === 0) {
    const fallbackUnselected = publishedCourses.filter(
      c => c.status === 'published' && !selectedCourseIdSet.has(c.courseId)
    );
    filteredRecs = fallbackUnselected.map(c => ({
      ...c,
      recommendationReason: 'Popular community training course to expand your skills.',
      isFallback: true
    }));
  }
  filteredRecs = filteredRecs.slice(0, 3);

  // 9. Compute Exactly ONE Pinned Next Action based on strict priority
  let nextAction = null;

  // Priority 1: Required baseline assessment pending
  const baselinePendingItem = pendingActions.find(a => a.type === 'baseline_assessment');
  if (baselinePendingItem) {
    nextAction = baselinePendingItem;
  }

  // Priority 2: Selected course not started (and baseline is not pending)
  if (!nextAction && enrichedNotStarted.length > 0) {
    const readyNotStarted = enrichedNotStarted.find(c => !c.baselineRequired || c.baselineCompleted) || enrichedNotStarted[0];
    nextAction = {
      id: `next_start_${readyNotStarted.courseId}`,
      type: 'course_not_started',
      courseId: readyNotStarted.courseId,
      courseTitle: readyNotStarted.courseTitle,
      title: 'Start Your Selected Course',
      description: `You selected ${readyNotStarted.courseTitle}. Ready to begin your learning journey?`,
      buttonText: readyNotStarted.baselineRequired && !readyNotStarted.baselineCompleted ? 'Take Baseline Assessment' : 'Start Course',
      buttonUrl: readyNotStarted.baselineRequired && !readyNotStarted.baselineCompleted
        ? `/courses/${readyNotStarted.courseId}/baseline-assessment`
        : `/courses/${readyNotStarted.courseId}/learn`,
      priority: 2,
      badge: 'Ready to Start'
    };
  }

  // Priority 3: Continue last accessed course in progress (< 100% lessons)
  if (!nextAction && enrichedInProgress.length > 0) {
    const mostRecent = enrichedInProgress[0];
    const targetLessonId = mostRecent.resumeInfo?.targetLesson?.lessonId || '';
    const targetLessonTitle = mostRecent.resumeInfo?.targetLesson?.title || 'Next Lesson';

    const isLessonQuizPending = mostRecent.pendingQuizzes.some(q => q.lessonId && q.lessonId === targetLessonId);

    if (!isLessonQuizPending && mostRecent.progressPercentage < 100) {
      nextAction = {
        id: `next_continue_${mostRecent.courseId}`,
        type: 'continue_learning',
        courseId: mostRecent.courseId,
        courseTitle: mostRecent.courseTitle,
        title: `Continue ${mostRecent.courseTitle}`,
        description: `Pick up where you left off at ${targetLessonTitle} (${mostRecent.progressPercentage}% complete).`,
        buttonText: 'Continue Learning',
        buttonUrl: targetLessonId ? `/courses/${mostRecent.courseId}/learn/${targetLessonId}` : `/courses/${mostRecent.courseId}/learn`,
        priority: 3,
        badge: `${mostRecent.progressPercentage}% Complete`
      };
    }
  }

  // Priority 4: Required lesson or course quiz pending
  if (!nextAction) {
    const quizPendingCourse = enrichedCourses.find(c => c.pendingQuizzes.length > 0 && c.status !== 'not_started');
    if (quizPendingCourse) {
      const q = quizPendingCourse.pendingQuizzes[0];
      nextAction = {
        id: `next_quiz_${q.quizId}`,
        type: 'lesson_quiz',
        courseId: quizPendingCourse.courseId,
        courseTitle: quizPendingCourse.courseTitle,
        title: `Required Quiz: ${q.title}`,
        description: `Pass the quiz for ${quizPendingCourse.courseTitle} to unlock and complete your course requirements.`,
        buttonText: 'Take Quiz',
        buttonUrl: `/courses/${quizPendingCourse.courseId}/quiz/${q.quizId}`,
        priority: 4,
        badge: 'Quiz Required'
      };
    }
  }

  // Priority 5: Final assessment pending
  if (!nextAction) {
    const afterPending = pendingActions.find(a => a.type === 'after_assessment');
    if (afterPending) nextAction = afterPending;
  }

  // Priority 6: Beneficiary feedback pending
  if (!nextAction) {
    const fbPending = pendingActions.find(a => a.type === 'beneficiary_feedback');
    if (fbPending) nextAction = fbPending;
  }

  // Priority 7: Certificate ready
  if (!nextAction) {
    const certReady = pendingActions.find(a => a.type === 'certificate_ready');
    if (certReady) nextAction = certReady;
  }

  // Priority 8: Recommended next course
  if (!nextAction && filteredRecs.length > 0) {
    const topRec = filteredRecs[0];
    nextAction = {
      id: `next_rec_${topRec.courseId}`,
      type: 'recommended_course',
      courseId: topRec.courseId,
      courseTitle: topRec.title,
      title: `Recommended: ${topRec.title}`,
      description: topRec.recommendationReason || 'Tailored course recommendation based on your interests.',
      buttonText: 'View Course',
      buttonUrl: `/courses/${topRec.courseId}`,
      priority: 8,
      badge: 'Recommended'
    };
  }

  // Priority 9: Explore courses fallback
  if (!nextAction) {
    nextAction = {
      id: 'next_explore',
      type: 'explore_courses',
      title: 'Find Your Next Course',
      description: 'Explore our catalog of community training courses and build new skills today.',
      buttonText: 'Browse Courses',
      buttonUrl: '/course-recommendations',
      priority: 9,
      badge: 'Explore'
    };
  }

  // 10. Compute Genuine Data-Derived Achievements
  const achievements = [
    {
      id: 'first_course_started',
      title: 'First Course Started',
      description: 'Began your community learning path by enrolling in and starting a course.',
      unlocked: enrichedInProgress.length > 0 || enrichedCompleted.length > 0,
      icon: 'BookOpen'
    },
    {
      id: 'first_lesson_completed',
      title: 'First Lesson Completed',
      description: 'Finished your first online learning module lesson successfully.',
      unlocked: totalLessonsCompleted >= 1,
      icon: 'CheckCircle2'
    },
    {
      id: 'first_quiz_completed',
      title: 'First Quiz Completed',
      description: 'Submitted an educational quiz knowledge check.',
      unlocked: allQuizAttempts.length >= 1,
      icon: 'HelpCircle'
    },
    {
      id: 'quiz_passed',
      title: 'Quiz Passed',
      description: 'Scored a passing grade on an essential course quiz.',
      unlocked: quizzesPassedCount >= 1,
      icon: 'Award'
    },
    {
      id: 'course_completed',
      title: 'Course Completed',
      description: 'Reached 100% completion across all required course lessons.',
      unlocked: enrichedCompleted.length >= 1,
      icon: 'GraduationCap'
    },
    {
      id: 'final_assessment_completed',
      title: 'Final Assessment Completed',
      description: 'Measured your growth and post-training confidence with a final reflection.',
      unlocked: afterResponsesCount >= 1,
      icon: 'TrendingUp'
    },
    {
      id: 'feedback_submitted',
      title: 'Feedback Submitted',
      description: 'Shared your community training experience and testimonial consent choice.',
      unlocked: feedbackSubmissionsCount >= 1,
      icon: 'MessageSquare'
    },
    {
      id: 'first_certificate_earned',
      title: 'First Certificate Earned',
      description: 'Earned an official, verified Certificate of Completion from One Community Ely CIC.',
      unlocked: activeCertificates.length >= 1,
      icon: 'ShieldCheck'
    }
  ];

  // 11. Compute Sequential One-by-One Learning Journey
  // Order: 1. Course Started -> 2. First Lesson Completed -> 3. Next Quiz / Quiz Passed -> 4. Course Completed -> 5. Assessment Completed -> 6. Feedback Submitted -> 7. First Certificate Earned
  const activeCourse = enrichedInProgress[0] || enrichedNotStarted[0] || enrichedCompleted[0] || null;

  const s1_unlocked = enrichedInProgress.length > 0 || enrichedCompleted.length > 0;
  const s2_unlocked = s1_unlocked && totalLessonsCompleted >= 1;
  const s3_unlocked = s2_unlocked && quizzesPassedCount >= 1;
  const s4_unlocked = s3_unlocked && enrichedCompleted.length >= 1;
  const s5_unlocked = s4_unlocked && afterResponsesCount >= 1;
  const s6_unlocked = s5_unlocked && feedbackSubmissionsCount >= 1;
  const s7_unlocked = s6_unlocked && activeCertificates.length >= 1;

  let currentJourneyStep = 1;
  if (s1_unlocked) currentJourneyStep = 2;
  if (s2_unlocked) currentJourneyStep = 3;
  if (s3_unlocked) currentJourneyStep = 4;
  if (s4_unlocked) currentJourneyStep = 5;
  if (s5_unlocked) currentJourneyStep = 6;
  if (s6_unlocked) currentJourneyStep = 7;
  if (s7_unlocked) currentJourneyStep = 8; // All completed

  const learningJourney = [
    {
      step: 1,
      id: 'first_course_started',
      title: 'First Course Started',
      description: 'Choose a training course and begin your learning path.',
      unlocked: s1_unlocked,
      status: s1_unlocked ? 'completed' : (currentJourneyStep === 1 ? 'active' : 'locked'),
      actionText: 'Start a Course',
      actionUrl: '/course-recommendations'
    },
    {
      step: 2,
      id: 'first_lesson_completed',
      title: 'First Lesson Completed',
      description: 'Study and complete your very first course lesson.',
      unlocked: s2_unlocked,
      status: s2_unlocked ? 'completed' : (currentJourneyStep === 2 ? 'active' : 'locked'),
      actionText: 'Continue to First Lesson',
      actionUrl: activeCourse ? `/courses/${activeCourse.courseId}/learn` : '/course-recommendations'
    },
    {
      step: 3,
      id: 'next_quiz',
      title: 'Next Quiz & Knowledge Check',
      description: 'Pass the course quiz to test your practical understanding.',
      unlocked: s3_unlocked,
      status: s3_unlocked ? 'completed' : (currentJourneyStep === 3 ? 'active' : 'locked'),
      quizMismatchOrMissing: activeCourse ? activeCourse.quizMismatchOrMissing : false,
      quizRequestPending: activeCourse ? activeCourse.quizRequestPending : false,
      courseId: activeCourse?.courseId || null,
      courseTitle: activeCourse?.courseTitle || null,
      actionText: (activeCourse && activeCourse.quizMismatchOrMissing) ? 'Request Quiz from Admin' : 'Take Quiz',
      actionType: (activeCourse && activeCourse.quizMismatchOrMissing) ? 'request_quiz' : 'take_quiz',
      actionUrl: activeCourse?.pendingQuizzes?.[0]
        ? `/courses/${activeCourse.courseId}/quiz/${activeCourse.pendingQuizzes[0].quizId}`
        : (activeCourse ? `/courses/${activeCourse.courseId}/learn` : '/course-recommendations')
    },
    {
      step: 4,
      id: 'course_completed',
      title: 'Course Completed',
      description: 'Complete 100% of all required lessons in your course.',
      unlocked: s4_unlocked,
      status: s4_unlocked ? 'completed' : (currentJourneyStep === 4 ? 'active' : 'locked'),
      actionText: 'Complete Remaining Lessons',
      actionUrl: activeCourse ? `/courses/${activeCourse.courseId}/learn` : '/course-recommendations'
    },
    {
      step: 5,
      id: 'assessment',
      title: 'Post-Training Assessment',
      description: 'Measure your confidence growth in the final reflection assessment.',
      unlocked: s5_unlocked,
      status: s5_unlocked ? 'completed' : (currentJourneyStep === 5 ? 'active' : 'locked'),
      assessmentMismatchOrMissing: activeCourse ? activeCourse.assessmentMismatchOrMissing : false,
      assessmentRequestPending: activeCourse ? activeCourse.assessmentRequestPending : false,
      courseId: activeCourse?.courseId || null,
      courseTitle: activeCourse?.courseTitle || null,
      actionText: (activeCourse && activeCourse.assessmentMismatchOrMissing) ? 'Request Assessment from Admin' : 'Take Assessment',
      actionType: (activeCourse && activeCourse.assessmentMismatchOrMissing) ? 'request_assessment' : 'take_assessment',
      actionUrl: activeCourse ? `/courses/${activeCourse.courseId}/after-assessment` : '/course-recommendations'
    },
    {
      step: 6,
      id: 'feedback_submitted',
      title: 'Beneficiary Feedback',
      description: 'Share your feedback and testimonial consent to support community funding.',
      unlocked: s6_unlocked,
      status: s6_unlocked ? 'completed' : (currentJourneyStep === 6 ? 'active' : 'locked'),
      actionText: 'Give Course Feedback',
      actionUrl: activeCourse ? `/courses/${activeCourse.courseId}/feedback` : '/course-recommendations'
    },
    {
      step: 7,
      id: 'first_certificate_earned',
      title: 'First Certificate Earned',
      description: 'Receive your verified One Community Ely Certificate of Completion.',
      unlocked: s7_unlocked,
      status: s7_unlocked ? 'completed' : (currentJourneyStep === 7 ? 'active' : 'locked'),
      actionText: 'Claim Certificate',
      actionUrl: activeCourse ? `/courses/${activeCourse.courseId}/certificate` : '/dashboard'
    }
  ];

  // 12. Summary counts
  const summaryCounts = {
    selectedCount: all.length,
    inProgressCount: enrichedInProgress.length,
    completedCount: enrichedCompleted.length,
    certificatesCount: activeCertificates.length,
    lessonsCompletedCount: totalLessonsCompleted,
    quizzesPassedCount
  };

  const result = {
    success: true,
    learnerProfile: {
      name: displayName,
      email: cleanEmail,
      learningInterest
    },
    nextAction,
    summaryCounts,
    pendingActions,
    coursesInProgress: enrichedInProgress,
    coursesNotStarted: enrichedNotStarted,
    coursesCompleted: enrichedCompleted,
    certificates: activeCertificates,
    achievements,
    learningJourney,
    currentJourneyStep,
    recommendations: filteredRecs,
    generatedAt: new Date().toISOString()
  };

  dashboardCache.set(cleanEmail, { data: result, cachedAt: Date.now() });

  return result;
}

