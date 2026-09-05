import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyCertificatePublic } from '../services/certificateService';
import {
  ShieldCheck, ShieldAlert, Search, RefreshCw, Award,
  CheckCircle2, AlertCircle, Building2, Calendar, FileText, ArrowLeft
} from 'lucide-react';

const PublicCertificateVerify = () => {
  const { certificateNumber: paramCertNum } = useParams();

  const [inputNum, setInputNum] = useState(paramCertNum || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const doVerify = async (numToVerify) => {
    if (!numToVerify || !numToVerify.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyCertificatePublic(numToVerify.trim());
      setResult(res?.verification || null);
    } catch (err) {
      setError(err.message || 'Failed to verify certificate.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramCertNum) {
      setInputNum(paramCertNum);
      doVerify(paramCertNum);
    }
  }, [paramCertNum]);

  const handleSubmit = (e) => {
    e.preventDefault();
    doVerify(inputNum);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xs font-bold text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-black text-[#23735F]">
            <Award className="h-4 w-4 text-[#23735F]" />
            <span>One Community Ely Online Training Centre</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl w-full mx-auto px-4 py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-[#23735F]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            Certificate Verification
          </h1>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Verify official Certificates of Completion issued by One Community Ely CIC.
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1.5">
              Enter Certificate Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. OCE-2026-DIGI-001001"
                value={inputNum}
                onChange={(e) => setInputNum(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 border border-gray-200 rounded-xl text-xs font-mono uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#23735F]"
              />
              <button
                type="submit"
                disabled={loading || !inputNum.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-[#23735F] text-white rounded-lg hover:bg-[#1b5b4b] disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Found on the bottom left of the certificate.
            </p>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className={`bg-white rounded-2xl border p-6 shadow-md space-y-5 ${
            result.status === 'active'
              ? 'border-emerald-300 ring-1 ring-emerald-500/20'
              : result.status === 'revoked'
              ? 'border-red-300 ring-1 ring-red-500/20'
              : 'border-gray-300'
          }`}>
            {/* Status Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="font-mono text-xs font-black text-gray-700">
                {result.certificateNumber}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                result.status === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : result.status === 'revoked'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {result.status === 'active' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>VALID & AUTHENTIC</span>
                  </>
                ) : result.status === 'revoked' ? (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                    <span>REVOKED</span>
                  </>
                ) : (
                  <span>NOT FOUND</span>
                )}
              </span>
            </div>

            {/* Details */}
            {result.status !== 'not_found' ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Learner Name</span>
                    <p className="font-black text-gray-900 text-sm mt-0.5">{result.learnerName}</p>
                    <p className="text-[10px] text-gray-400">Name masked for privacy</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Issuing Body</span>
                    <p className="font-black text-[#23735F] text-sm mt-0.5">{result.issuingOrganisation}</p>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Course Completed</span>
                  <p className="font-extrabold text-gray-900 text-sm">{result.courseTitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-gray-600 pt-1">
                  <p><strong>Completed:</strong> {result.completionDate}</p>
                  <p><strong>Issued:</strong> {result.issuedAt}</p>
                </div>

                {result.status === 'revoked' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] font-semibold">
                    This certificate was revoked on {result.revokedAt || 'record'}. It is no longer valid.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-600 font-medium">
                  {result.message || 'No certificate record found for this number.'}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 italic text-center">
              This certificate confirms completion of the stated training course. It is not a regulated qualification or professional accreditation.
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-gray-400">
        One Community Ely CIC • Online Training Centre
      </footer>
    </div>
  );
};

export default PublicCertificateVerify;
