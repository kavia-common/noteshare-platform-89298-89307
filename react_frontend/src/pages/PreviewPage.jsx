import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function PreviewPage() {
  /**
   * Loads a single note by id and renders a PDF preview.
   * If the public_url is missing or not accessible, shows a friendly guidance message.
   */
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [err, setErr] = useState('');
  const [urlStatus, setUrlStatus] = useState({ checked: false, ok: false });

  // Fetch note by id
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from('notes').select('*').eq('id', id).single();
      if (!active) return;
      if (error) setErr(error.message || 'Failed to load note.');
      else setNote(data);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Validate URL format
  const hasValidUrl = useMemo(() => {
    const u = note?.public_url;
    if (!u || typeof u !== 'string') return false;
    try {
      // eslint-disable-next-line no-new
      new URL(u);
      return true;
    } catch {
      return false;
    }
  }, [note?.public_url]);

  // Probe accessibility of the public_url without blocking initial render.
  useEffect(() => {
    let cancelled = false;

    const checkUrl = async () => {
      // If there is no valid URL, mark checked so the UI can show guidance.
      if (!hasValidUrl) {
        setUrlStatus({ checked: true, ok: false });
        return;
      }

      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000); // 5s timeout
        // Use GET with mode: 'no-cors' to avoid CORS issues interfering with basic reachability.
        await fetch(note.public_url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
        clearTimeout(t);
        if (!cancelled) setUrlStatus({ checked: true, ok: true });
      } catch {
        if (!cancelled) setUrlStatus({ checked: true, ok: false });
      }
    };

    if (note) checkUrl();
    return () => {
      cancelled = true;
    };
  }, [note, hasValidUrl]);

  if (err) {
    return (
      <main className="container">
        <div role="alert" style={{ color: 'var(--color-error)' }}>{err}</div>
      </main>
    );
  }
  if (!note) {
    return (
      <main className="container">
        <div className="helper">Loading…</div>
      </main>
    );
  }

  const showUnavailable = !hasValidUrl || (urlStatus.checked && !urlStatus.ok);

  return (
    <main className="container">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="kicker">{(note.category || 'General').toUpperCase()}</div>
          <h1 style={{ margin: '6px 0 0 0' }}>{note.title}</h1>
          <div className="helper">{note.author ? `by ${note.author}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            className="btn"
            href={note.public_url || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!hasValidUrl}
            onClick={(e) => { if (!hasValidUrl) e.preventDefault(); }}
          >
            🔗 Open
          </a>
          <a
            className="btn btn-primary"
            href={note.public_url || '#'}
            download
            aria-disabled={!hasValidUrl}
            onClick={(e) => { if (!hasValidUrl) e.preventDefault(); }}
          >
            ⬇ Download
          </a>
        </div>
      </div>

      {showUnavailable ? (
        <div className="card" role="alert" aria-live="polite" style={{ padding: 16 }}>
          <div className="kicker" style={{ marginBottom: 6, color: 'var(--color-error)' }}>Preview unavailable</div>
          <div style={{ marginBottom: 8 }}>
            This file is unavailable or the storage bucket&apos;s public access is not enabled.
          </div>
          <ul className="helper" style={{ margin: '0 0 8px 18px' }}>
            <li>Please check Supabase Storage bucket policies and public_url.</li>
            <li>Ensure the "notes" bucket is public, or use signed URLs and update the app accordingly.</li>
            <li>Confirm that a valid public_url was stored for this note record.</li>
          </ul>
          {note.file_path && (
            <div className="helper">
              File path: <code>{note.file_path}</code>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 12 }}>
          <iframe
            title="PDF Preview"
            src={note.public_url}
            style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 12 }}
          />
        </div>
      )}
    </main>
  );
}
