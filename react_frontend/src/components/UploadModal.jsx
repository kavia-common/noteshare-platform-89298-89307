import { useEffect, useState } from 'react';
import { supabase, requireAuthSession, getCurrentUser } from '../lib/supabaseClient';

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
  const [hasSession, setHasSession] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const maxMb = Number(process.env.REACT_APP_MAX_UPLOAD_MB || 50);
  const maxBytes = Number.isFinite(maxMb) && maxMb > 0 ? maxMb * 1024 * 1024 : 50 * 1024 * 1024;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) {
          setHasSession(false);
        } else {
          setHasSession(Boolean(data?.session));
        }
      } catch {
        if (active) setHasSession(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setHasSession(Boolean(session));
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError('');
    setWarning('');
    setSuccess('');
    setUploadProgress(0);
    
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
    setUploadProgress(0);

    if (!hasSession) {
      setError('You are not signed in. Please log in to upload notes.');
      return;
    }
    if (!file) return setError('Please select a PDF to upload.');
    if (!title.trim()) return setError('Title is required.');

    setBusy(true);
    try {
      const { data: preData, error: preErr } = await supabase.auth.getSession();
      console.log('[UploadModal] pre-insert getSession()', {
        hasError: Boolean(preErr),
        error: preErr?.message,
        hasSession: Boolean(preData?.session),
        userId: preData?.session?.user?.id || null,
        accessTokenPresent: Boolean(preData?.session?.access_token),
      });

      const session = await requireAuthSession();
      const user = await getCurrentUser();
      if (!session || !user) {
        throw new Error('You must be logged in to upload files.');
      }

      const isPdfMime = file.type === 'application/pdf';
      const isPdfExt = /\.pdf$/i.test(file.name || '');
      if (!(isPdfMime || isPdfExt)) throw new Error('Only PDF files are allowed.');
      if (file.size > maxBytes) throw new Error(`File is too large. Maximum allowed is ${maxMb} MB.`);

      const userId = user.id;
      const dt = new Date();
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const baseName = (file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectPath = `${userId}/${yyyy}/${mm}/${Date.now()}_${baseName}`;

      // Upload with progress tracking
      const { data: up, error: upErr } = await supabase.storage
        .from('notes')
        .upload(objectPath, file, { 
          contentType: 'application/pdf', 
          upsert: false,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            setUploadProgress(percentage);
          }
        });
        
      if (upErr) throw upErr;
      if (!up?.path) throw new Error('Upload failed to return a file path.');

      const { data: pub } = supabase.storage.from('notes').getPublicUrl(up.path);
      const publicUrl = pub?.publicUrl || null;

      if (!publicUrl) {
        setWarning(
          'Upload succeeded, but preview URL is not public. ' +
          'Ensure the "notes" bucket is public or switch to signed URLs.'
        );
      }

      const insertPayload = {
        title,
        description: desc,
        author,
        category,
        file_path: up.path,
        file_size: file.size,
        public_url: publicUrl,
      };

      console.log('[UploadModal] about to insert notes row', {
        userId,
        sendingOwnerColumn: Object.prototype.hasOwnProperty.call(insertPayload, 'owner'),
        payloadKeys: Object.keys(insertPayload),
        payloadPreview: {
          title: insertPayload.title,
          category: insertPayload.category,
          file_path: insertPayload.file_path,
          file_size: insertPayload.file_size,
          public_url: Boolean(insertPayload.public_url),
        }
      });

      const { error: dbErr } = await supabase.from('notes').insert(insertPayload);
      if (dbErr) {
        console.error('[UploadModal] DB insert error', dbErr);
        throw dbErr;
      }

      setUploadProgress(100);
      setSuccess('Upload complete! Your note was added to the library.');
      onUploaded?.();
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      const raw = err?.message || 'Upload failed.';
      const msg = raw.toLowerCase();
      let friendly = raw;

      if (msg.includes('must be logged in') || msg.includes('no current session') || msg.includes('not signed in')) {
        friendly = 'Please sign in to upload notes. Log in and try again.';
      } else if (msg.includes('permission') || msg.includes('not authorized') || msg.includes('401') || msg.includes('403')) {
        friendly = 'Upload unauthorized. Please log in and ensure a storage policy allows inserts to bucket "notes".';
      } else if (msg.includes('bucket') || msg.includes('not found') || msg.includes('object not found')) {
        friendly = 'Storage bucket "notes" not found. Create a public bucket named "notes" in Supabase Storage.';
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
        friendly = 'Network error during upload. Check your connection and Supabase URL.';
      } else if (msg.includes('conflict')) {
        friendly = 'A file with this name already exists. Please try again.';
      } else if (msg.includes('row level security') || msg.includes('rls') || msg.includes('violates row-level security policy') || msg.includes('new row violates')) {
        friendly = 'Database insert blocked by RLS. Ensure you are signed in and proper policies are configured.';
      }
      setError(friendly + ' (See Troubleshoot for help)');
      console.error('[UploadModal] Upload failure diagnostics', err);
    } finally {
      setBusy(false);
    }
  };

  const disabledSubmit = busy || !hasSession;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Upload PDF">
      <div className="modal-container">
        <div className="modal-header">
          <div className="header-content">
            <div className="modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M16 17H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="modal-subtitle">Upload Document</div>
              <div className="modal-title">Add a new PDF note</div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="Close" disabled={busy}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={doUpload} className="modal-form">
          {!hasSession && (
            <div className="alert alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 9V11M12 15H12.01M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
              </svg>
              You are not signed in. Please log in to upload notes.
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <span>Title</span>
                <span className="required">*</span>
              </label>
              <input 
                className="form-input" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                placeholder="e.g., Linear Algebra Notes" 
                disabled={busy || !hasSession} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                className="form-textarea" 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                rows={3} 
                placeholder="Brief summary, topics covered, or helpful notes…" 
                disabled={busy || !hasSession} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Author</label>
              <input 
                className="form-input" 
                value={author} 
                onChange={(e) => setAuthor(e.target.value)} 
                placeholder="Your name or source" 
                disabled={busy || !hasSession} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-select" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                disabled={busy || !hasSession}
              >
                <option value="math">Mathematics</option>
                <option value="cs">Computer Science</option>
                <option value="physics">Physics</option>
                <option value="biology">Biology</option>
                <option value="business">Business</option>
                <option value="literature">Literature</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>PDF File</span>
                <span className="required">*</span>
              </label>
              <div className="file-upload">
                <input
                  className="file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  required
                  disabled={busy || !hasSession}
                />
                <div className="file-display">
                  {file ? (
                    <div className="file-selected">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12L11 14L15 10M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
                      </svg>
                      <span>{file.name}</span>
                      <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
                        <path d="M14 2V8H20"/>
                        <path d="M16 13H8"/>
                        <path d="M16 17H8"/>
                        <path d="M10 9H9H8"/>
                      </svg>
                      <span>Choose PDF file</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-help">Only PDF files are allowed. Max size: {maxMb} MB.</div>
            </div>
          </div>

          {busy && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="progress-text">Uploading... {Math.round(uploadProgress)}%</div>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 14L12 12M12 12L14 10M12 12L10 10M12 12L14 14M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
              </svg>
              {error}
            </div>
          )}

          {!error && warning && (
            <div className="alert alert-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 9V11M12 15H12.01M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
              </svg>
              {warning}
            </div>
          )}

          {!error && success && (
            <div className="alert alert-success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12L11 14L15 10M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
              </svg>
              {success}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button disabled={disabledSubmit} className="btn btn-primary" type="submit">
              {busy ? (
                <>
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24">
                    <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.0784 19.0784L16.25 16.25M19.0784 4.99994L16.25 7.82837M4.92157 19.0784L7.75 16.25M4.92157 4.99994L7.75 7.82837" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Uploading...
                </>
              ) : hasSession ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 15H13V9H16L12 4L8 9H11V15Z"/>
                    <path d="M20 18H4V11H2V18C2 19.103 2.897 20 4 20H20C21.103 20 22 19.103 22 18V11H20V18Z"/>
                  </svg>
                  Upload PDF
                </>
              ) : (
                'Login Required'
              )}
            </button>
          </div>
        </form>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            padding: 1.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-radius: 20px 20px 0 0;
          }

          .header-content {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .modal-icon {
            margin-top: 0.25rem;
          }

          .modal-subtitle {
            font-size: 0.875rem;
            opacity: 0.9;
            margin-bottom: 0.25rem;
          }

          .modal-title {
            font-size: 1.25rem;
            font-weight: 600;
          }

          .close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 8px;
            padding: 0.5rem;
            color: white;
            cursor: pointer;
            transition: background 0.2s;
          }

          .close-btn:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.3);
          }

          .close-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-form {
            padding: 1.5rem;
          }

          .form-grid {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }

          .required {
            color: #ef4444;
          }

          .form-input, .form-textarea, .form-select {
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            font-size: 0.875rem;
            transition: all 0.2s;
            background: white;
          }

          .form-input:focus, .form-textarea:focus, .form-select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .form-input:disabled, .form-textarea:disabled, .form-select:disabled {
            background: #f9fafb;
            color: #6b7280;
            cursor: not-allowed;
          }

          .file-upload {
            position: relative;
          }

          .file-input {
            position: absolute;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
          }

          .file-input:disabled {
            cursor: not-allowed;
          }

          .file-display {
            border: 2px dashed #d1d5db;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.2s;
          }

          .file-input:not(:disabled):hover + .file-display {
            border-color: #3b82f6;
            background: #f8fafc;
          }

          .file-selected {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            color: #059669;
          }

          .file-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            color: #6b7280;
          }

          .file-size {
            font-size: 0.875rem;
            opacity: 0.7;
          }

          .form-help {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.25rem;
          }

          .upload-progress {
            margin-bottom: 1rem;
          }

          .progress-bar {
            width: 100%;
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 0.5rem;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            border-radius: 3px;
            transition: width 0.3s ease;
          }

          .progress-text {
            font-size: 0.875rem;
            color: #6b7280;
            text-align: center;
          }

          .alert {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
          }

          .alert-error {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .alert-warning {
            background: #fffbeb;
            color: #d97706;
            border: 1px solid #fed7aa;
          }

          .alert-success {
            background: #f0fdf4;
            color: #059669;
            border: 1px solid #bbf7d0;
          }

          .modal-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
          }

          .btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
          }

          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
          }

          .btn-secondary {
            background: #f8fafc;
            color: #374151;
            border: 1px solid #e5e7eb;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #f1f5f9;
            border-color: #d1d5db;
          }

          .btn-primary {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: 1px solid #3b82f6;
          }

          .btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }

          .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @media (max-width: 640px) {
            .modal-container {
              margin: 1rem;
            }
            
            .modal-header {
              padding: 1rem;
            }
            
            .modal-form {
              padding: 1rem;
            }
            
            .modal-actions {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </div>
  );
}