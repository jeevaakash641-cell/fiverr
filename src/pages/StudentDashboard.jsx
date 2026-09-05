import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStats } from '../utils/studentDataCollector';
import { TrendingUp, AlertTriangle, Target, Award, BookOpen, Clock, ArrowLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import FocusTrackerWidget from '../components/FocusTrackerWidget';

const statCards = (stats) => [
  { icon: Clock,    label: 'Total Study Time',  value: `${stats.total_study_hours}h`,       color: '#4f46e5', bg: '#eef2ff' },
  { icon: BookOpen, label: 'Subjects',           value: stats.subjects_tracked,              color: '#059669', bg: '#ecfdf5' },
  { icon: Target,   label: 'Study Sessions',     value: stats.total_study_sessions,          color: '#7c3aed', bg: '#f5f3ff' },
  { icon: Award,    label: 'Focus Time',         value: `${stats.total_focus_minutes}m`,     color: '#d97706', bg: '#fffbeb' },
];

const riskStyle = (level) => {
  switch (level?.toLowerCase()) {
    case 'high':   return { border: '#fca5a5', bg: '#fff1f2', badge: '#ef4444', text: '#991b1b' };
    case 'medium': return { border: '#fdba74', bg: '#fff7ed', badge: '#f97316', text: '#9a3412' };
    case 'low':    return { border: '#fde68a', bg: '#fefce8', badge: '#eab308', text: '#854d0e' };
    default:       return { border: '#e5e7eb', bg: '#f9fafb', badge: '#6b7280', text: '#374151' };
  }
};

const StudentDashboard = () => {
  const { user, predictions, predictionsLoading, refreshPredictions } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setStats(getStats());
    if (!predictions && !predictionsLoading) handleRefresh();
  }, [user, navigate, predictions, predictionsLoading]);

  const handleRefresh = async () => {
    setLoading(true); setError(null); setRetryCount(p => p + 1);
    try { await refreshPredictions(); }
    catch { setError('general'); }
    finally { setLoading(false); }
  };

  const hasPredictions = predictions?.prediction;
  const prediction    = predictions?.prediction;
  const riskSubjects  = predictions?.riskSubjects || [];
  const simulation    = predictions?.simulation;

  /* ── Loading ── */
  if (loading || predictionsLoading) return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
        <RefreshCw size={48} color="#4f46e5" style={{ margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Analyzing Your Performance</h2>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Our AI is generating personalized insights…</p>
      </div>
    </div>
  );

  /* ── Error / No data ── */
  const renderEmpty = () => {
    const isConn = error === 'connection';
    const Icon = error ? (isConn ? WifiOff : AlertTriangle) : BookOpen;
    const iconColor = error ? (isConn ? '#f97316' : '#eab308') : '#4f46e5';
    const title = error ? (isConn ? 'Connection Issue' : 'Something Went Wrong') : 'No Data Yet';
    const msg = error
      ? (isConn ? 'Check your internet connection and try again.' : "Couldn't load insights right now. Your data is safe.")
      : 'Complete some study sessions to see personalized predictions.';

    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 4px 20px rgba(79,70,229,0.08)' }}>
          <Icon size={52} color={iconColor} style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 10 }}>{title}</h2>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>{msg}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={error ? handleRefresh : () => navigate('/dashboard')}
              style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {error ? 'Try Again' : 'Go to Dashboard'}
            </button>
            {error && retryCount > 0 && (
              <button onClick={() => navigate('/dashboard')}
                style={{ padding: '11px 28px', borderRadius: 10, background: 'white', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Back to Dashboard
              </button>
            )}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, marginTop: 16, boxShadow: '0 4px 20px rgba(79,70,229,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Wifi size={18} color="#4f46e5" />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Need Help?</span>
          </div>
          {['Make sure you are connected to the internet', 'Check if the backend server is running', 'Try refreshing the page', 'If the problem persists, contact support'].map(t => (
            <div key={t} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#6b7280' }}>
              <span style={{ color: '#4f46e5', fontWeight: 700 }}>•</span> {t}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>

      {/* Header */}
      <header className="edu-dashboard-header">
        <div className="edu-dashboard-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/dashboard')} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={16} color="#374151" />
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>Performance Insights</h1>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>AI-powered study analytics</p>
            </div>
          </div>
          <button onClick={handleRefresh} disabled={loading || predictionsLoading}
            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw size={16} color="#4f46e5" style={(loading || predictionsLoading) ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {(error || !hasPredictions) ? renderEmpty() : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Top row: Focus widget + Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 20px rgba(79,70,229,0.08)' }}>
                <FocusTrackerWidget />
              </div>

              {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {statCards(stats).map(({ icon: Icon, label, value, color, bg }) => (
                    <div key={label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', boxShadow: '0 4px 20px rgba(79,70,229,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={20} color={color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Predicted Score */}
            {prediction && (
              <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 16, padding: '28px 32px', color: 'white', boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <TrendingUp size={20} color="white" />
                  <h2 style={{ fontSize: 16, fontWeight: 700, opacity: 0.9 }}>Predicted Exam Score</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 72, fontWeight: 900, lineHeight: 1 }}>{prediction.predicted_score}%</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {prediction.confidence && (
                      <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 600, width: 'fit-content' }}>
                        {prediction.confidence} confidence
                      </span>
                    )}
                    {prediction.prediction_range && (
                      <span style={{ fontSize: 13, opacity: 0.75 }}>
                        Range: {prediction.prediction_range.min}% – {prediction.prediction_range.max}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Risk Subjects */}
            {riskSubjects.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px 28px', boxShadow: '0 4px 20px rgba(79,70,229,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <AlertTriangle size={20} color="#f97316" />
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e' }}>Subjects Needing Attention</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {riskSubjects.map((subject, i) => {
                    const s = riskStyle(subject.risk_level);
                    return (
                      <div key={i} style={{ border: `1px solid ${s.border}`, background: s.bg, borderRadius: 12, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: s.text, textTransform: 'capitalize' }}>{subject.subject}</div>
                            <div style={{ fontSize: 13, color: s.text, opacity: 0.8, marginTop: 2 }}>Current Score: {subject.current_score}%</div>
                          </div>
                          <span style={{ padding: '3px 10px', borderRadius: 20, background: s.badge, color: 'white', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                            {subject.risk_level} Risk
                          </span>
                        </div>
                        {subject.weak_areas?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: s.text, marginBottom: 6 }}>Weak Areas:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {subject.weak_areas.map((a, j) => (
                                <span key={j} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.7)', fontSize: 12, color: s.text, border: `1px solid ${s.border}` }}>{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {subject.recommended_action && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${s.border}`, fontSize: 13, color: s.text }}>
                            <span style={{ fontWeight: 700 }}>Recommendation: </span>{subject.recommended_action}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Improvement Simulation */}
            {simulation && (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px 28px', boxShadow: '0 4px 20px rgba(79,70,229,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Target size={20} color="#059669" />
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e' }}>What If You Study More?</h2>
                </div>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>If you increase your study time by 50%, here's what could happen:</p>

                {simulation.projected_scores && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {Object.entries(simulation.projected_scores).map(([subject, score]) => (
                      <div key={subject} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600, textTransform: 'capitalize', marginBottom: 4 }}>{subject}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{score}%</div>
                        {simulation.improvement_percent?.[subject] && (
                          <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 2 }}>+{simulation.improvement_percent[subject]}%</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {simulation.timeline && (
                    <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, marginBottom: 4 }}>Timeline</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#3730a3' }}>{simulation.timeline}</div>
                    </div>
                  )}
                  {simulation.success_probability && (
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600, marginBottom: 4 }}>Success Probability</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#5b21b6', textTransform: 'capitalize' }}>{simulation.success_probability}</div>
                    </div>
                  )}
                </div>

                {simulation.key_factors?.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 12 }}>Key Success Factors</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {simulation.key_factors.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#78350f', alignItems: 'flex-start' }}>
                          <span style={{ color: '#059669', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
