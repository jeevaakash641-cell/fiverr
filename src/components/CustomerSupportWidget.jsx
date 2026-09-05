import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageCircle, X, Send, Bot, User, Sparkles, HelpCircle,
  ExternalLink, ArrowRight, Shield, BookOpen, Award, Inbox,
  TrendingUp, RefreshCw, Mail, Phone, Clock, CheckCircle2,
  ChevronRight, Minimize2, Maximize2
} from 'lucide-react';
import { API_BASE_URL } from '../config';

const FAQ_KNOWLEDGE_BASE = {
  // Learner FAQs
  learner_certificate: {
    title: 'How do I earn my certificate?',
    summary: 'Here is the step-by-step process to earn your verified One Community Ely Certificate of Completion:',
    steps: [
      '**1. Select a Course**: Choose any course from the Course Catalog.',
      '**2. Complete Baseline Assessment**: Take the initial reflection assessment (if required).',
      '**3. Complete Lessons**: Study 100% of all required lessons in the Course Player.',
      '**4. Pass Quizzes**: Score a passing grade on the required course quizzes.',
      '**5. Complete Final Assessment**: Take the post-training confidence reflection.',
      '**6. Give Beneficiary Feedback**: Submit your feedback and testimonial consent choice.',
      '**7. Claim Certificate**: Click **"Claim Certificate"** to view and download your official PDF with a QR verification code!'
    ],
    actionLink: { label: 'Go to Dashboard', url: '/dashboard' }
  },
  learner_quiz: {
    title: 'How do I take a quiz or assessment?',
    summary: 'Quizzes and assessments test your understanding throughout your learning journey:',
    steps: [
      '• **Lesson Quizzes**: Found inside each course or under the "Quizzes" section. You need a passing score to complete the quiz step.',
      '• **Baseline Assessment**: Taken before starting course lessons to record your initial skill confidence.',
      '• **Final Reflection Assessment**: Taken after completing 100% of course lessons to measure your confidence growth.',
      '• **Title Matching**: Quizzes and assessments must match your selected course title. If a quiz or assessment is missing, click **"Request from Admin"**!'
    ],
    actionLink: { label: 'View Quizzes', url: '/quiz' }
  },
  learner_request: {
    title: 'How to request missing quizzes or assessments?',
    summary: 'If a course has no matching quiz or assessment uploaded yet, you can request it directly from the Admin team:',
    steps: [
      '• **1. Open Course/Dashboard**: Look for the purple badge: *"No Matching Quiz / Assessment Title"*.',
      '• **2. Click Request Button**: Click *"Request Quiz from Admin"* or *"Request Assessment from Admin"*.',
      '• **3. Submit Request**: Add an optional note and submit. The administrator is notified immediately in their Admin Content Requests tab.',
      '• **4. Fulfillment**: Once fulfilled by an admin, the matching quiz or assessment appears automatically on your course!'
    ],
    actionLink: { label: 'Go to Dashboard', url: '/dashboard' }
  },
  learner_journey: {
    title: 'How does the 7-step learning journey work?',
    summary: 'The sequential milestone stepper guides your progress one step at a time:',
    steps: [
      '• **Step 1: First Course Started** — Enroll in your chosen training course.',
      '• **Step 2: First Lesson Completed** — Study and finish your first module lesson.',
      '• **Step 3: Next Quiz & Knowledge Check** — Pass the required course quiz.',
      '• **Step 4: Course Completed** — Reach 100% completion across all lessons.',
      '• **Step 5: Post-Training Assessment** — Measure your growth in the final assessment.',
      '• **Step 6: Beneficiary Feedback** — Share your training feedback & testimonial consent.',
      '• **Step 7: First Certificate Earned** — Receive your official certificate!'
    ],
    actionLink: { label: 'View Learning Journey', url: '/dashboard' }
  },
  learner_feedback: {
    title: 'How do I give course feedback?',
    summary: 'Beneficiary feedback helps One Community Ely demonstrate community impact to funding partners:',
    steps: [
      '• **1. Unlock Prompt**: Once you finish all lessons in a course, the feedback prompt unlocks.',
      '• **2. Navigate**: Go to `/courses/:courseId/feedback` or click the feedback step in your dashboard.',
      '• **3. Rate & Review**: Rate your satisfaction and write a brief comment on how the course helped you.',
      '• **4. Consent Choice**: Choose whether you consent to having your anonymized testimonial included in community impact reports.',
      '• **5. Consent Control**: You can withdraw your consent anytime by contacting our team.'
    ],
    actionLink: { label: 'My Dashboard', url: '/dashboard' }
  },
  learner_support_contact: {
    title: 'How to contact customer support directly?',
    summary: 'Our friendly One Community Ely support team is here to assist you:',
    steps: [
      '• **Email Support**: support@onecommunityely.com / admin@onecommunityely.com',
      '• **Training Centre**: One Community Ely CIC, Cambridgeshire, UK',
      '• **Operating Hours**: Monday – Friday, 9:00 AM – 5:00 PM GMT',
      '• **Instant Chat**: You can also ask any question directly in this chat box!'
    ]
  },

  // Admin FAQs
  admin_content_requests: {
    title: 'How to review & fulfill learner content requests?',
    summary: 'Manage learner requests for missing or mismatched quizzes & assessments:',
    steps: [
      '• **1. Open Admin Panel**: Go to `/admin-panel` or `/admin`.',
      '• **2. Content Requests Tab**: Click the 6th tab (*"Content Requests"*, marked with an Inbox icon).',
      '• **3. Review Queue**: See outstanding requests with learner name, email, course title, and request type.',
      '• **4. Upload Content**: Use quick links to create matching content in Admin Quizzes or Admin Assessments.',
      '• **5. Fulfill Request**: Click *"Mark Fulfilled"* to update status and notify the learner.'
    ],
    actionLink: { label: 'Open Content Requests', url: '/admin-panel' }
  },
  admin_courses: {
    title: 'How to create and publish new courses?',
    summary: 'Build and manage courses for adult learners:',
    steps: [
      '• **1. Create Course**: Navigate to Admin Courses (`/admin/courses`) and click *"Create New Course"*.',
      '• **2. Course Details**: Fill in title, category, description, duration, and target audience.',
      '• **3. Course Builder**: Open the builder (`/admin/courses/:id/content`) to add Modules and Lessons.',
      '• **4. Lesson Content**: Add lesson text, study materials, or video links.',
      '• **5. Publish**: Toggle course status to *"Published"* to make it available in the learner catalog.'
    ],
    actionLink: { label: 'Manage Courses', url: '/admin/courses' }
  },
  admin_assessments_quizzes: {
    title: 'How to set up quizzes & assessments?',
    summary: 'Create and align quizzes and baseline/final reflection assessments:',
    steps: [
      '• **Quizzes** (`/admin/quizzes`): Create multiple-choice quizzes, set passing score (e.g. 70%), and ensure the `courseTitle` matches your course title exactly.',
      '• **Baseline Assessments** (`/admin/baseline-assessments`): Create pre-training reflection surveys to record learner starting confidence.',
      '• **After Assessments** (`/admin/after-assessments`): Create post-training surveys to measure skill growth and outcome metrics.'
    ],
    actionLink: { label: 'Admin Quizzes', url: '/admin/quizzes' }
  },
  admin_feedback_consent: {
    title: 'How to view beneficiary feedback & consent?',
    summary: 'Review learner testimonials and manage funder compliance:',
    steps: [
      '• **1. Feedback Tab**: In the Admin Panel, open the *"User & Course Feedback"* tab.',
      '• **2. Sub-Tabs**: Switch between *"Beneficiary Course Feedback"* and *"General Platform Feedback"*.',
      '• **3. Filters**: Filter by course, recommendation rating, or consent status.',
      '• **4. Consent Withdrawal**: If a beneficiary asks to revoke their quote, click the red *"Withdraw Consent"* button.'
    ],
    actionLink: { label: 'Feedback Tab', url: '/admin-panel' }
  },
  admin_impact_reports: {
    title: 'How to generate & print funder impact reports?',
    summary: 'Generate verifiable, funder-ready impact reports:',
    steps: [
      '• **1. Impact Reports**: Navigate to `/admin/impact-reports`.',
      '• **2. Select Period**: Choose reporting period (e.g. Last 30 Days, Q1, Annual) and optional course filter.',
      '• **3. Review Metrics**: View total learners, completion rate, confidence delta, and beneficiary satisfaction.',
      '• **4. Print PDF**: Click *"Printable Impact Report"* (`/admin/impact-reports/print`) to generate a clean, branded PDF report.'
    ],
    actionLink: { label: 'Impact Reports', url: '/admin/impact-reports' }
  },
  admin_evidence: {
    title: 'How to manage evidence library & documents?',
    summary: 'Store and organize grant compliance artifacts:',
    steps: [
      '• **1. Evidence Library**: Go to `/admin/evidence`.',
      '• **2. Upload**: Upload sign-in sheets, event photographs, learner quotes, and assessment matrices.',
      '• **3. Tagging**: Tag artifacts by Course ID or Funder Milestone.',
      '• **4. Export**: Export evidence bundles when submitting quarterly progress reports to funders.'
    ],
    actionLink: { label: 'Evidence Library', url: '/admin/evidence' }
  }
};

