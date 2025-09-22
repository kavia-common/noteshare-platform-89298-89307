import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getURL } from '../utils/getURL';

// PUBLIC_INTERFACE
export default function AuthPage() {
  /** Login/Signup with Supabase email/password, using Ocean Professional styling. */
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const doAuth = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (err) throw err;
        navigate('/');
      } else {
        const redirectTo = getURL();
        const { error: err } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            emailRedirectTo: redirectTo
          }
        });
        if (err) throw err;
        alert('Signup successful. Please check your email for verification link.');
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: 480 }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 18, background: 'linear-gradient(180deg, rgba(37,99,235,0.10), #fff)' }}>
          <div className="kicker">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
          <h2 style={{ margin: '6px 0 0 0' }}>NoteShare</h2>
        </div>
        <form onSubmit={doAuth} style={{ padding: 18, display: 'grid', gap: 12 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Email</div>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Password</div>
            <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required placeholder="••••••••" />
          </label>
          {error && <div role="alert" aria-live="polite" style={{ color: 'var(--color-error)' }}>{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Please wait…' : (mode === 'login' ? 'Log In' : 'Sign Up')}
          </button>
          <button type="button" className="btn" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
          </button>
        </form>
      </div>
    </main>
  );
}
