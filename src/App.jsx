import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NetworkProvider } from './contexts/NetworkContext'
import GlobalNetworkIndicator from './components/GlobalNetworkIndicator'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import AdminLogin from './components/AdminLogin'
import Register from './components/Register'
import StateSelection from './components/StateSelection'
import MediumSelection from './components/MediumSelection'
import ProfileSetup from './components/ProfileSetup'
import Dashboard from './components/Dashboard'
import AIAssistant from './components/AIAssistant'
import SubjectPage from './components/SubjectPage'
import Quiz from './components/Quiz'
import GuideBooks from './components/GuideBooks'
import ClassSchedule from './components/LiveClasses/ClassSchedule'
import UploadRecording from './components/LiveClasses/UploadRecording'
import VideoPlayer from './components/LiveClasses/VideoPlayer'
import UploadBooks from './components/UploadBooks'
import ManageBooks from './components/ManageBooks'
import Videos from './components/Videos'
import UploadVideos from './components/UploadVideos'
import AdminPanel from './components/AdminPanel'
import AdminCourses from './components/AdminCourses'
import AdminCourseBuilder from './components/AdminCourseBuilder'
import AdminQuizzes from './components/AdminQuizzes'
import AdminBaselineAssessments from './components/AdminBaselineAssessments'
import AdminAfterAssessments from './components/AdminAfterAssessments'
import AdminBeneficiaryFeedback from './components/AdminBeneficiaryFeedback'
import AdminCertificates from './components/AdminCertificates'
import AdminImpactReports from './components/AdminImpactReports'
import PrintableImpactReport from './components/PrintableImpactReport'
import AdminEvidenceLibrary from './components/AdminEvidenceLibrary'
import LearnerQuizViewer from './components/LearnerQuizViewer'
import LearnerBaselineAssessment from './components/LearnerBaselineAssessment'
import LearnerAfterAssessment from './components/LearnerAfterAssessment'
import LearnerOutcomeComparison from './components/LearnerOutcomeComparison'
import LearnerBeneficiaryFeedback from './components/LearnerBeneficiaryFeedback'
import LearnerCertificateView from './components/LearnerCertificateView'
import PublicCertificateVerify from './components/PublicCertificateVerify'
import CourseRecommendations from './components/CourseRecommendations'
import CourseOverview from './components/CourseOverview'
import CoursePlayer from './components/CoursePlayer'
import AdminSettings from './components/AdminSettings'
import AdminRoute from './components/AdminRoute'
import MathCalculator from './components/MathCalculator'
import VisualizationHub from './components/VisualizationHub'
import SimplePDFViewer from './components/SimplePDFViewer'
import Settings from './components/Settings'
import VoiceEnabledChatbot from './components/VoiceEnabledChatbot'
import VoiceChatDemo from './pages/VoiceChatDemo'
import History from './components/History'
import AdminHistory from './components/AdminHistory'
import BookHistory from './components/BookHistory'
import QuizHistory from './components/QuizHistory'
import AIHistory from './components/AIHistory'
import DataMigration from './components/DataMigration'
import StudentDashboard from './pages/StudentDashboard'
import TeacherAssistant from './pages/TeacherAssistant'
import CareerRealitySimulator from './components/CareerRealitySimulator'
import HealthTracker from './components/HealthTracker'
import HealthAnalytics from './components/HealthAnalytics'
import AutoHealthTracker from './components/AutoHealthTracker'
import DisciplineDashboard from './components/discipline/DisciplineDashboard'
import DecisionConsequenceSimulator from './components/discipline/DecisionConsequenceSimulator'
import DisciplineStreakTracker from './components/discipline/DisciplineStreakTracker'
import FocusScoreMeter from './components/discipline/FocusScoreMeter'
import DelayedGratificationTrainer from './components/discipline/DelayedGratificationTrainer'
import AutomationNotifications from './components/discipline/AutomationNotifications'
import UserActivityHistory from './components/UserActivityHistory'
import CustomerSupportWidget from './components/CustomerSupportWidget'
import { useDisciplineAutomation } from './hooks/useDisciplineAutomation'

