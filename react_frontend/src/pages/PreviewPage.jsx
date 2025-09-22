import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function PreviewPage() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlStatus, setUrlStatus] = useState({ checked: false, ok: false });
  const [pdfLoading, setPdfLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');

  // Category color mapping
  const categoryConfig = {
    math: { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    cs: { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    physics: { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    biology: { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
    business: { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    literature: { color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
    other: { color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)' }
  };

  // Fetch note by id
  useEffect(() => {
    let active = true;
    setLoading(true);
    
    (async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!active) return;
        
        if (error) {
          setError(error.message || 'Failed to load note.');
        } else {
          setNote(data);
        }
      } catch (err) {
        setError('An unexpected error occurred while loading the note.');
      } finally {
        if (active) setLoading(false);
      }
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
      new URL(u);
      return true;
    } catch {
      return false;
    }
  }, [note?.public_url]);

  // Check URL accessibility
  useEffect(() => {
    let cancelled = false;

    const checkUrl = async () => {
      if (!hasValidUrl) {
        setUrlStatus({ checked: true, ok: false });
        return;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        await fetch(note.public_url, { 
          method: 'HEAD', 
          mode: 'no-cors', 
          signal: controller.signal 
        });
        
        clearTimeout(timeout);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryConfig = (category) => {
    return categoryConfig[category] || categoryConfig.other;
  };

  if (loading) {
    return (
      <div className="preview-loading">
        <div className="loading-spinner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.0784 19.0784L16.25 16.25M19.0784 4.99994L16.25 7.82837M4.92157 19.0784L7.75 16.25M4.92157 4.99994L7.75 7.82837" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2>Loading Document</h2>
        <p>Preparing your preview...</p>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="preview-error">
        <div className="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V11M12 15H12.01M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z" 
                  stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <h2>Document Not Available</h2>
        <p>{error || 'The requested document could not be found.'}</p>
        <Link to="/" className="back-button">
          ← Back to Library
        </Link>
      </div>
    );
  }

  const showUnavailable = !hasValidUrl || (urlStatus.checked && !urlStatus.ok);
  const categoryConfigItem = getCategoryConfig(note.category);

  return (
    <div className="preview-container">
      {/* Header Section */}
      <header className="preview-header">
        <div className="header-content">
          <Link to="/" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 12H5M12 19L5 12L12 5"/>
            </svg>
            Back to Library
          </Link>
          
          <div className="document-meta">
            <span 
              className="category-badge"
              style={{ background: categoryConfigItem.gradient }}
            >
              {note.category || 'General'}
            </span>
            <span className="upload-date">
              Uploaded {formatDate(note.created_at)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="preview-main">
        {/* Document Header */}
        <section className="document-header">
          <div className="title-section">
            <h1 className="document-title">{note.title}</h1>
            <div className="document-subtitle">
              {note.author && <span className="author">by {note.author}</span>}
              {note.file_size && <span className="file-size">• {formatFileSize(note.file_size)}</span>}
            </div>
            {note.description && (
              <p className="document-description">{note.description}</p>
            )}
          </div>

          <div className="action-buttons">
            <a
              className="action-btn primary"
              href={note.public_url || '#'}
              download
              aria-disabled={!hasValidUrl}
              onClick={(e) => { if (!hasValidUrl) e.preventDefault(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"/>
                <path d="M7 10L12 15L17 10"/>
                <path d="M12 15V3"/>
              </svg>
              Download PDF
            </a>
            <a
              className="action-btn secondary"
              href={note.public_url || '#'}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!hasValidUrl}
              onClick={(e) => { if (!hasValidUrl) e.preventDefault(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11"/>
                <path d="M15 3H21V9"/>
                <path d="M10 14L21 3"/>
              </svg>
              Open in New Tab
            </a>
          </div>
        </section>

        {/* Content Tabs */}
        <section className="content-tabs">
          <nav className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Preview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"/>
                <path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z"/>
                <path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z"/>
              </svg>
              Details
            </button>
          </nav>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'preview' ? (
              showUnavailable ? (
                <div className="unavailable-state">
                  <div className="unavailable-icon">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 13H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M16 17H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3>Preview Unavailable</h3>
                  <p>This document cannot be previewed at the moment.</p>
                  
                  <div className="troubleshooting-tips">
                    <h4>Possible solutions:</h4>
                    <ul>
                      <li>Check if the storage bucket has public access enabled</li>
                      <li>Verify the file exists in the storage bucket</li>
                      <li>Ensure proper CORS configuration</li>
                    </ul>
                  </div>

                  {note.file_path && (
                    <div className="file-path">
                      <strong>File path:</strong> 
                      <code>{note.file_path}</code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pdf-preview">
                  {pdfLoading && (
                    <div className="pdf-loading">
                      <div className="loading-spinner small"></div>
                      <p>Loading document preview...</p>
                    </div>
                  )}
                  <iframe
                    title={`PDF Preview - ${note.title}`}
                    src={note.public_url}
                    style={{ 
                      width: '100%', 
                      height: '70vh', 
                      border: 'none', 
                      borderRadius: '12px',
                      opacity: pdfLoading ? 0 : 1,
                      transition: 'opacity 0.3s ease'
                    }}
                    onLoad={() => setPdfLoading(false)}
                    onError={() => setPdfLoading(false)}
                  />
                </div>
              )
            ) : (
              <div className="details-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Document ID</label>
                    <span>{note.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Category</label>
                    <span className="category-tag" style={{ color: categoryConfigItem.color }}>
                      {note.category || 'General'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>File Size</label>
                    <span>{formatFileSize(note.file_size)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Upload Date</label>
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Author</label>
                    <span>{note.author || 'Unknown'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Description</label>
                    <p>{note.description || 'No description provided.'}</p>
                  </div>
                  {note.file_path && (
                    <div className="detail-item full-width">
                      <label>Storage Path</label>
                      <code className="file-path">{note.file_path}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <style jsx>{`
        .preview-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        /* Header Styles */
        .preview-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 2rem;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #374151;
        }

        .document-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .category-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .upload-date {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* Main Content */
        .preview-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .document-header {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .title-section {
          flex: 1;
        }

        .document-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
          line-height: 1.2;
        }

        .document-subtitle {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          color: #6b7280;
        }

        .author {
          font-weight: 600;
          color: #374151;
        }

        .document-description {
          color: #4b5563;
          line-height: 1.6;
          margin: 0;
          font-size: 1.1rem;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-shrink: 0;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .action-btn.secondary {
          background: #f8fafc;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .action-btn:hover:not([aria-disabled="true"]) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .action-btn[aria-disabled="true"] {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Tab Navigation */
        .content-tabs {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .tab-navigation {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }

        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          padding: 1.25rem 2rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          justify-content: center;
        }

        .tab-btn:hover {
          color: #374151;
          background: #f1f5f9;
        }

        .tab-btn.active {
          color: #3b82f6;
          background: white;
          border-bottom: 3px solid #3b82f6;
        }

        .tab-content {
          padding: 2rem;
          min-height: 400px;
        }

        /* PDF Preview */
        .pdf-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #f8fafc;
        }

        .pdf-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #6b7280;
        }

        .loading-spinner {
          animation: spin 2s linear infinite;
          margin-bottom: 1rem;
        }

        .loading-spinner.small {
          width: 32px;
          height: 32px;
        }

        /* Unavailable State */
        .unavailable-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .unavailable-icon {
          color: #d1d5db;
          margin-bottom: 2rem;
        }

        .unavailable-state h3 {
          color: #374151;
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }

        .unavailable-state p {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .troubleshooting-tips {
          text-align: left;
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }

        .troubleshooting-tips h4 {
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .troubleshooting-tips ul {
          color: #6b7280;
          margin: 0;
          padding-left: 1.5rem;
        }

        .troubleshooting-tips li {
          margin-bottom: 0.5rem;
        }

        .file-path {
          background: #f3f4f6;
          padding: 0.75rem;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          word-break: break-all;
        }

        /* Details Content */
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
        }

        .detail-item label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .detail-item span, .detail-item p {
          color: #6b7280;
        }

        .category-tag {
          background: #f3f4f6;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          display: inline-block;
        }

        /* Loading and Error States */
        .preview-loading, .preview-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: 2rem;
        }

        .preview-loading {
          color: #6b7280;
        }

        .preview-error {
          color: #dc2626;
        }

        .error-icon {
          margin-bottom: 2rem;
          opacity: 0.8;
        }

        .back-button {
          background: #3b82f6;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          margin-top: 1rem;
          transition: background 0.2s;
        }

        .back-button:hover {
          background: #2563eb;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .preview-main {
            padding: 1rem;
          }

          .document-header {
            flex-direction: column;
            text-align: center;
            padding: 1.5rem;
          }

          .action-buttons {
            width: 100%;
            justify-content: center;
          }

          .document-title {
            font-size: 2rem;
          }

          .tab-navigation {
            flex-direction: column;
          }

          .tab-content {
            padding: 1.5rem;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .document-meta {
            justify-content: center;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}