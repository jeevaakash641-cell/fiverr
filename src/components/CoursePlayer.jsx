import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchCourseOverview } from '../services/recommendationService';
import { fetchLearnerQuizzes } from '../services/quizService';
import {
  fetchCourseProgress,
  recordLessonVisit,
  completeLesson,
  fetchCourseResume
} from '../services/progressService';
import { fetchCourseAfterEligibility } from '../services/afterAssessmentService';
import {
  BookOpen, Layers, CheckCircle2, Circle, ArrowLeft, ArrowRight,
  Video, Paperclip, ChevronLeft, ChevronRight, Menu, X,
  Award, HelpCircle, Zap, RefreshCw, AlertCircle, Sparkles, Check, Inbox
} from 'lucide-react';
import ContentRequestModal from './ContentRequestModal';

const CoursePlayer = () => {
  const { courseId, lessonId: paramLessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState(null);
  const [modules, setModules] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  const [progress, setProgress] = useState(null);
  const [lessonQuizzes, setLessonQuizzes] = useState([]);
  const [allCourseQuizzes, setAllCourseQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [quizNotice, setQuizNotice] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [afterAssessmentInfo, setAfterAssessmentInfo] = useState(null);
  const [requestModalState, setRequestModalState] = useState({
    isOpen: false,
    courseId: '',
    courseTitle: '',
    requestType: 'quiz'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadCourseHierarchy();
  }, [user, courseId]);

  useEffect(() => {
    if (allLessons.length > 0) {
      let target = null;
      if (paramLessonId) {
        target = allLessons.find(l => l.lessonId === paramLessonId);
      }
      if (!target && progress?.lastVisitedLessonId) {
        target = allLessons.find(l => l.lessonId === progress.lastVisitedLessonId);
      }
      if (!target) {
        target = allLessons[0];
      }

      if (target) {
        setCurrentLesson(target);
        const mod = modules.find(m => m.moduleId === target.moduleId) || null;
        setCurrentModule(mod);
        loadLessonQuizzes(target.lessonId);

        recordLessonVisit(courseId, target.lessonId, mod?.moduleId, user)
          .then(updated => {
            if (updated) setProgress(updated);
          })
          .catch(err => console.warn('Could not record lesson visit:', err.message));
      }
    }
  }, [paramLessonId, allLessons]);

  const loadCourseHierarchy = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [overviewData, progData, quizzes] = await Promise.all([
        fetchCourseOverview(courseId),
        fetchCourseProgress(courseId, user).catch(() => null),
        fetchLearnerQuizzes({ courseId }, user).catch(() => [])
      ]);

      if (!overviewData || !overviewData.course) {
        setErrorMessage('Course could not be loaded or is not published.');
        setLoading(false);
        return;
      }

      setCourseData(overviewData.course);
      setAllCourseQuizzes(quizzes || []);

      const mods = overviewData.modules || [];
      setModules(mods);

      const flatLessons = [];
      mods.forEach(m => {
        (m.lessons || []).forEach(l => {
          flatLessons.push({ ...l, moduleId: m.moduleId, moduleTitle: m.title });
        });
      });
      setAllLessons(flatLessons);
      setProgress(progData);

      if (progData?.progressPercentage === 100) {
        setShowCelebration(true);
        fetchCourseAfterEligibility(courseId, user)
          .then(info => setAfterAssessmentInfo(info))
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load course player:', err);
      setErrorMessage(err.message || 'Error loading course content');
    } finally {
      setLoading(false);
    }
  };

  const loadLessonQuizzes = (lessonId) => {
    if (!lessonId || !allCourseQuizzes) {
      setLessonQuizzes([]);
      return;
    }
    const filtered = allCourseQuizzes.filter(q => q.lessonId === lessonId);
    setLessonQuizzes(filtered);
    setQuizNotice(null);
  };

  const handleSelectLesson = (lesson) => {
    if (!lesson) return;
    setSidebarOpen(false);
    navigate('/courses/' + courseId + '/learn/' + lesson.lessonId);
  };

  const handleCompleteLesson = async () => {
    if (!currentLesson || completing) return;
    setCompleting(true);
    setQuizNotice(null);

    try {
      const res = await completeLesson(courseId, currentLesson.lessonId, user);
      if (res && res.progress) {
        setProgress(res.progress);
        if (res.isCourseCompleted) {
          setShowCelebration(true);
          fetchCourseAfterEligibility(courseId, user)
            .then(info => setAfterAssessmentInfo(info))
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to complete lesson:', err);
      if (err.quizRequired || err.data?.quizRequired) {
        setQuizNotice({
          message: err.message,
          quiz: err.incompleteQuiz || err.data?.incompleteQuiz
        });
      } else {
        alert(err.message || 'Failed to mark lesson complete');
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleNextLesson = () => {
    if (!currentLesson || allLessons.length === 0) return;
    const currentIndex = allLessons.findIndex(l => l.lessonId === currentLesson.lessonId);
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      handleSelectLesson(allLessons[currentIndex + 1]);
    }
  };

  const handlePrevLesson = () => {
    if (!currentLesson || allLessons.length === 0) return;
    const currentIndex = allLessons.findIndex(l => l.lessonId === currentLesson.lessonId);
    if (currentIndex > 0) {
      handleSelectLesson(allLessons[currentIndex - 1]);
    }
  };

  const completedLessonIds = progress?.completedLessonIds || [];
  const isCurrentCompleted = currentLesson ? completedLessonIds.includes(currentLesson.lessonId) : false;
  const progressPercentage = progress?.progressPercentage ?? 0;
  const completedCount = completedLessonIds.length;
  const totalCount = allLessons.length;

  const currentLessonIndex = currentLesson ? allLessons.findIndex(l => l.lessonId === currentLesson.lessonId) : -1;
  const hasNext = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1;
  const hasPrev = currentLessonIndex > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="p-8 bg-white rounded-2xl shadow-xs border border-gray-200 text-center max-w-sm w-full">
          <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800">Loading lesson content...</p>
          <p className="text-xs text-gray-500 mt-1">Fetching your learning progress and resources.</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !courseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="p-8 bg-white rounded-2xl shadow-xs border border-gray-200 text-center max-w-md w-full">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Content Unavailable</h2>
          <p className="text-xs text-gray-600 mb-6">{errorMessage || 'Course content could not be accessed.'}</p>
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-[#23735F] text-white text-xs font-bold hover:bg-[#185243] inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
              title="Toggle Curriculum Outline"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link
              to={'/courses/' + courseId}
              className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Back to Course Overview"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </Link>

            <div className="h-4 w-[1px] bg-gray-200 hidden sm:block"></div>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                {courseData.title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate hidden sm:block">
                {currentModule?.title || 'Learning Modules'}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-gray-900">
                {completedCount} of {totalCount} Completed
              </div>
              <div className="text-[11px] text-gray-500 font-semibold">
                {progressPercentage}% Progress
              </div>
            </div>

            <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#23735F] h-2.5 rounded-full transition-all duration-500"
                style={{ width: progressPercentage + '%' }}
              ></div>
            </div>

            <span className="text-xs font-extrabold text-[#23735F] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {progressPercentage}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex overflow-hidden">
        {/* Left Sidebar (Syllabus / Modules) */}
        <aside
          className={'fixed lg:static inset-y-16 lg:inset-y-0 left-0 z-20 w-72 sm:w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out ' +
            (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
              <Layers className="h-4 w-4 text-[#23735F]" />
              <span>Course Curriculum</span>
            </div>
            <span className="text-[11px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
              {totalCount} Lessons
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-2">
            {modules.map((mod, mIdx) => (
              <div key={mod.moduleId} className="pt-2">
                <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                  <span className="truncate">Module {mIdx + 1}: {mod.title}</span>
                  <span className="text-[10px] text-gray-400">{(mod.lessons || []).length}</span>
                </div>

                <div className="space-y-1 mt-1">
                  {(mod.lessons || []).map((les, lIdx) => {
                    const isCurrent = currentLesson?.lessonId === les.lessonId;
                    const isDone = completedLessonIds.includes(les.lessonId);
                    const hasQuiz = allCourseQuizzes.some(q => q.lessonId === les.lessonId);

                    return (
                      <button
                        key={les.lessonId}
                        onClick={() => handleSelectLesson(les)}
                        className={'w-full text-left p-2.5 rounded-xl text-xs flex items-start gap-2.5 transition-all cursor-pointer ' +
                          (isCurrent
                            ? 'bg-[#23735F] text-white font-bold shadow-xs'
                            : isDone
                            ? 'bg-emerald-50/60 text-emerald-950 hover:bg-emerald-100/60'
                            : 'text-gray-700 hover:bg-gray-100')}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isDone ? (
                            <CheckCircle2 className={'h-4 w-4 ' + (isCurrent ? 'text-white' : 'text-emerald-600')} />
                          ) : isCurrent ? (
                            <div className="h-4 w-4 rounded-full border-2 border-white flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                            </div>
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold leading-snug">
                            {mIdx + 1}.{lIdx + 1} {les.title}
                          </div>
                          <div className={'flex items-center gap-2 text-[10px] mt-0.5 ' + (isCurrent ? 'text-white/80' : 'text-gray-400')}>
                            <span>{les.estimatedMinutes || 15}m</span>
                            {hasQuiz && (
                              <span className={'inline-flex items-center gap-0.5 px-1 rounded font-bold ' + (isCurrent ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800')}>
                                <HelpCircle className="h-2.5 w-2.5" /> Quiz
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {allCourseQuizzes.length > 0 && (
              <div className="pt-4 p-2">
                <div className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-purple-700" />
                  <span>Course Assessments</span>
                </div>
                <div className="space-y-1 mt-1">
                  {allCourseQuizzes.map(quiz => (
                    <Link
                      key={quiz.quizId}
                      to={'/course/' + courseId + '/quiz/' + quiz.quizId}
                      className="w-full text-left p-2 rounded-lg text-xs bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/60 text-purple-950 flex items-center justify-between transition-colors block text-decoration-none"
                    >
                      <span className="truncate font-bold">{quiz.title}</span>
                      <span className="text-[10px] font-bold text-[#23735F] shrink-0 ml-2">Pass: {quiz.passingScore}%</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Content Request Options */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-1.5 mt-auto">
              <span className="text-[10px] font-black uppercase text-gray-500 block">Content Missing?</span>
              <button
                type="button"
                onClick={() => setRequestModalState({
                  isOpen: true,
                  courseId,
                  courseTitle: courseData?.title || courseId,
                  requestType: 'quiz'
                })}
                className="w-full text-left py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Request Quiz from Admin</span>
                <HelpCircle className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setRequestModalState({
                  isOpen: true,
                  courseId,
                  courseTitle: courseData?.title || courseId,
                  requestType: 'assessment'
                })}
                className="w-full text-left py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Request Assessment from Admin</span>
                <Award className="h-3 w-3" />
              </button>
            </div>
          </div>
        </aside>

        {/* Central Lesson Content Area */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto">
          {showCelebration && (
            <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-6 w-6 text-amber-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold">Congratulations! Course Completed! 🎉</h2>
                    <p className="text-xs text-white/90 mt-0.5">
                      You have completed all required lessons and assessments for {courseData.title}.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {afterAssessmentInfo?.hasAssessment ? (
                    afterAssessmentInfo?.completed ? (
                      <Link
                        to={`/courses/${courseId}/outcome-comparison`}
                        className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-colors shrink-0 shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>View Outcome Comparison</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/courses/${courseId}/after-assessment`}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-black text-xs transition-colors shrink-0 shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Award className="h-3.5 w-3.5 text-gray-900" />
                        <span>Complete Final Assessment</span>
                      </Link>
                    )
                  ) : null}
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors shrink-0"
                  >
                    View My Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}

          {currentLesson ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="pb-4 border-b border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#23735F] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                    {currentModule?.title || 'Course Lesson'}
                  </span>

                  <div className="flex items-center gap-2">
                    {isCurrentCompleted && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
                        <Check className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-medium">
                      🕒 {currentLesson.estimatedMinutes || 15} min duration
                    </span>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                  {currentLesson.title}
                </h2>

                {currentLesson.shortDescription && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {currentLesson.shortDescription}
                  </p>
                )}
              </div>

              {currentLesson.videoUrl && (
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black aspect-video shadow-xs">
                  <iframe
                    src={currentLesson.videoUrl.replace('watch?v=', 'embed/')}
                    title={currentLesson.title}
                    className="w-full h-full border-0"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <article className="prose prose-sm sm:prose max-w-none text-gray-800 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs leading-relaxed space-y-4">
                {currentLesson.content ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                    className="lesson-rich-content"
                  />
                ) : (
                  <p className="text-gray-500 italic">No detailed notes published for this lesson yet.</p>
                )}
              </article>

              {Array.isArray(currentLesson.attachedResources) && currentLesson.attachedResources.length > 0 && (
                <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-[#23735F]" />
                    <span>Lesson Resources & Downloads</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentLesson.attachedResources.map((res, idx) => (
                      <a
                        key={idx}
                        href={res.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs font-semibold text-gray-800 transition-colors"
                      >
                        <span className="truncate">{res.name || ('Resource ' + (idx + 1))}</span>
                        <span className="text-[10px] text-[#23735F] font-bold uppercase shrink-0 ml-2">Download</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {quizNotice && (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">Assessment Prerequisite Required</h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">{quizNotice.message}</p>
                    </div>
                  </div>

                  {quizNotice.quiz && (
                    <div className="pt-2 flex justify-end">
                      <Link
                        to={'/course/' + courseId + '/quiz/' + quizNotice.quiz.quizId}
                        className="px-4 py-2 rounded-lg bg-[#23735F] text-white text-xs font-bold hover:bg-[#185243] inline-flex items-center gap-2"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Take "{quizNotice.quiz.title}"</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {lessonQuizzes.length > 0 && (
                <div className="p-5 bg-purple-50/60 rounded-2xl border border-purple-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-purple-700" />
                      <span>Lesson Knowledge Check</span>
                    </h3>
                    <span className="text-[11px] font-bold text-purple-700">
                      {lessonQuizzes.length} Required Quiz{lessonQuizzes.length > 1 ? 'zes' : ''}
                    </span>
                  </div>

                  {lessonQuizzes.map(quiz => (
                    <div
                      key={quiz.quizId}
                      className="p-4 rounded-xl bg-white border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{quiz.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {quiz.questionCount || 5} Questions • Minimum Passing Score: {quiz.passingScore}%
                        </p>
                      </div>

                      <Link
                        to={'/course/' + courseId + '/quiz/' + quiz.quizId}
                        className="px-4 py-2 rounded-lg bg-[#23735F] hover:bg-[#185243] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Start Assessment</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handlePrevLesson}
                  disabled={!hasPrev}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous Lesson</span>
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    onClick={handleCompleteLesson}
                    disabled={completing}
                    className={'w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs ' +
                      (isCurrentCompleted
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                        : 'bg-[#23735F] text-white hover:bg-[#185243]')}
                  >
                    {completing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : isCurrentCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{isCurrentCompleted ? 'Completed ✓' : 'Mark as Complete'}</span>
                  </button>

                  {hasNext && (
                    <button
                      onClick={handleNextLesson}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Next Lesson</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Select a lesson from the curriculum outline to start.</p>
            </div>
          )}
        </main>
      </div>

      {/* Content Request Modal */}
      <ContentRequestModal
        isOpen={requestModalState.isOpen}
        onClose={() => setRequestModalState(prev => ({ ...prev, isOpen: false }))}
        courseId={requestModalState.courseId}
        courseTitle={requestModalState.courseTitle}
        requestType={requestModalState.requestType}
        onSuccess={() => alert('Your content request has been sent to the admin.')}
      />
    </div>
  );
};

export default CoursePlayer;