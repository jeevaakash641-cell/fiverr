import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCourseCertificateEligibility,
  issueCourseCertificate,
  fetchCertificateById,
  downloadCertificatePdf,
  fetchCertificateTemplate
} from '../services/certificateService';
import { fetchCourseById } from '../services/courseService';
import {
  Award, ArrowLeft, Download, CheckCircle2, AlertCircle,
  RefreshCw, BookOpen, ExternalLink, ShieldCheck, ShieldAlert,
  Calendar, Check, User, Clock, LayoutDashboard, Sparkles, Image
} from 'lucide-react';

const LearnerCertificateView = () => {
  const { courseId, certificateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [template, setTemplate] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [error, setError] = useState(null);

  const effectiveCourseId = courseId || certificate?.courseId;

  const learnerName = certificate?.learnerNameSnapshot || user?.name || 'Community Learner';
  const courseTitle = certificate?.courseTitleSnapshot || course?.title || 'Training Course';
  const completionFormatted = new Date(
    certificate?.courseCompletionDate || certificate?.issuedAt || new Date()
  ).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const dynamicCertificateName = `Certificate - ${learnerName} - ${courseTitle} - ${completionFormatted}`;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tmplPromise = fetchCertificateTemplate(user).catch(() => null);

      if (certificateId) {
        const [cert, tmpl] = await Promise.all([
          fetchCertificateById(certificateId, user),
          tmplPromise
        ]);
        setCertificate(cert);
        setTemplate(tmpl);
        if (cert?.courseId) {
          const c = await fetchCourseById(cert.courseId).catch(() => null);
          setCourse(c);
        }
      } else if (courseId) {
        const [c, elig, tmpl] = await Promise.all([
          fetchCourseById(courseId).catch(() => null),
          fetchCourseCertificateEligibility(courseId, user),
          tmplPromise
        ]);
        setCourse(c);
        setEligibility(elig);
        setTemplate(tmpl);
        if (elig.alreadyIssued && elig.certificate) {
          setCertificate(elig.certificate);
        }
      }
    } catch (err) {
      console.error('Failed to load certificate:', err);
      setError(err.message || 'Failed to load certificate details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId, certificateId, user]);

  const handleIssue = async () => {
    setIssuing(true);
    setError(null);
    try {
      const res = await issueCourseCertificate(effectiveCourseId, user);
      if (res && res.success) {
        setCertificate(res.certificate);
      }
    } catch (err) {
      setError(err.message || 'Failed to issue certificate.');
    } finally {
      setIssuing(false);
    }
  };

  const handleDownload = async () => {
    if (!certificate) return;
    setDownloading(true);
    try {
      await downloadCertificatePdf(
        certificate.certificateId,
        dynamicCertificateName,
        user
      );
    } catch (err) {
      setError(err.message || 'Failed to download certificate PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!certificate) return;
    setDownloadingImage(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1131; // A4 Landscape ratio
      const ctx = canvas.getContext('2d');

      // Draw custom template background if uploaded
      if (template?.hasCustomTemplate && template?.dataUrl && template?.templateType === 'image') {
        const bgImg = new window.Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          bgImg.onload = res;
          bgImg.onerror = rej;
          bgImg.src = template.dataUrl;
        });
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      } else {
        // High-res luxury default template
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#fbfdfc');
        grad.addColorStop(1, '#f3f8f6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Elegant double borders
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#23735F';
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#D97706';
        ctx.strokeRect(58, 58, canvas.width - 116, canvas.height - 116);

        // Org Header
        ctx.fillStyle = '#23735F';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ONE COMMUNITY ELY ONLINE TRAINING CENTRE', canvas.width / 2, 130);

        ctx.fillStyle = '#6B7280';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText('Empowering Adult Community Learning in Ely, Cardiff, Wales (CF5)', canvas.width / 2, 168);

        // Title
        ctx.fillStyle = '#111827';
        ctx.font = '900 52px Outfit, Inter, sans-serif';
        ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 260);

        // Divider
        ctx.beginPath();
        ctx.moveTo((canvas.width / 2) - 150, 290);
        ctx.lineTo((canvas.width / 2) + 150, 290);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#23735F';
        ctx.stroke();

        ctx.fillStyle = '#4B5563';
        ctx.font = '24px Inter, sans-serif';
        ctx.fillText('This is to proudly certify that', canvas.width / 2, 360);
      }

      // Dynamic User Name
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1E3A8A';
      ctx.font = '900 56px Outfit, Inter, sans-serif';
      ctx.fillText(learnerName.toUpperCase(), canvas.width / 2, 450);

      // Subtitle
      ctx.fillStyle = '#4B5563';
      ctx.font = '24px Inter, sans-serif';
      ctx.fillText('has successfully completed all required training modules and assessments for', canvas.width / 2, 530);

      // Course Name
      ctx.fillStyle = '#23735F';
      ctx.font = '900 44px Outfit, Inter, sans-serif';
      ctx.fillText(courseTitle, canvas.width / 2, 600);

      // Completed Date
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillText(`Completed on: ${completionFormatted}`, canvas.width / 2, 680);

      // Verification footer
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`Cert No: ${certificate?.certificateNumber}  •  Verify: onecommunityely.com/verify/${certificate?.certificateNumber}`, canvas.width / 2, canvas.height - 70);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${dynamicCertificateName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to download image:', err);
      setError('Failed to download certificate image.');
    } finally {
      setDownloadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-700">Verifying certificate status...</p>
        </div>
      </div>
    );
  }

  // If learner is not eligible yet
  if (!certificate && eligibility && !eligibility.eligible) {
    const reqs = eligibility.requirements || {};

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
              <Award className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Certificate Requirements Pending</h1>
            <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
              To earn your official Certificate of Completion for <strong>{course?.title || 'this course'}</strong>, please complete all requirements below:
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-3 pt-2">
            {/* 1. Lessons */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              reqs.courseCompleted ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                {reqs.courseCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold">1. Complete All Lessons (100%)</p>
                  <p className="text-[11px] opacity-80">
                    {reqs.courseCompleted ? 'All published lessons completed' : `${reqs.completedLessons || 0} of ${reqs.totalLessons || 0} lessons finished`}
                  </p>
                </div>
              </div>
              {!reqs.courseCompleted && (
                <Link
                  to={`/courses/${effectiveCourseId}/learn`}
                  className="px-3 py-1.5 bg-[#23735F] text-white text-[11px] font-bold rounded-lg hover:bg-[#1b5b4b]"
                >
                  Resume
                </Link>
              )}
            </div>

            {/* 2. Quizzes */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              reqs.quizzesPassed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                {reqs.quizzesPassed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold">2. Pass Required Quizzes</p>
                  <p className="text-[11px] opacity-80">
                    {reqs.quizzesPassed ? 'All course quizzes passed' : `Pending: ${(reqs.pendingQuizzes || []).join(', ') || 'Quiz incomplete'}`}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. After Assessment */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              reqs.afterAssessmentCompleted ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                {reqs.afterAssessmentCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold">3. Final Reflection Assessment</p>
                  <p className="text-[11px] opacity-80">
                    {reqs.afterAssessmentCompleted ? 'Submitted' : 'Measure your post-training confidence'}
                  </p>
                </div>
              </div>
              {!reqs.afterAssessmentCompleted && reqs.courseCompleted && (
                <Link
                  to={`/courses/${effectiveCourseId}/after-assessment`}
                  className="px-3 py-1.5 bg-amber-500 text-white text-[11px] font-bold rounded-lg hover:bg-amber-600"
                >
                  Take
                </Link>
              )}
            </div>

            {/* 4. Feedback */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              reqs.feedbackSubmitted ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                {reqs.feedbackSubmitted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold">4. Beneficiary Feedback</p>
                  <p className="text-[11px] opacity-80">
                    {reqs.feedbackSubmitted ? 'Submitted' : 'Share your training experience & consent choice'}
                  </p>
                </div>
              </div>
              {!reqs.feedbackSubmitted && reqs.afterAssessmentCompleted && (
                <Link
                  to={`/courses/${effectiveCourseId}/feedback`}
                  className="px-3 py-1.5 bg-amber-500 text-white text-[11px] font-bold rounded-lg hover:bg-amber-600"
                >
                  Submit
                </Link>
              )}
            </div>
          </div>

          <div className="pt-2 text-center">
            <Link
              to="/dashboard"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If eligible but not yet issued: show 1-click issue prompt
  if (!certificate && eligibility?.eligible) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 p-8 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-[#23735F]">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-gray-900">Congratulations!</h1>
            <p className="text-xs text-gray-600 leading-relaxed">
              You have completed all lessons, assessments, and feedback for <strong>{course?.title || 'your course'}</strong>.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleIssue}
            disabled={issuing}
            className="w-full py-3 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {issuing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            <span>Issue My Certificate</span>
          </button>

          <Link
            to="/dashboard"
            className="text-xs font-bold text-gray-500 hover:text-gray-900 inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Certificate Display
  const isRevoked = certificate?.status === 'revoked';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>My Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            {isRevoked ? (
              <span className="text-xs font-black text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>REVOKED</span>
              </span>
            ) : (
              <span className="text-xs font-extrabold text-[#23735F] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#23735F]" />
                <span>Official Certificate</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Celebration Banner */}
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#23735F] text-[11px] font-extrabold uppercase tracking-wider">
              <Award className="h-3.5 w-3.5" />
              <span>Official Certificate Issued</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 leading-snug break-words">
              {dynamicCertificateName}
            </h1>
            <p className="text-xs text-gray-500">
              Personalized for <strong className="text-gray-800">{learnerName}</strong> on completing <strong className="text-gray-800">{courseTitle}</strong> on {completionFormatted}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center shrink-0">
            <button
              onClick={handleDownload}
              disabled={downloading || isRevoked}
              className="px-4 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-black rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Download Certificate as PDF"
            >
              {downloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={downloadingImage || isRevoked}
              className="px-4 py-2.5 bg-emerald-50 border border-emerald-300 text-[#23735F] hover:bg-emerald-100 text-xs font-black rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Download Certificate as PNG Image"
            >
              {downloadingImage ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              <span>Download Image (PNG)</span>
            </button>
            <Link
              to={`/verify/${certificate?.certificateNumber}`}
              target="_blank"
              className="px-3 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Verify</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold">
            {error}
          </div>
        )}

        {/* Certificate Landscape Card Simulation */}
        <div className="relative rounded-3xl border-4 border-[#23735F] p-8 sm:p-12 shadow-2xl overflow-hidden text-center min-h-[500px] flex flex-col justify-between aspect-[16/11] bg-white">
          {/* Custom Template Background if uploaded by Admin */}
          {template?.hasCustomTemplate && template?.dataUrl && template?.templateType === 'image' ? (
            <img
              src={template.dataUrl}
              alt="Admin Certificate Demo Template"
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
          ) : (
            <>
              {/* Luxury default One Community Ely background */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40 z-0" />
              {/* Inner Decorative Gold Border */}
              <div className="absolute inset-3.5 border-2 border-amber-600/70 rounded-2xl pointer-events-none z-10" />
              {/* Corner accents */}
              <div className="absolute top-3.5 left-3.5 w-8 h-8 border-t-4 border-l-4 border-[#23735F] pointer-events-none z-10" />
              <div className="absolute top-3.5 right-3.5 w-8 h-8 border-t-4 border-r-4 border-[#23735F] pointer-events-none z-10" />
              <div className="absolute bottom-3.5 left-3.5 w-8 h-8 border-b-4 border-l-4 border-[#23735F] pointer-events-none z-10" />
              <div className="absolute bottom-3.5 right-3.5 w-8 h-8 border-b-4 border-r-4 border-[#23735F] pointer-events-none z-10" />
            </>
          )}

          {/* Revoked watermark */}
          {isRevoked && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 z-30 pointer-events-none">
              <div className="transform -rotate-12 border-8 border-red-600 text-red-600 font-black text-5xl sm:text-7xl uppercase px-8 py-4 tracking-widest opacity-80">
                REVOKED
              </div>
            </div>
          )}

          {/* Template Badge */}
          {template?.hasCustomTemplate && (
            <div className="absolute top-4 left-4 z-20">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/80 text-white text-[10px] font-bold backdrop-blur-xs shadow-xs">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>Custom Template: {template.fileName}</span>
              </span>
            </div>
          )}

          {/* Dynamic Content Overlay (Frosted backdrop elements ensure legibility on any template background) */}
          <div className="relative z-20 flex flex-col justify-between h-full space-y-4">
            {/* Org Header */}
            <div className="space-y-0.5 pt-1">
              <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#23735F] drop-shadow-xs">
                One Community Ely Online Training Centre
              </p>
              <p className="text-[11px] text-gray-500 font-medium">
                Empowering Adult Community Learning in Ely, Cardiff, Wales (CF5)
              </p>
            </div>

            {/* Title */}
            <div className="space-y-1 py-1">
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-wide uppercase drop-shadow-xs">
                Certificate of Completion
              </h2>
              <div className="w-24 h-1 bg-[#23735F] mx-auto rounded-full" />
            </div>

            {/* Presentation Card */}
            <div className="space-y-2 max-w-xl mx-auto px-5 py-3 rounded-2xl bg-white/85 backdrop-blur-xs border border-white/70 shadow-xs">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">
                This is to proudly certify that
              </p>
              {/* Dynamic Learner Name */}
              <h3 className="text-2xl sm:text-4xl font-black text-blue-900 tracking-wide">
                {learnerName}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-lg mx-auto">
                has successfully completed all required training modules and assessments for
              </p>
              {/* Dynamic Course Name */}
              <h4 className="text-lg sm:text-2xl font-black text-[#23735F] max-w-xl mx-auto leading-tight pt-0.5">
                {courseTitle}
              </h4>
            </div>

            {/* Dynamic Completed Date */}
            <div className="inline-flex items-center justify-center gap-2 text-xs font-bold text-gray-700 bg-white/85 backdrop-blur-xs py-1.5 px-4 rounded-xl mx-auto border border-gray-200/60 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>Completed on: <strong className="text-emerald-900">{completionFormatted}</strong></span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-500 text-[11px]">Issued: {new Date(certificate?.issuedAt || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            {/* Signatory & Verification Footer */}
            <div className="pt-3 border-t border-gray-200/80 bg-white/80 backdrop-blur-xs p-3 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 items-end text-left">
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider">Official Verification</span>
                <p className="font-mono font-bold text-gray-800 text-[11px]">
                  Cert No: {certificate?.certificateNumber}
                </p>
                <p className="text-[11px] text-gray-500">
                  Issued by: One Community Ely CIC
                </p>
                <p className="text-[10px] text-emerald-800 font-mono font-bold">
                  onecommunityely.com/verify/{certificate?.certificateNumber}
                </p>
              </div>

              <div className="text-center sm:text-right space-y-0.5">
                <div className="w-36 border-b border-gray-400 mx-auto sm:ml-auto mb-1" />
                <p className="font-black text-gray-900 text-sm">{certificate?.signatoryName || 'Angela Doggett'}</p>
                <p className="text-[11px] text-gray-500 font-medium">{certificate?.signatoryTitle || 'Director, One Community Ely CIC'}</p>
              </div>
            </div>

            {/* Mandatory Disclaimer */}
            <p className="text-[10px] text-gray-400 italic pt-1 max-w-2xl mx-auto leading-relaxed">
              {certificate?.disclaimer || 'This certificate confirms completion of the stated training course. It is not a regulated qualification or professional accreditation.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            to={`/courses/${effectiveCourseId}/learn`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors inline-flex items-center justify-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            <span>Review Course</span>
          </Link>

          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default LearnerCertificateView;
