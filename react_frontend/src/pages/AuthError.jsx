import { Link, useSearchParams } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function AuthError() {
  /** Displays a friendly authentication error with guidance and a link back to login. */
  const [params] = useSearchParams();
  const type = (params.get('type') || '').toLowerCase();

  let title = 'Authentication Error';
  let message =
    'Something went wrong during sign-in. Please try again. If the problem persists, contact support.';

  switch (type) {
    case 'redirect':
      title = 'Redirect Configuration Issue';
      message =
        'We could not complete the login redirect. Ensure your Supabase Authentication URL settings include this site URL and try again.';
      break;
    case 'email':
      title = 'Email Issue';
      message =
        'We had trouble with your email confirmation or verification. Please check your inbox and try again.';
      break;
    case 'expired':
      title = 'Link Expired';
      message =
        'This sign-in link has expired or was already used. Please request a new login link or try signing in again.';
      break;
    default:
      break;
  }

  return (
    <main className="container" style={{ maxWidth: 640 }}>
      <div className="card" role="alert" aria-live="polite">
        <div style={{ padding: 18, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="kicker">Auth</div>
          <h2 style={{ margin: '6px 0 0 0', color: 'var(--color-error)' }}>{title}</h2>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          <div className="helper" style={{ fontSize: 14 }}>{message}</div>
          <div>
            <Link to="/login" className="btn btn-primary" aria-label="Back to login">
              Back to Login
            </Link>
            <Link to="/" className="btn" style={{ marginLeft: 8 }}>
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
