import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getURL } from '../utils/getURL';

// PUBLIC_INTERFACE
export default function Troubleshoot() {
  /** 
   * Runs quick diagnostics for common Supabase configuration issues:
   * - Env variables present and look valid
   * - Can reach Supabase (project info)
   * - Auth anon key validity by performing a lightweight call
   * - Auth redirect URL guidance
   * - Storage bucket presence and public URL generation
   * Results are shown with actionable instructions when a check fails.
   */
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const envUrl = process.env.REACT_APP_SUPABASE_URL || '';
  const envKey = process.env.REACT_APP_SUPABASE_KEY || '';
  const siteUrl = getURL();

  const add = (entry) => setResults((prev) => [...prev, entry]);

  const maskKey = (k) => {
    if (!k) return '';
    if (k.length <= 8) return '********';
    return `${k.slice(0, 6)}...${k.slice(-4)}`;
  };

  const urlLooksValid = useMemo(() => {
    try {
      const u = new URL(envUrl);
      return u.protocol.startsWith('http') && u.hostname.length > 0;
    } catch {
      return false;
    }
  }, [envUrl]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setRunning(true);
      setResults([]);

      // Check env presence
      add({
        title: 'Environment variables',
        ok: Boolean(envUrl && envKey),
        detail: `REACT_APP_SUPABASE_URL=${envUrl || '(missing)'} | REACT_APP_SUPABASE_KEY=${maskKey(envKey) || '(missing)'}`,
        fix: 'Add these to react_frontend/.env. Restart dev server after changes.'
      });

      // URL format
      add({
        title: 'Supabase URL format',
        ok: urlLooksValid,
        detail: envUrl || '(missing)',
        fix: 'Use the URL from Supabase Project Settings > API (e.g., https://xyz.supabase.co).'
      });

      // Project info fetch as connectivity test
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        add({
          title: 'Anon key validity (auth.getSession)',
          ok: !error,
          detail: error ? (error.message || 'Failed') : 'OK',
          fix: 'Use anon public key from Project Settings > API (do not use service_role key).',
        });

        // Attempt to fetch from a public table (notes) to see if DB is reachable (will succeed or show RLS errors)
        const { data: notesData, error: notesErr } = await supabase
          .from('notes')
          .select('*')
          .limit(1);
        if (!cancelled) {
          add({
            title: 'Database connectivity (public.notes select)',
            ok: !notesErr,
            detail: notesErr ? (notesErr.message || 'Error') : `OK (${notesData?.length || 0} rows sample)`,
            fix: 'Ensure table public.notes exists and policy "Allow select for all users" is created per assets/supabase.md.',
          });
        }
      } catch (e) {
        if (!cancelled) {
          add({
            title: 'Supabase connectivity',
            ok: false,
            detail: e?.message || String(e),
            fix: 'Check URL and anon key. Verify network connectivity. See Supabase > API for correct values.',
          });
        }
      }

      // Auth redirect guidance
      add({
        title: 'Auth redirect URL',
        ok: Boolean(siteUrl && siteUrl.startsWith('http')),
        detail: `Using ${siteUrl} (from REACT_APP_SITE_URL or window.location.origin)`,
        fix: 'In Supabase > Authentication > URL Configuration set Site URL to this value and include redirect URL patterns (e.g., http://localhost:3000/**).',
      });

      // Storage checks: try to create a public URL for a fake path; also list bucket to infer existence
      try {
        const bucket = 'notes';
        // getPublicUrl for a fake path will not fail—just returns a URL pattern; used to show base URL.
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl('example.pdf');
        // Attempt to list first object to check permission/bucket existence (will likely return 404 -> error.message includes 'No such file or directory' or similar)
        const { data: listData, error: listErr } = await supabase.storage.from(bucket).list('', { limit: 1 });
        const ok = !listErr || (listErr?.message || '').toLowerCase().includes('not found') || Array.isArray(listData);

        add({
          title: 'Storage bucket "notes"',
          ok,
          detail: pub?.publicUrl ? `Public URL base OK: ${new URL(pub.publicUrl).origin}` : 'No public URL generated',
          fix: 'Create a public bucket named "notes". Add insert policy for authenticated users. See assets/supabase.md.',
        });
      } catch (e) {
        add({
          title: 'Storage configuration',
          ok: false,
          detail: e?.message || String(e),
          fix: 'Ensure bucket "notes" exists and is public. Add RLS policy to allow inserts by authenticated users.',
        });
      }

      setRunning(false);
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="container" style={{ maxWidth: 900 }}>
      <div className="card">
        <div style={{ padding: 18, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="kicker">Diagnostics</div>
          <h2 style={{ margin: '6px 0 0 0' }}>Supabase Troubleshooter</h2>
          <div className="helper" style={{ marginTop: 6 }}>
            Runs checks for common causes of "invalid credentials" and upload failures. 
            Refer to <Link to="/auth/error">Auth Error Help</Link> and assets/supabase.md for fixes.
            Ensure your Authentication URL settings include your Site URL and allow redirect to <code>/auth/callback</code>.
          </div>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          {running && <div className="helper">Running checks…</div>}
          {!running && results.length === 0 && <div className="helper">No results.</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {results.map((r, idx) => (
              <li key={idx} className="card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="title">{r.title}</div>
                  <div className="badge" style={{ color: r.ok ? 'green' : 'var(--color-error)', borderColor: r.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', background: r.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                    {r.ok ? 'OK' : 'Needs attention'}
                  </div>
                </div>
                <div className="helper" style={{ marginTop: 6 }}>
                  {r.detail}
                </div>
                {!r.ok && (
                  <div style={{ marginTop: 8 }}>
                    <div className="kicker" style={{ marginBottom: 4 }}>How to fix</div>
                    <div className="helper">{r.fix}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 8 }}>
            <Link to="/" className="btn">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
