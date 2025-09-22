import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getURL } from '../utils/getURL';

// PUBLIC_INTERFACE
export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data?.session) navigate('/', { replace: true });
    })();
    return () => { active = false; };
  }, [navigate]);

  const emailLooksValid = useMemo(() => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  // Enhanced password policy
  const passIssues = useMemo(() => {
    if (mode !== 'signup') return [];
    const issues = [];
    if (pass.length < 8) issues.push('At least 8 characters');
    if (!/[a-zA-Z]/.test(pass)) issues.push('Include a letter');
    if (!/[0-9]/.test(pass)) issues.push('Include a number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) issues.push('Include a special character');
    if (confirm && pass !== confirm) issues.push('Passwords must match');
    return issues;
  }, [pass, confirm, mode]);

  const passwordStrength = useMemo(() => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[a-zA-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength += 25;
    return strength;
  }, [pass]);

  const getStrengthColor = (strength) => {
    if (strength < 50) return '#ef4444';
    if (strength < 75) return '#f59e0b';
    return '#10b981';
  };

  const mapAuthError = (err) => {
    const raw = err?.message || 'Authentication failed.';
    const msg = raw.toLowerCase();
    if (msg.includes('invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (msg.includes('email') && msg.includes('not confirmed')) {
      return 'Email not confirmed. Please check your inbox for the verification link.';
    }
    if (msg.includes('email') && (msg.includes('already') || msg.includes('registered'))) {
      return 'This email is already registered. Try logging in or use password reset.';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (msg.includes('redirect') || msg.includes('url') || msg.includes('not allowed')) {
      return 'Redirect URL is not allowed. Open Troubleshoot and verify Authentication URL settings.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      return 'Network error connecting to Supabase. Check your internet and Supabase URL.';
    }
    if (msg.includes('apikey') || msg.includes('jwt') || msg.includes('secret') || msg.includes('invalid key')) {
      return 'Invalid Supabase key. Ensure REACT_APP_SUPABASE_KEY is the anon public key.';
    }
    if (msg.includes('password') && (msg.includes('too short') || msg.includes('weak'))) {
      return 'Password too weak. Use at least 8 characters with letters, numbers, and special characters.';
    }
    if (msg.includes('user not found')) {
      return 'No account found for this email. Try signing up first.';
    }
    if (msg.includes('email rate limit exceeded')) {
      return 'Email rate limit exceeded. Please try again later.';
    }
    return raw;
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
    setPass('');
    setConfirm('');
    setShowPassword(false);
    setShowConfirm(false);
  };

  const doLogin = async () => {
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (err) throw err;

    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      navigate('/', { replace: true });
    }
  };

  const doSignup = async () => {
    if (!emailLooksValid) {
      throw new Error('Please enter a valid email address.');
    }
    if (passIssues.length > 0) {
      throw new Error('Password does not meet requirements.');
    }
    const redirectTo = getURL();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: redirectTo
      }
    });
    if (err) throw err;

    if (!data?.session) {
      setInfo('Signup successful! Please check your email and click the verification link to complete your registration.');
    } else {
      navigate('/', { replace: true });
    }
  };

  const doReset = async () => {
    if (!emailLooksValid) {
      throw new Error('Please enter a valid email address.');
    }
    const redirectTo = getURL();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    if (err) throw err;
    setInfo('Password reset email sent! Check your inbox and follow the link to set a new password.');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await doLogin();
      } else if (mode === 'signup') {
        await doSignup();
      } else if (mode === 'reset') {
        await doReset();
      }
    } catch (err) {
      const friendly = mapAuthError(err);
      setError(friendly);
    } finally {
      setBusy(false);
    }
  };

  const renderPasswordStrength = () => {
    if (mode !== 'signup' || !pass) return null;
    
    return (
      <div className="password-strength">
        <div className="strength-bar">
          <div 
            className="strength-fill" 
            style={{ 
              width: `${passwordStrength}%`,
              backgroundColor: getStrengthColor(passwordStrength)
            }}
          />
        </div>
        <div className="strength-labels">
          <span style={{ color: passwordStrength >= 25 ? getStrengthColor(passwordStrength) : '#6b7280' }}>
            Weak
          </span>
          <span style={{ color: passwordStrength >= 50 ? getStrengthColor(passwordStrength) : '#6b7280' }}>
            Fair
          </span>
          <span style={{ color: passwordStrength >= 75 ? getStrengthColor(passwordStrength) : '#6b7280' }}>
            Good
          </span>
          <span style={{ color: passwordStrength >= 100 ? getStrengthColor(passwordStrength) : '#6b7280' }}>
            Strong
          </span>
        </div>
      </div>
    );
  };

  const getModeConfig = () => {
    const configs = {
      login: {
        title: 'Welcome Back',
        subtitle: 'Sign in to your account',
        icon: '🔐',
        buttonText: 'Sign In'
      },
      signup: {
        title: 'Create Account',
        subtitle: 'Join our knowledge community',
        icon: '✨',
        buttonText: 'Create Account'
      },
      reset: {
        title: 'Reset Password',
        subtitle: 'We\'ll send you a reset link',
        icon: '🔄',
        buttonText: 'Send Reset Link'
      }
    };
    return configs[mode];
  };

  const modeConfig = getModeConfig();

  return (
    <div className="auth-container">
      {/* Animated Background */}
      <div className="auth-background">
        <div className="bg-particle particle-1"></div>
        <div className="bg-particle particle-2"></div>
        <div className="bg-particle particle-3"></div>
        <div className="bg-particle particle-4"></div>
        <div className="bg-gradient"></div>
      </div>

      <div className="auth-content">
        {/* Left Side - Branding */}
        <div className="auth-hero">
          <div className="hero-content">
            <div className="brand-logo">
              <div className="logo-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="brand-text">NoteShare</span>
            </div>
            
            <h1 className="hero-title">
              Your Knowledge,
              <span className="title-accent"> Amplified</span>
            </h1>
            
            <p className="hero-subtitle">
              Join thousands of learners sharing and discovering educational resources in our secure, elegant platform.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <div className="feature-text">
                  <strong>Secure Authentication</strong>
                  <span>Enterprise-grade security with Supabase Auth</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🚀</div>
                <div className="feature-text">
                  <strong>Lightning Fast</strong>
                  <span>Instant search and seamless navigation</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💎</div>
                <div className="feature-text">
                  <strong>Beautiful Interface</strong>
                  <span>Modern design focused on user experience</span>
                </div>
              </div>
            </div>

            <div className="testimonial">
              <div className="testimonial-content">
                "NoteShare transformed how our team collaborates on research. The intuitive interface makes knowledge sharing effortless."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">SR</div>
                <div className="author-info">
                  <strong>Sarah Rodriguez</strong>
                  <span>Research Team Lead</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="auth-form-section">
          <div className="form-container">
            <div className="form-header">
              <div className="mode-icon">{modeConfig.icon}</div>
              <div className="header-text">
                <h2>{modeConfig.title}</h2>
                <p>{modeConfig.subtitle}</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    autoComplete="email"
                    className={`form-input ${email && !emailLooksValid ? 'error' : ''}`}
                  />
                  {email && (
                    <div className="input-icon">
                      {emailLooksValid ? '✓' : '✗'}
                    </div>
                  )}
                </div>
                {email && !emailLooksValid && (
                  <div className="input-error">Please enter a valid email address</div>
                )}
              </div>

              {mode !== 'reset' && (
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      required
                      placeholder="Enter your password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="form-input"
                    />
                    <button 
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {renderPasswordStrength()}
                </div>
              )}

              {mode === 'signup' && (
                <div className="input-group">
                  <label className="input-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      className={`form-input ${confirm && pass !== confirm ? 'error' : ''}`}
                    />
                    <button 
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirm && pass !== confirm && (
                    <div className="input-error">Passwords do not match</div>
                  )}
                </div>
              )}

              {mode === 'login' && (
                <div className="form-options">
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span className="checkmark"></span>
                    Remember me
                  </label>
                  <button 
                    type="button" 
                    className="forgot-password"
                    onClick={() => switchMode('reset')}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 9V11M12 15H12.01M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
                  </svg>
                  {error}
                </div>
              )}

              {info && (
                <div className="info-message">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12L11 14L15 10M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
                  </svg>
                  {info}
                </div>
              )}

              <button 
                type="submit" 
                className="submit-button"
                disabled={busy || !emailLooksValid || (mode !== 'reset' && !pass)}
              >
                {busy ? (
                  <>
                    <div className="button-spinner"></div>
                    Processing...
                  </>
                ) : (
                  modeConfig.buttonText
                )}
              </button>

              <div className="auth-switch">
                {mode === 'login' ? (
                  <>
                    <span>Don't have an account?</span>
                    <button type="button" onClick={() => switchMode('signup')}>
                      Sign up now
                    </button>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <span>Already have an account?</span>
                    <button type="button" onClick={() => switchMode('login')}>
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    <span>Remember your password?</span>
                    <button type="button" onClick={() => switchMode('login')}>
                      Back to login
                    </button>
                  </>
                )}
              </div>

              <div className="auth-footer">
                <p>By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow: hidden;
        }

        .auth-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .bg-particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
          animation: float 20s ease-in-out infinite;
        }

        .particle-1 {
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .particle-2 {
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, #a55eea, #26de81);
          top: 60%;
          right: 10%;
          animation-delay: -7s;
        }

        .particle-3 {
          width: 150px;
          height: 150px;
          background: linear-gradient(45deg, #feca57, #ff9ff3);
          bottom: 20%;
          left: 20%;
          animation-delay: -14s;
        }

        .particle-4 {
          width: 250px;
          height: 250px;
          background: linear-gradient(45deg, #4facfe, #00f2fe);
          top: 30%;
          left: 60%;
          animation-delay: -5s;
        }

        .auth-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          position: relative;
          z-index: 2;
        }

        /* Hero Section */
        .auth-hero {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: white;
        }

        .hero-content {
          max-width: 500px;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .brand-text {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 700;
          line-height: 1.1;
          margin: 0 0 1.5rem 0;
        }

        .title-accent {
          background: linear-gradient(135deg, #feca57, #ff9ff3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          opacity: 0.9;
          margin-bottom: 3rem;
          line-height: 1.6;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .feature-icon {
          font-size: 1.5rem;
          opacity: 0.9;
        }

        .feature-text {
          display: flex;
          flex-direction: column;
        }

        .feature-text strong {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .feature-text span {
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .testimonial {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .testimonial-content {
          font-style: italic;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .author-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: white;
        }

        .author-info {
          display: flex;
          flex-direction: column;
        }

        /* Form Section */
        .auth-form-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: white;
        }

        .form-container {
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .mode-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .form-header h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .form-header p {
          color: #6b7280;
          margin: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-input.error {
          border-color: #ef4444;
        }

        .input-icon {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #10b981;
        }

        .form-input.error + .input-icon {
          color: #ef4444;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;
        }

        .input-error {
          color: #ef4444;
          font-size: 0.875rem;
        }

        .password-strength {
          margin-top: 0.5rem;
        }

        .strength-bar {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .strength-fill {
          height: 100%;
          transition: all 0.3s ease;
          border-radius: 2px;
        }

        .strength-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .forgot-password {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          text-decoration: underline;
        }

        .error-message, .info-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .info-message {
          background: #f0fdf4;
          color: #059669;
          border: 1px solid #bbf7d0;
        }

        .submit-button {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .auth-switch {
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .auth-switch button {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-weight: 600;
          margin-left: 0.5rem;
        }

        .auth-footer {
          text-align: center;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 1rem;
        }

        .auth-footer a {
          color: #3b82f6;
          text-decoration: none;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .auth-content {
            grid-template-columns: 1fr;
          }
          
          .auth-hero {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .auth-container {
            padding: 1rem;
          }
          
          .auth-form-section {
            padding: 1rem;
          }
          
          .form-header h2 {
            font-size: 1.75rem;
          }
          
          .hero-title {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}