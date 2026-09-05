import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, Brain, Award, Users, Zap, BarChart2, ArrowRight } from 'lucide-react'

const features = [
  { icon: Brain, label: 'AI Learning Assistant', color: '#4f46e5', bg: '#eef2ff', desc: 'Get simple explanations, examples and support while you learn.' },
  { icon: Award, label: 'Quizzes & Assessments', color: '#7c3aed', bg: '#f5f3ff', desc: 'Check your understanding and build confidence as you progress.' },
  { icon: Users, label: 'Learning Resources', color: '#0891b2', bg: '#ecfeff', desc: 'Access helpful learning materials designed to support your development.' },
  { icon: BookOpen, label: 'Digital Resources', color: '#059669', bg: '#ecfdf5', desc: 'Explore useful guides, videos and downloadable learning resources.' },
  { icon: Zap, label: 'Work & Life Skills', color: '#d97706', bg: '#fffbeb', desc: 'Develop practical skills for work, everyday life and new opportunities.' },
  { icon: BarChart2, label: 'Learning Progress', color: '#db2777', bg: '#fdf2f8', desc: 'See your progress, completed learning and achievements in one place.' },
]

const LandingPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  return (
    <div className="edu-page">
      {/* Navbar */}
      <nav className="edu-navbar">
        <div className="edu-navbar-inner">
          <div className="edu-logo">
            <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
            <div>
              <div className="edu-logo-text">One Community Ely</div>
              <div className="edu-logo-sub">Online Training Centre</div>
            </div>
          </div>

          <ul className="edu-nav-links" style={{ display: 'flex' }}>
            <li><a href="#" className="active">HOME</a></li>
            <li><a href="#">ABOUT</a></li>
            <li><a href="#">COURSES</a></li>
            <li><a href="#">CONTACT</a></li>
          </ul>

          <Link to="/register" className="edu-btn-cta">CONTACT US</Link>
        </div>
      </nav>

      {/* Hero Split */}
      <div className="edu-hero">
        {/* Left — light gray */}
        <div className="edu-hero-left">
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#23735F', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            ONE COMMUNITY ELY
          </p>
          <h1 className="edu-hero-title">
            Learn New Skills.<br />
            Build Confidence.<br />
            Grow Your Opportunities.
          </h1>
          <p className="edu-hero-desc">
            Welcome to One Community Ely Online Training Centre. Explore practical learning designed to help you build confidence, develop useful skills and achieve your personal and professional goals.
          </p>
          <div className="edu-hero-btns">
            <Link to="/register" className="edu-btn-primary">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="edu-btn-outline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Right — blue-purple gradient */}
        <div className="edu-hero-right">
          <div className="edu-illustration">
            <div className="edu-illustration-inner">
              {/* SVG Illustration */}
              <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: '380px' }}>
                {/* Books stack */}
                <rect x="100" y="200" width="180" height="22" rx="4" fill="#f59e0b" />
                <rect x="110" y="180" width="160" height="22" rx="4" fill="#22c55e" />
                <rect x="120" y="160" width="140" height="22" rx="4" fill="#3b82f6" />
                <rect x="130" y="140" width="120" height="22" rx="4" fill="#8b5cf6" />
                {/* Ladder */}
                <rect x="230" y="80" width="8" height="140" rx="3" fill="rgba(255,255,255,0.6)" />
                <rect x="260" y="80" width="8" height="140" rx="3" fill="rgba(255,255,255,0.6)" />
                <rect x="230" y="100" width="38" height="6" rx="2" fill="rgba(255,255,255,0.5)" />
                <rect x="230" y="120" width="38" height="6" rx="2" fill="rgba(255,255,255,0.5)" />
                <rect x="230" y="140" width="38" height="6" rx="2" fill="rgba(255,255,255,0.5)" />
                <rect x="230" y="160" width="38" height="6" rx="2" fill="rgba(255,255,255,0.5)" />
                {/* Person sitting */}
                <circle cx="190" cy="118" r="18" fill="#fbbf24" />
                <rect x="170" y="136" width="40" height="28" rx="8" fill="#22c55e" />
                <rect x="155" y="148" width="30" height="10" rx="5" fill="#22c55e" />
                <rect x="195" y="148" width="30" height="10" rx="5" fill="#22c55e" />
                {/* Laptop */}
                <rect x="168" y="155" width="44" height="28" rx="4" fill="#1e293b" />
                <rect x="172" y="158" width="36" height="20" rx="2" fill="#38bdf8" />
                <rect x="160" y="183" width="60" height="5" rx="2" fill="#334155" />
                {/* Lightbulb */}
                <circle cx="310" cy="70" r="28" fill="#fbbf24" opacity="0.9" />
                <rect x="304" y="94" width="12" height="16" rx="3" fill="#f59e0b" />
                {/* Rays */}
                <line x1="310" y1="30" x2="310" y2="20" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                <line x1="340" y1="42" x2="348" y2="34" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                <line x1="350" y1="70" x2="362" y2="70" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                <line x1="280" y1="42" x2="272" y2="34" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                <line x1="270" y1="70" x2="258" y2="70" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                {/* Pencil */}
                <rect x="320" y="150" width="14" height="80" rx="4" fill="#22c55e" />
                <polygon points="320,230 334,230 327,250" fill="#fbbf24" />
                {/* Leaves */}
                <ellipse cx="80" cy="220" rx="30" ry="18" fill="#22c55e" opacity="0.7" transform="rotate(-20 80 220)" />
                <ellipse cx="60" cy="240" rx="22" ry="14" fill="#16a34a" opacity="0.6" transform="rotate(10 60 240)" />
              </svg>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', fontWeight: 600, marginTop: '16px' }}>
                One Community Training Centre
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '6px' }}>
                Accessible learning for everyone
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ background: 'white', padding: '64px 0' }}>
        <div className="edu-main" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p className="edu-section-label">What We Offer</p>
            <h2 className="edu-section-title">
              Supporting Your <span>Learning Journey</span>
            </h2>
          </div>
          <div className="edu-grid-3">
            {features.map(({ icon: Icon, label, color, bg, desc }) => (
              <div key={label} className="edu-card" style={{ textAlign: 'center', cursor: 'default' }}>
                <div className="edu-card-icon" style={{ background: bg, margin: '0 auto 14px' }}>
                  <Icon size={24} color={color} />
                </div>
                <div className="edu-card-title">{label}</div>
                <div className="edu-card-desc">
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div style={{ background: 'var(--edu-gradient-hero)', padding: '56px 0' }}>
        <div className="edu-main" style={{ paddingTop: 0, paddingBottom: 0, textAlign: 'center' }}>
          <h2 style={{ color: 'white', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, marginBottom: '12px' }}>
            Ready to Start Learning?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px', marginBottom: '28px' }}>
            Join the One Community Ely Training Centre and start building new skills at your own pace.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '13px 32px', borderRadius: '10px', background: 'white',
              color: '#23735F', fontSize: '15px', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
            }}>
              Get Started Free
            </Link>
            <Link to="/login" style={{
              padding: '13px 32px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)',
              color: 'white', fontSize: '15px', fontWeight: 700, textDecoration: 'none'
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1a1a2e', padding: '32px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          {/* Brand */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'white', marginBottom: 6 }}>One Community Ely</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Learning, skills and opportunities for our community.</div>
          </div>

          {/* About */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>About</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Online Training Centre</div>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact</div>
            <a
              href="#"
              style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseOver={e => e.currentTarget.style.color = 'white'}
              onMouseOut={e => e.currentTarget.style.color = '#6b7280'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Contact Us
            </a>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #374151', marginTop: 24, paddingTop: 16, textAlign: 'center' }}>
          <p style={{ color: '#4b5563', fontSize: 12 }}>© {new Date().getFullYear()} One Community Ely. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
