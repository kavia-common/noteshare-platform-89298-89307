import { useState } from 'react';
import { supabase, requireAuthSession, getCurrentUser } from '../lib/supabaseClient';

/**
 * UploadModal uploads a PDF file to Supabase Storage bucket "notes" and inserts
 * metadata into a "notes" table. It includes premium UI details and strong validation.
 *
 * Security and policy notes:
 * - Requires an active Supabase auth session before upload.
 * - Storage policy must allow inserts for authenticated users on bucket_id='notes'.
 * - DB owner column defaults to auth.uid() to bind records to the uploader.
 */
// PUBLIC_INTERFACE
export default function UploadModal({ onClose, onUploaded }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('other');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');

  const maxMb = Number(process.env.REACT_APP_MAX_UPLOAD_MB || 50);
  const maxBytes = Number.isFinite(maxMb) && maxMb > 0 ? maxMb * 1024 * 1024 : 50 * 1024 * 1024;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError('');
    setWarning('');
    setSuccess('');
    if (!f) return;

    const isPdfMime = f.type === 'application/pdf';
    const isPdfExt = /\.pdf$/i.test(f.name || '');
    if (!(isPdfMime || isPdfExt)) {
      setError('Only PDF files are allowed.');
      return;
    }
    if (f.size > maxBytes) {
      const overBy = ((f.size - maxBytes) / (1024 * 1024)).toFixed(2);
      setError(`File is too large. Maximum allowed is ${maxMb} MB (over by ${overBy} MB).`);
      return;
    }
  };

  const doUpload = async (e) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setSuccess('');
    if (!file) return setError('Please select a PDF to upload.');
    if (!title.trim()) return setError('Title is required.');

    setBusy(true);
    try {
      // Ensure user is authenticated before any storage/db action
      const session = await requireAuthSession();
      const user = await getCurrentUser();
      if (!session || !user) {
        throw new Error('You must be logged in to upload files.');
      }

      // Validate again right before upload
      const isPdfMime = file.type === 'application/pdf';
      const isPdfExt = /\.pdf$/i.test(file.name || '');
      if (!(isPdfMime || isPdfExt)) throw new Error('Only PDF files are allowed.');
      if (file.size > maxBytes) throw new Error(`File is too large. Maximum allowed is ${maxMb} MB.`);

      // User-scoped path to avoid name collisions and to make object ownership auditable
      // Path pattern: userId/yyyy/mm/<timestamp>_<sanitized-name>.pdf
      const userId = user.id;
      const dt = new Date();
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const baseName = (file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectPath = `${userId}/${yyyy}/${mm}/${Date.now()}_${baseName}`;

      // Upload to Storage
      const { data: up, error: upErr } = await supabase.storage
        .from('notes')
        .upload(objectPath, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;

      // Attempt to build a public URL. If the bucket is not public, this may be null/empty.
      const { data: pub } = supabase.storage.from('notes').getPublicUrl(up.path);
      const publicUrl = pub?.publicUrl || null;

      if (!publicUrl) {
        // Provide user-facing guidance; still insert row so dashboard can show it and preview page can guide further.
        setWarning(
          'Upload succeeded, but preview URL is not public. ' +
          'Ensure the "notes" bucket is public or switch to signed URLs.'
        );
      }

      // Insert DB row; owner defaults to auth.uid() by DB default. We still provide file metadata.
      const insertPayload = {
        title,
        description: desc,
        author,
        category,
        file_path: up.path,
        file_size: file.size,
        public_url: publicUrl,
        // owner is intentionally omitted to allow DB default auth.uid()
      };

      const { error: dbErr } = await supabase.from('notes').insert(insertPayload);
      if (dbErr) throw dbErr;

      setSuccess('Upload complete! Your note was added to the library.');
      onUploaded?.();
      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (err) {
      const raw = err?.message || 'Upload failed.';
      const msg = raw.toLowerCase();
      let friendly = raw;

      // Refined error classification including auth/session checks
      if (msg.includes('must be logged in') || msg.includes('no current session')) {
        friendly = 'Please sign in to upload notes. Log in and try again.';
      } else if (msg.includes('permission') || msg.includes('not authorized') || msg.includes('401') || msg.includes('403')) {
        friendly = 'Upload unauthorized. Please log in and ensure a storage policy allows inserts to bucket "notes".';
      } else if (msg.includes('bucket') || msg.includes('not found') || msg.includes('object not found')) {
        friendly = 'Storage bucket "notes" not found. Create a public bucket named "notes" in Supabase Storage.';
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
        friendly = 'Network error during upload. Check your connection and Supabase URL.';
      } else if (msg.includes('conflict')) {
        friendly = 'A file with this name already exists. Please try again (we use a timestamp prefix to avoid collisions).';
      } else if (msg.includes('row level security') || msg.includes('rls') || msg.includes('violates row-level security policy')) {
        friendly = 'Database insert blocked by RLS. Ensure the "Allow insert for authenticated users" policy for public.notes is active.';
      } else if (msg.includes('new row violates row-level security policy')) {
        friendly = 'RLS prevented the insert. Make sure owner defaults to auth.uid() and the insert policy allows authenticated users.';
      }
      setError(friendly + ' (See Troubleshoot for help)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Upload PDF">
      <div className="modal">
        <div style={{
          padding: 18,
          background: 'linear-gradient(180deg, rgba(37,99,235,0.08), rgba(255,255,255,0.9))',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div className="kicker">Upload</div>
          <button className="btn" onClick={onClose} title="Close" disabled={busy}>✕</button>
        </div>
        <form onSubmit={doUpload} style={{ padding: 18, display: 'grid', gap: 12 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Title</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Linear Algebra Notes" disabled={busy} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Description</div>
            <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Brief summary, topics covered, or helpful notes…" disabled={busy} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Author</div>
            <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name or source" disabled={busy} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Category</div>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={busy}>
              <option value="math">Mathematics</option>
              <option value="cs">Computer Science</option>
              <option value="physics">Physics</option>
              <option value="biology">Biology</option>
              <option value="business">Business</option>
              <option value="literature">Literature</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>PDF File</div>
            <input
              className="input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              required
              aria-describedby="file-help"
              disabled={busy}
            />
            <div id="file-help" className="helper">
              Only PDF files are allowed. Max size: {maxMb} MB.
            </div>
          </label>

          {error && (
            <div role="alert" aria-live="polite" style={{ color: 'var(--color-error)' }}>
              {error} <a className="btn" href="/troubleshoot" style={{ marginLeft: 8 }}>Troubleshoot</a>
            </div>
          )}
          {!error && warning && (
            <div role="status" aria-live="polite" className="helper" style={{ color: '#92400E' }}>
              {warning}
            </div>
          )}
          {!error && success && (
            <div role="status" aria-live="polite" className="helper" style={{ color: 'green' }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button disabled={busy} className="btn btn-primary" type="submit">{busy ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