// Wrapper component
function AppContent() {
  return (
    <>
      <GlobalNetworkIndicator />
      <CustomerSupportWidget />
      <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/state-selection" element={<StateSelection />} />
            <Route path="/medium-selection" element={<MediumSelection />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/subject/:subjectName" element={<SubjectPage />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:subjectName" element={<Quiz />} />
            <Route path="/guide-books" element={<GuideBooks />} />
            <Route path="/live-classes" element={<ClassSchedule />} />
            <Route path="/upload-recording" element={<UploadRecording />} />
            <Route path="/watch-recording/*" element={<VideoPlayer />} />
            <Route path="/book-viewer/:bookId" element={<SimplePDFViewer />} />
            <Route path="/upload-books" element={<UploadBooks />} />
            <Route path="/manage-books" element={<ManageBooks />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/upload-videos" element={<UploadVideos />} />
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="/admin-panel" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
            <Route path="/admin-courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
            <Route path="/admin/courses/:courseId/content" element={<AdminRoute><AdminCourseBuilder /></AdminRoute>} />
            <Route path="/admin/quizzes" element={<AdminRoute><AdminQuizzes /></AdminRoute>} />
            <Route path="/admin-quizzes" element={<AdminRoute><AdminQuizzes /></AdminRoute>} />
            <Route path="/admin/baseline-assessments" element={<AdminRoute><AdminBaselineAssessments /></AdminRoute>} />
            <Route path="/admin-baseline-assessments" element={<AdminRoute><AdminBaselineAssessments /></AdminRoute>} />
            <Route path="/admin/after-assessments" element={<AdminRoute><AdminAfterAssessments /></AdminRoute>} />
            <Route path="/admin-after-assessments" element={<AdminRoute><AdminAfterAssessments /></AdminRoute>} />
            <Route path="/admin/beneficiary-feedback" element={<AdminRoute><AdminBeneficiaryFeedback /></AdminRoute>} />
            <Route path="/admin-beneficiary-feedback" element={<AdminRoute><AdminBeneficiaryFeedback /></AdminRoute>} />
            <Route path="/admin/certificates" element={<AdminRoute><AdminCertificates /></AdminRoute>} />
            <Route path="/admin-certificates" element={<AdminRoute><AdminCertificates /></AdminRoute>} />
            <Route path="/admin/impact-reports" element={<AdminRoute><AdminImpactReports /></AdminRoute>} />
            <Route path="/admin-impact-reports" element={<AdminRoute><AdminImpactReports /></AdminRoute>} />
            <Route path="/admin/impact-reports/print" element={<AdminRoute><PrintableImpactReport /></AdminRoute>} />
            <Route path="/admin/evidence" element={<AdminRoute><AdminEvidenceLibrary /></AdminRoute>} />
            <Route path="/admin-evidence" element={<AdminRoute><AdminEvidenceLibrary /></AdminRoute>} />
            <Route path="/take-quiz/:quizId" element={<LearnerQuizViewer />} />
            <Route path="/course/:courseId/quiz/:quizId" element={<LearnerQuizViewer />} />
            <Route path="/courses/:courseId/quiz/:quizId" element={<LearnerQuizViewer />} />
            <Route path="/courses/:courseId/quizzes/:quizId" element={<LearnerQuizViewer />} />
            <Route path="/courses/:courseId/baseline-assessment" element={<LearnerBaselineAssessment />} />
            <Route path="/courses/:courseId/after-assessment" element={<LearnerAfterAssessment />} />
            <Route path="/courses/:courseId/outcome-comparison" element={<LearnerOutcomeComparison />} />
            <Route path="/courses/:courseId/feedback" element={<LearnerBeneficiaryFeedback />} />
            <Route path="/courses/:courseId/certificate" element={<LearnerCertificateView />} />
            <Route path="/certificates/:certificateId" element={<LearnerCertificateView />} />
            <Route path="/verify/:certificateNumber" element={<PublicCertificateVerify />} />
            <Route path="/verify" element={<PublicCertificateVerify />} />
            <Route path="/course-recommendations" element={<CourseRecommendations />} />
            <Route path="/courses/:courseId" element={<CourseOverview />} />
            <Route path="/courses/:courseId/learn" element={<CoursePlayer />} />
            <Route path="/courses/:courseId/learn/:lessonId" element={<CoursePlayer />} />
            <Route path="/admin-settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/history" element={<AdminRoute><AdminHistory /></AdminRoute>} />
            <Route path="/admin-history" element={<AdminRoute><AdminHistory /></AdminRoute>} />
            <Route path="/math-calculator" element={<MathCalculator />} />
            <Route path="/visualizations" element={<VisualizationHub />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/voice-chat" element={<VoiceChatDemo />} />
            <Route path="/voice-assistant" element={<VoiceEnabledChatbot />} />
            <Route path="/history" element={<History />} />
            <Route path="/book-history" element={<BookHistory />} />
            <Route path="/quiz-history" element={<QuizHistory />} />
            <Route path="/ai-history" element={<AIHistory />} />
            <Route path="/data-migration" element={<DataMigration />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/teacher-assistant" element={<TeacherAssistant />} />
            <Route path="/career-simulator" element={<CareerRealitySimulator />} />
            <Route path="/health-tracker" element={<HealthTracker />} />
            <Route path="/auto-health-tracker" element={<AutoHealthTracker />} />
            <Route path="/health-analytics" element={<HealthAnalytics />} />
            <Route path="/discipline" element={<DisciplineDashboard />} />
            <Route path="/discipline/decision-simulator" element={<DecisionConsequenceSimulator />} />
            <Route path="/discipline/streak-tracker" element={<DisciplineStreakTracker />} />
            <Route path="/discipline/focus-meter" element={<FocusScoreMeter />} />
            <Route path="/discipline/rewards" element={<DelayedGratificationTrainer />} />
            <Route path="/activity-history" element={<UserActivityHistory />} />
          </Routes>
        </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <Router>
          <AppContent />
        </Router>
      </NetworkProvider>
    </AuthProvider>
  );
}

export default App