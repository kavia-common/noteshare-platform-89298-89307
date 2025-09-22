import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getURL } from '../utils/getURL';

// PUBLIC_INTERFACE
export default function AuthPage() {
  /**
   * Login/Signup with Supabase email/password:
   * - Strong password validation on signup
   * - Clear error mapping for common Supabase errors
   * - Email verification guidance after signup
   * - Password reset flow
   * - Explicit post-auth redirect and UX improvements
   */
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
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

  // Password policy: at least 8 chars, include a number and a letter
  const passIssues = useMemo(() => {
    if (mode !== 'signup') return [];
    const issues = [];
    if (pass.length < 8) issues.push('At least 8 characters');
    if (!/[a-zA-Z]/.test(pass)) issues.push('Include a letter');
    if (!/[0-9]/.test(pass)) issues.push('Include a number');
    if (confirm && pass !== confirm) issues.push('Passwords must match');
    return issues;
  }, [pass, confirm, mode]);

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
      return 'Password too weak. Use at least 8 characters with letters and numbers.';
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
  };

  const doLogin = async () => {
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (err) throw err;

    // After successful login, redirect explicitly
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
    const redirectTo = getURL(); // Must be allowed in Supabase URL settings
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: redirectTo
      }
    });
    if (err) throw err;

    // On many configs, session is null until email verified:
    if (!data?.session) {
      setInfo('Signup successful. Please check your email and click the verification link to complete sign-in.');
    } else {
      // In case auto-confirm is enabled in the project
      navigate('/', { replace: true });
    }
  };

  const doReset = async () => {
    if (!emailLooksValid) {
      throw new Error('Please enter a valid email address.');
    }
    // Send password reset email
    const redirectTo = getURL();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    if (err) throw err;
    setInfo('Password reset email sent. Check your inbox and follow the link to set a new password.');
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
        // Stay on page to show verification info if session not present
      } else if (mode === 'reset') {
        await doReset();
      }
    } catch (err) {
      const friendly = mapAuthError(err);
      setError(friendly + ' (See Troubleshoot for help)');
    } finally {
      setBusy(false);
    }
  };

  const renderPasswordHelpers = () => {
    if (mode !== 'signup') return null;
    const hasIssue = passIssues.length > 0;
    return (
      <div className="helper" style={{ color: hasIssue ? 'var(--color-error)' : 'inherit' }}>
        Password requirements:
        <ul style={{ margin: '6px 0 0 18px' }}>
          <li style={{ color: pass.length >= 8 ? 'green' : 'inherit' }}>At least 8 characters</li>
          <li style={{ color: /[a-zA-Z]/.test(pass) ? 'green' : 'inherit' }}>Include a letter</li>
          <li style={{ color: /[0-9]/.test(pass) ? 'green' : 'inherit' }}>Include a number</li>
          <li style={{ color: confirm && pass === confirm ? 'green' : 'inherit' }}>Passwords match</li>
        </ul>
      </div>
    );
  };

  return (
    <main className="container" style={{ maxWidth: 980 }}>
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="kicker">NoteShare</div>
            <h2 className="h1-gradient" style={{ fontSize: 28, marginTop: 8 }}>Your library, beautifully organized.</h2>
            <p className="helper" style={{ marginTop: 8 }}>
              Upload PDFs, browse elegant previews, and share knowledge. Powered by Supabase Auth and Storage.
            </p>
            <ul className="helper" style={{ marginTop: 14, lineHeight: 1.6 }}>
              <li>Secure email authentication</li>
              <li>Public previews with smooth performance</li>
              <li>Fast search and category filters</li>
            </ul>
          </div>
        </div>
        <div className="auth-form">
          <div style={{ paddingBottom: 8 }}>
            <div className="kicker">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </div>
            <h2 style={{ margin: '6px 0 0 0' }}>Sign {mode === 'login' ? 'in' : mode === 'signup' ? 'up' : 'reset'}</h2>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <label>
              <div className="kicker" style={{ marginBottom: 6 }}>Email</div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={email.length > 0 && !emailLooksValid}
              />
            </label>

            {mode !== 'reset' && (
              <label>
                <div className="kicker" style={{ marginBottom: 6 }}>Password</div>
                <input
                  className="input"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
            )}

            {mode === 'signup' && (
              <label>
                <div className="kicker" style={{ marginBottom: 6 }}>Confirm Password</div>
                <input
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </label>
            )}

            {renderPasswordHelpers()}

            {error && (
              <div role="alert" aria-live="polite" style={{ color: 'var(--color-error)' }}>
                {error}
              </div>
            )}
            {!error && info && (
              <div role="status" aria-live="polite" className="helper" style={{ color: 'green' }}>
                {info}
              </div>
            )}

            <button className="btn btn-primary" disabled={busy || (mode !== 'reset' && !emailLooksValid)} type="submit">
              {busy ? 'Please wait…' :
                mode === 'login' ? 'Log In' :
                mode === 'signup' ? 'Sign Up' : 'Send Reset Email'}
            </button>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {mode !== 'login' && (
                <button type="button" className="btn" onClick={() => switchMode('login')}>
                  Have an account? Log in
                </button>
              )}
              {mode !== 'signup' && (
                <button type="button" className="btn" onClick={() => switchMode('signup')}>
                  Need an account? Sign up
                </button>
              )}
              {mode !== 'reset' && (
                <button type="button" className="btn btn-outlined" onClick={() => switchMode('reset')}>
                  Forgot password?
                </button>
              )}
            </div>

            <div className="helper" style={{ marginTop: 8 }}>
              Tip: After signing up, we send a verification link. Ensure your Supabase Authentication URL settings include:
              <br />
              <code>{getURL()}</code>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
