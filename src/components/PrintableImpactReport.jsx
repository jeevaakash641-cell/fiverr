import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Printer, ArrowLeft, CheckCircle, Award, Star } from 'lucide-react';
import {
  fetchOverviewReport,
  fetchCoursePerformanceReport,
  fetchOutcomesReport,
  fetchFeedbackReport,
  fetchCertificatesReport,
  fetchEvidenceReport,
  formatUKDate
} from '../services/impactReportingService';

const PrintableImpactReport = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState(null);
  const [outcomes, setOutcomes] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [certificates, setCertificates] = useState(null);
  const [evidence, setEvidence] = useState(null);

  const filters = {
    startDate: searchParams.get('startDate') || null,
    endDate: searchParams.get('endDate') || null,
    courseId: searchParams.get('courseId') || null,
    category: searchParams.get('category') || null,
    status: searchParams.get('status') || null
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [ov, cs, oc, fb, ct, ev] = await Promise.all([
          fetchOverviewReport(filters, user),
          fetchCoursePerformanceReport(filters, user),
          fetchOutcomesReport(filters, user),
          fetchFeedbackReport(filters, user),
          fetchCertificatesReport(filters, user),
          fetchEvidenceReport(filters, user)
        ]);
        setOverview(ov);
        setCourses(cs);
        setOutcomes(oc);
        setFeedback(fb);
        setCertificates(ct);
        setEvidence(ev);
      } catch (err) {
        setError(err.message || 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const summary = overview?.summary || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Generating executive impact report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8 max-w-3xl mx-auto">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-bold">Error generating report:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const generatedDateUK = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-white min-h-screen text-gray-900 p-6 md:p-12 max-w-5xl mx-auto font-sans">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="no-print flex items-center justify-between pb-6 mb-6 border-b border-gray-200">
        <Link
          to="/admin/impact-reports"
          className="inline-flex items-center text-sm font-semibold text-[#23735F] hover:text-[#185344]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Impact Reports
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 bg-[#23735F] hover:bg-[#185344] text-white rounded-lg text-sm font-bold shadow transition-colors"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </button>
      </div>

      {/* Header with One Community Ely Branding */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-[#23735F] pb-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-4 w-4 rounded-full bg-[#23735F]"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#23735F]">
              One Community Ely
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Executive Learning Impact Report
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Social value, community skill acquisition, and training evaluation audit
          </p>
        </div>
        <div className="mt-3 sm:mt-0 text-left sm:text-right text-xs text-gray-500">
          <div><strong>Report Date:</strong> {generatedDateUK}</div>
          <div><strong>Scope:</strong> {overview?.filtersApplied?.startDate || 'All time'} — {overview?.filtersApplied?.endDate || 'Present'}</div>
          <div><strong>Course:</strong> {overview?.filtersApplied?.courseId || 'All'}</div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Registered Learners</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">{summary.totalRegisteredLearners ?? 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{summary.activeLearnersCount ?? 0} active in period</div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <div className="text-[11px] font-bold text-gray-500 uppercase">Courses Started</div>
          <div className="text-2xl font-black text-blue-800 mt-0.5">{summary.coursesStartedCount ?? 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{summary.coursesCompletedCount ?? 0} completed</div>
        </div>

        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">Completion Rate</div>
          <div className="text-2xl font-black text-[#23735F] mt-0.5">{summary.overallCompletionRate ?? 0}%</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Completed ÷ Started</div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <div className="text-[11px] font-bold text-blue-900 uppercase">Certificates Issued</div>
          <div className="text-2xl font-black text-blue-900 mt-0.5">{summary.certificatesIssuedCount ?? 0}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">{summary.activeCertificatesCount ?? 0} active verified</div>
        </div>
      </div>

      {/* Outcome Confidence Section */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
          1. Before-vs-After Knowledge & Confidence Outcomes
        </h2>
        <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200 mb-3 text-xs">
          <div className="font-bold text-[#23735F] flex items-center">
            <CheckCircle className="h-4 w-4 mr-1.5" />
            <span>{outcomes?.wording}</span>
          </div>
          <p className="text-gray-600 mt-1 text-[11px]">
            Based on {outcomes?.summary?.validComparisonsCount ?? 0} verified linked baseline and final assessments.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Confidence Increased</div>
            <div className="text-lg font-bold text-[#23735F]">{outcomes?.summary?.increasedPercentage ?? 0}%</div>
            <div className="text-[10px] text-gray-400">{outcomes?.summary?.increasedCount ?? 0} learners</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Confidence Maintained</div>
            <div className="text-lg font-bold text-blue-700">{outcomes?.summary?.maintainedPercentage ?? 0}%</div>
            <div className="text-[10px] text-gray-400">{outcomes?.summary?.maintainedCount ?? 0} learners</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Average Change</div>
            <div className="text-lg font-bold text-emerald-800">
              {outcomes?.summary?.averageChange !== null && outcomes?.summary?.averageChange !== undefined
                ? `+${outcomes.summary.averageChange}`
                : 'N/A'}
            </div>
            <div className="text-[10px] text-gray-400">Scale of 1–5</div>
          </div>
        </div>
      </div>

      {/* Course Performance Table */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
          2. Course Progression & Completion Breakdown
        </h2>
        <table className="w-full text-xs border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-50 font-bold text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Course</th>
              <th className="px-2 py-2 text-center">Selected</th>
              <th className="px-2 py-2 text-center">Started</th>
              <th className="px-2 py-2 text-center">Completed</th>
              <th className="px-2 py-2 text-center">Rate</th>
              <th className="px-2 py-2 text-center">Avg Progress</th>
              <th className="px-2 py-2 text-center">Certificates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courses?.courses?.length > 0 ? (
              courses.courses.map(c => (
                <tr key={c.courseId}>
                  <td className="px-3 py-2 font-medium text-gray-900">{c.title}</td>
                  <td className="px-2 py-2 text-center">{c.selectedCount}</td>
                  <td className="px-2 py-2 text-center text-blue-700 font-semibold">{c.startedCount}</td>
                  <td className="px-2 py-2 text-center text-emerald-700 font-semibold">{c.completedCount}</td>
                  <td className="px-2 py-2 text-center font-bold text-[#23735F]">
                    {c.startedCount > 0 ? `${c.completionRate}%` : 'Not available'}
                  </td>
                  <td className="px-2 py-2 text-center">{c.averageProgress}%</td>
                  <td className="px-2 py-2 text-center font-bold text-blue-900">{c.certificatesIssued}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-3 py-4 text-center text-gray-400">
                  No course data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Beneficiary Feedback & Satisfaction */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
          3. Beneficiary Feedback & Satisfaction
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Feedback Responses</div>
            <div className="text-lg font-bold text-gray-900">{feedback?.summary?.totalSubmissions ?? 0}</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Avg Usefulness Rating</div>
            <div className="text-lg font-bold text-amber-700">{feedback?.summary?.averageUsefulness ?? 0} / 5</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Recommend Rate</div>
            <div className="text-lg font-bold text-[#23735F]">{feedback?.summary?.recommendationPercentage ?? 0}%</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Named Testimonials</div>
            <div className="text-lg font-bold text-blue-800">{feedback?.summary?.consentBreakdown?.named ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Community Activities & Impact Evidence */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
          4. Community Activities & Impact Evidence
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Recorded Activities</div>
            <div className="text-lg font-bold text-gray-900">{evidence?.summary?.totalActivities ?? summary.evidenceActivitiesCount ?? 0}</div>
            <div className="text-[10px] text-gray-400">One Community Ely CIC</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Measured Attendance</div>
            <div className="text-lg font-bold text-[#23735F]">{evidence?.summary?.totalAttendance ?? summary.totalEvidenceAttendance ?? 0}</div>
            <div className="text-[10px] text-gray-400">{evidence?.summary?.recordsWithAttendance ?? 0} sessions recorded</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Headcount Unrecorded</div>
            <div className="text-lg font-bold text-amber-700">{evidence?.summary?.recordsMissingAttendance ?? summary.evidenceRecordsMissingAttendance ?? 0}</div>
            <div className="text-[10px] text-gray-400">Not skewing averages</div>
          </div>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Evidence Attachments</div>
            <div className="text-lg font-bold text-blue-900">{evidence?.summary?.totalAttachments ?? 0}</div>
            <div className="text-[10px] text-gray-400">Photos, docs & reports</div>
          </div>
        </div>

        {evidence?.records?.length > 0 && (
          <table className="w-full text-xs border border-gray-200 divide-y divide-gray-200 mt-3">
            <thead className="bg-gray-50 font-bold text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Activity</th>
                <th className="px-2 py-2 text-left">Category</th>
                <th className="px-2 py-2 text-center">Date</th>
                <th className="px-2 py-2 text-center">Attendance</th>
                <th className="px-2 py-2 text-left">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {evidence.records.slice(0, 10).map(r => (
                <tr key={r.evidenceId}>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.title}</td>
                  <td className="px-2 py-2 text-gray-600">{r.category}</td>
                  <td className="px-2 py-2 text-center text-gray-600">{r.activityDateUK || r.activityDate}</td>
                  <td className="px-2 py-2 text-center font-semibold text-gray-800">
                    {r.attendanceCount !== null && r.attendanceCount !== undefined ? r.attendanceCount : '—'}
                  </td>
                  <td className="px-2 py-2 text-gray-600">{r.location || 'Ely, Cardiff, Wales (CF5)'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Regulatory & Educational Disclaimer */}
      <div className="border-t border-gray-300 pt-4 mt-8 text-[11px] text-gray-500 leading-relaxed">
        <p className="font-bold text-gray-700">Official Non-Accreditation & Data Quality Disclaimer:</p>
        <p className="mt-1">
          One Community Ely Online Training Centre provides non-accredited adult community skills training and social inclusion workshops. All course assessments and before-vs-after outcome evaluations reflect self-reported learner confidence and practical skill acquisition. This training is non-regulated and does not constitute a formal vocational or accredited qualification.
        </p>
        <p className="mt-1 text-gray-400">
          Generated automatically by One Community Ely Learning Management Platform • Strictly for internal administrative and funder reporting review.
        </p>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableImpactReport;
