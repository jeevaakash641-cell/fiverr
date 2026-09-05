import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, LogIn, ArrowLeft, Shield } from 'lucide-react';

/**
 * Route guard component for all One Community Ely Admin Portal views.
 * Strictly enforces that the active session has administrator/teacher credentials.
 * If user is unauthenticated -> redirects to /admin-login.
 * If user is authenticated as a Learner -> displays clear Administrator Access Required screen.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-3 text-emerald-800">
          <div className="w-8 h-8 border-4 border-[#23735F] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Verifying Administrator Privileges...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  const role = String(user.userType || user.role || '').toLowerCase().trim();
  const isElyAdmin = String(user.email || '').toLowerCase().trim() === 'admin@onecommunityely.com';
  const isAdmin = role === 'teacher' || role === 'admin' || isElyAdmin;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 mb-3">
            Active Session: Learner ({user.email})
          </span>
          <h2 className="text-xl font-black text-gray-900 mb-2">Administrator Access Required</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            The page you requested is part of the <strong>One Community Ely Online Training Centre Administration Portal</strong>.
            Your current account does not have administrative privileges.
          </p>
          <div className="space-y-3">
            <Link
              to="/admin-login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#23735F] hover:bg-[#1b5e4d] text-white font-bold rounded-xl shadow-md transition-colors text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Administrator Account</span>
            </Link>
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Learner Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
