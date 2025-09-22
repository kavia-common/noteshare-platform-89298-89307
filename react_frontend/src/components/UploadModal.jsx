import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * UploadModal uploads a PDF file to Supabase Storage bucket "notes" and inserts
 * metadata into a "notes" table. It includes premium UI details and strong validation.
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

  const maxMb = Number(process.env.REACT_APP_MAX_UPLOAD_MB || 50);
  const maxBytes = Number.isFinite(maxMb) && maxMb > 0 ? maxMb * 1024 * 1024 : 50 * 1024 * 1024;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError('');
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
    if (!file) return setError('Please select a PDF to upload.');
    if (!title.trim()) return setError('Title is required.');

    setBusy(true);
    try {
      const isPdfMime = file.type === 'application/pdf';
      const isPdfExt = /\.pdf$/i.test(file.name || '');
      if (!(isPdfMime || isPdfExt)) throw new Error('Only PDF files are allowed.');
      if (file.size > maxBytes) throw new Error(`File is too large. Maximum allowed is ${maxMb} MB.`);

      const fileName = `${Date.now()}_${file.name}`;
      const { data: up, error: upErr } = await supabase.storage
        .from('notes')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('notes').getPublicUrl(up.path);
      const publicUrl = pub?.publicUrl;

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

      onUploaded?.();
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
        <div style={{
          padding: 18,
          background: 'linear-gradient(180deg, rgba(37,99,235,0.08), rgba(255,255,255,0.9))',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div className="kicker">Upload</div>
          <button className="btn" onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={doUpload} style={{ padding: 18, display: 'grid', gap: 12 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Title</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Linear Algebra Notes" />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Description</div>
            <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Brief summary, topics covered, or helpful notes…" />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Author</div>
            <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name or source" />
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
            <input
              className="input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              required
              aria-describedby="file-help"
            />
            <div id="file-help" className="helper">
              Only PDF files are allowed. Max size: {maxMb} MB.
            </div>
          </label>

          {error && (
            <div role="alert" aria-live="polite" style={{ color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button disabled={busy} className="btn btn-primary" type="submit">{busy ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
