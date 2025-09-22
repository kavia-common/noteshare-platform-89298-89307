import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * UploadModal uploads a PDF file to Supabase Storage bucket "notes" and
 * inserts metadata into a "notes" table.
 * Required Supabase setup:
 * - Storage bucket: notes (public)
 * - Table: notes (id uuid pk default gen_random_uuid(), title text, description text, author text, category text, file_path text, file_size bigint, public_url text, created_at timestamptz default now())
 *   with Row Level Security enabled and suitable policies for read/insert by authenticated users.
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

  const doUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please select a PDF to upload.');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setBusy(true);
    try {
      // Upload to Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: up, error: upErr } = await supabase.storage
        .from('notes')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;

      // Build public URL
      const { data: pub } = supabase.storage.from('notes').getPublicUrl(up.path);
      const publicUrl = pub?.publicUrl;

      // Insert metadata
      const { error: dbErr } = await supabase.from('notes').insert({
        title,
        description: desc,
        author,
        category,
        file_path: up.path,
        file_size: file.size,
        public_url: publicUrl,
      });
      if (dbErr) throw dbErr;

      // Notify parent about successful upload so it can refresh dashboard
      onUploaded?.();

      // Close the modal
      onClose?.();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Upload PDF">
      <div className="modal">
        <div style={{ padding: 18, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="kicker">Upload</div>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={doUpload} style={{ padding: 18, display: 'grid', gap: 12 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Title</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Description</div>
            <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Author</div>
            <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Category</div>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
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
            <input className="input" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            <div className="helper">Max size depends on your Supabase project limits.</div>
          </label>

          {error && <div style={{ color: 'var(--color-error)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button disabled={busy} className="btn btn-primary" type="submit">{busy ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
