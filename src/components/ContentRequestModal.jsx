import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, HelpCircle, Award, Sparkles } from 'lucide-react';
import { submitContentRequest } from '../services/contentRequestService';
import { useAuth } from '../contexts/AuthContext';

const ContentRequestModal = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  requestType = 'quiz', // 'quiz' | 'assessment'
  onSuccess
}) => {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const isQuiz = requestType === 'quiz';
  const typeLabel = isQuiz ? 'Course Quiz' : 'Assessment';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId) {
      setError('Course identifier is missing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitContentRequest(
        {
          courseId,
          courseTitle: courseTitle || 'Selected Course',
          requestType,
          note: note.trim()
        },
        user
      );

      setSubmitted(true);
      if (onSuccess) {
        onSuccess(requestType);
      }
      setTimeout(() => {
        setSubmitted(false);
        setNote('');
        onClose();
      }, 2200);
    } catch (err) {
      console.error('Failed to submit content request:', err);
      setError(err.message || 'Could not send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={loading}
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Request Sent to Admin!</h3>
            <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
              The One Community Ely admin team has been notified to upload or post the {typeLabel.toLowerCase()} for{' '}
              <span className="font-bold text-gray-900">"{courseTitle}"</span>.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                  isQuiz ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-[#23735F]'
                }`}
              >
                {isQuiz ? <HelpCircle className="h-6 w-6" /> : <Award className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Request {typeLabel} from Admin
                </h3>
                <p className="text-xs text-gray-500">
                  Notify the training team to upload or review this content
                </p>
              </div>
            </div>

            {/* Course Details Box */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-gray-500 font-medium">
                <span>Course:</span>
                <span className="font-mono text-[10px] text-gray-400">{courseId}</span>
              </div>
              <p className="font-bold text-gray-900 text-sm">{courseTitle || 'Selected Course'}</p>
              <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60 mt-1">
                Requested Item:{' '}
                <span className="font-bold text-indigo-700">
                  {isQuiz ? 'Course / Lesson Quiz' : 'Course Reflection Assessment'}
                </span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Request Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Optional Note for the Admin Team
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isQuiz
                      ? 'e.g., I am ready to test my knowledge for this course, please upload the quiz.'
                      : 'e.g., I have finished all lessons and need the final assessment to complete this course.'
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#23735F] focus:border-transparent outline-none bg-white text-gray-900 resize-none"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isQuiz
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-[#23735F] hover:bg-[#1b5b4b]'
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ContentRequestModal;
