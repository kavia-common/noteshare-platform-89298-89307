import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function ProfilePage() {
  /** Shows current user's basic auth profile with Ocean Professional styling. */
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, []);

  if (!user) {
    return <main className="container"><div className="helper">Loading profile…</div></main>;
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ padding: 18, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="kicker">Account</div>
          <h2 style={{ margin: '6px 0 0 0' }}>Profile</h2>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, display: 'grid', placeItems: 'center',
              background: 'rgba(37,99,235,0.10)', color: 'var(--color-primary)',
              border: '1px solid rgba(37,99,235,0.28)', fontWeight: 800, fontSize: 18,
              boxShadow: '0 4px 14px rgba(37,99,235,0.12)'
            }}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="title">Signed in</div>
              <div className="subtitle">{user.email}</div>
            </div>
          </div>
          <div><strong>User ID:</strong> <span className="helper">{user.id}</span></div>
          <div className="helper">Extend this page with preferences, uploads, and account controls.</div>
        </div>
      </div>
    </main>
  );
}