const LEARNER_CHIPS = [
  { id: 'learner_certificate', label: '🎓 How to earn certificate?' },
  { id: 'learner_quiz', label: '📝 Quizzes & assessments guide' },
  { id: 'learner_request', label: '📬 Request missing quiz/assessment' },
  { id: 'learner_journey', label: '📊 7-step learning journey' },
  { id: 'learner_feedback', label: '💬 Giving course feedback' },
  { id: 'learner_support_contact', label: '👥 Contact customer care' }
];

const ADMIN_CHIPS = [
  { id: 'admin_content_requests', label: '📬 Review learner content requests' },
  { id: 'admin_courses', label: '🏫 Creating & publishing courses' },
  { id: 'admin_assessments_quizzes', label: '📝 Setting up quizzes & assessments' },
  { id: 'admin_feedback_consent', label: '💬 Beneficiary feedback & consent' },
  { id: 'admin_impact_reports', label: '📈 Generating funder impact reports' },
  { id: 'admin_evidence', label: '📁 Managing evidence library' }
];

const CustomerSupportWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const isAdmin = user?.userType === 'teacher' || user?.role === 'admin' || location.pathname.startsWith('/admin');
  const userDisplayName = user?.name || user?.displayName || user?.email?.split('@')[0] || (isAdmin ? 'Administrator' : 'Learner');

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Initial welcome message based on role
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting = isAdmin
        ? {
            id: 'init-1',
            sender: 'bot',
            timestamp: new Date(),
            content: `Hello **${userDisplayName}**! 👋 Welcome to **One Community Ely Admin Support**.\n\nI can assist you with managing courses, reviewing learner content requests, setting up quizzes, beneficiary consent, and generating funder impact reports.\n\n**Type any question below to get instant guidance:**`
          }
        : {
            id: 'init-1',
            sender: 'bot',
            timestamp: new Date(),
            content: `Hello **${userDisplayName}**! 👋 Welcome to **One Community Ely Customer Care**.\n\nI can help you navigate your courses, explain the 7-step learning journey, show you how to take quizzes and earn certificates, or submit requests to our admin team.\n\n**Type any question below to get started:**`
          };
      setMessages([initialGreeting]);
    }
  }, [isAdmin, userDisplayName, messages.length]);

  const handleSelectFaqChip = (chipId) => {
    const faq = FAQ_KNOWLEDGE_BASE[chipId];
    if (!faq) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date(),
      content: faq.title
    };

    const botMsg = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      timestamp: new Date(),
      content: `${faq.summary}\n\n${faq.steps.join('\n')}`,
      actionLink: faq.actionLink
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  const handleSendMessage = async () => {
    const query = inputValue.trim();
    if (!query || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date(),
      content: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Check local keyword matching first for instant response
      const lowerQ = query.toLowerCase();
      let matchedFaq = null;

      if (lowerQ.includes('certificate') || lowerQ.includes('cert')) {
        matchedFaq = FAQ_KNOWLEDGE_BASE.learner_certificate;
      } else if (lowerQ.includes('request') || lowerQ.includes('missing') || lowerQ.includes('mismatch')) {
        matchedFaq = isAdmin ? FAQ_KNOWLEDGE_BASE.admin_content_requests : FAQ_KNOWLEDGE_BASE.learner_request;
      } else if (lowerQ.includes('quiz') || lowerQ.includes('assessment') || lowerQ.includes('test')) {
        matchedFaq = isAdmin ? FAQ_KNOWLEDGE_BASE.admin_assessments_quizzes : FAQ_KNOWLEDGE_BASE.learner_quiz;
      } else if (lowerQ.includes('journey') || lowerQ.includes('step') || lowerQ.includes('milestone')) {
        matchedFaq = FAQ_KNOWLEDGE_BASE.learner_journey;
      } else if (lowerQ.includes('feedback') || lowerQ.includes('consent')) {
        matchedFaq = isAdmin ? FAQ_KNOWLEDGE_BASE.admin_feedback_consent : FAQ_KNOWLEDGE_BASE.learner_feedback;
      } else if (lowerQ.includes('impact') || lowerQ.includes('report') || lowerQ.includes('funder')) {
        matchedFaq = FAQ_KNOWLEDGE_BASE.admin_impact_reports;
      } else if (lowerQ.includes('contact') || lowerQ.includes('email') || lowerQ.includes('phone') || lowerQ.includes('support')) {
        matchedFaq = FAQ_KNOWLEDGE_BASE.learner_support_contact;
      }

      if (matchedFaq) {
        // Fast local response
        setTimeout(() => {
          const botMsg = {
            id: `bot-${Date.now() + 1}`,
            sender: 'bot',
            timestamp: new Date(),
            content: `${matchedFaq.summary}\n\n${matchedFaq.steps.join('\n')}`,
            actionLink: matchedFaq.actionLink
          };
          setMessages(prev => [...prev, botMsg]);
          setIsLoading(false);
        }, 250);
        return;
      }

      // If no local match, query backend AI assistant for website guidance
      const systemPrompt = `You are the official Customer Care & Platform Guide for One Community Ely Online Training Centre (a community education and training organization in the UK).
User role: ${isAdmin ? 'Administrator' : 'Learner'}.
User name: ${userDisplayName}.
Platform features include:
- Adult Community Learning courses (Life Skills, Digital Skills, Money Management, Health).
- 7-step Sequential Learning Journey (Course Started -> First Lesson -> Quiz Passed -> Course Completed -> Assessment -> Beneficiary Feedback -> First Certificate).
- Quizzes & Assessments (Baseline pre-assessment and After final reflection).
- Content Requests system (learners can request missing quizzes/assessments, admins review/fulfill in Admin Panel).
- Admin Panel with 6 main tabs: Dashboard, Courses, Quizzes & Assessments, User & Course Feedback (Beneficiary + General), Admin Settings, and Content Requests.
- Verified Certificates of Completion with QR code verification.
- Funder Impact Reports with printable summary for community grant reporting.
- Support Email: admin@onecommunityely.com / support@onecommunityely.com.

Provide a friendly, concise, step-by-step answer explaining how to use the website. Use bold formatting and bullet points where helpful.`;

      const response = await fetch(`${API_BASE_URL}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          systemPrompt,
          maxTokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`);
      }

      const data = await response.json();
      const botResponseText = data.response || 'I am here to help you navigate One Community Ely. You can also reach our team directly at admin@onecommunityely.com.';

      const botMsg = {
        id: `bot-${Date.now() + 1}`,
        sender: 'bot',
        timestamp: new Date(),
        content: botResponseText
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Customer care AI error:', err);
      const fallbackMsg = {
        id: `bot-${Date.now() + 1}`,
        sender: 'bot',
        timestamp: new Date(),
        content: `Thank you for reaching out! For direct assistance regarding the website or your account, please contact the One Community Ely support team at **admin@onecommunityely.com** or **support@onecommunityely.com**.`
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([]);
  };

  const currentChips = isAdmin ? ADMIN_CHIPS : LEARNER_CHIPS;

  // Helper to render formatted markdown with matching UI colors
  const renderFormattedContent = (content) => {
    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      // Bullet points (•, -, or *)
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || (trimmed.startsWith('*') && !trimmed.startsWith('**'))) {
        const rawText = trimmed.replace(/^[•\-\*]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-2 pl-1 my-0.5 text-gray-800 leading-relaxed">
            <span className="text-[#23735F] font-bold text-sm leading-tight">•</span>
            <div className="flex-1">
              {renderInlineBold(rawText)}
            </div>
          </div>
        );
      }

      // Step headings / bold lines
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return (
          <div key={idx} className="font-bold text-[#23735F] text-xs mt-1.5 mb-0.5">
            {trimmed.replace(/\*\*/g, '')}
          </div>
        );
      }

      // Regular paragraph with inline bold
      return (
        <p key={idx} className="text-gray-800 leading-relaxed my-0.5">
          {renderInlineBold(line)}
        </p>
      );
    });
  };

  const renderInlineBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="text-gray-900 font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={pIdx} className="text-[#23735F] font-semibold not-italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className="w-[360px] sm:w-[410px] h-[580px] max-h-[85vh] bg-white text-gray-900 rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{
            boxShadow: '0 20px 45px -10px rgba(35, 115, 95, 0.25), 0 0 0 1px rgba(35, 115, 95, 0.1)'
          }}
        >
          {/* Top Header — Matching One Community Ely UI Brand Colors */}
          <div className="bg-gradient-to-r from-[#23735F] via-[#1d6352] to-[#14473b] p-4 text-white flex items-center justify-between flex-shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-inner">
                  <Bot className="w-5 h-5 text-emerald-100" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#23735F] rounded-full animate-pulse"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-tight">
                    {isAdmin ? 'Ask Ely Admin Support' : 'Ask One Community Ely'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 border border-white/20">
                    {isAdmin ? 'Admin' : 'Learner'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/90 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block"></span>
                  Online · Instant Customer Care
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                onClick={handleResetChat}
                className="p-1.5 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f8fafc]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#23735F] to-[#1b5b4b] text-white rounded-tr-xs shadow-xs font-medium'
                      : 'bg-white text-gray-800 border border-emerald-100/90 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <div className="space-y-1">
                    {msg.sender === 'user' ? (
                      <p className="font-medium text-white">{msg.content}</p>
                    ) : (
                      renderFormattedContent(msg.content)
                    )}
                  </div>

                  {/* Optional Action Button Link */}
                  {msg.actionLink && (
                    <button
                      onClick={() => {
                        navigate(msg.actionLink.url);
                        setIsOpen(false);
                      }}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#23735F] border border-emerald-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>{msg.actionLink.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#23735F] bg-emerald-50 border border-emerald-200 p-3 rounded-2xl max-w-[75%] shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="font-semibold">Checking website support knowledge...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 bg-gray-50/80 border-t border-gray-200 flex-shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isAdmin ? "Ask about Admin Panel, courses, requests..." : "Ask about One Community Ely..."}
                disabled={isLoading}
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs rounded-2xl pl-3.5 pr-11 py-3 border border-gray-300 focus:outline-none focus:border-[#23735F] focus:ring-2 focus:ring-[#23735F]/20 transition-all shadow-2xs font-medium"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-1.5 p-2 bg-[#23735F] hover:bg-[#1b5b4b] disabled:opacity-40 disabled:hover:bg-[#23735F] text-white rounded-xl transition-all cursor-pointer shadow-xs"
                title="Send Question"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium px-1 mt-1.5">
              <span>Support: admin@onecommunityely.com</span>
              <span className="text-[#23735F] font-bold">One Community Ely Training</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className={`group relative flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 cursor-pointer ${
          isOpen
            ? 'w-13 h-13 bg-gray-800 text-white hover:bg-gray-900 border border-gray-700'
            : 'w-14 h-14 bg-gradient-to-r from-[#23735F] via-[#1d6352] to-[#124136] text-white hover:scale-105 hover:shadow-emerald-900/40 border-2 border-white'
        }`}
        aria-label="Customer Care Support"
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
        ) : (
          <>
            <MessageCircle className="w-7 h-7" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default CustomerSupportWidget;
