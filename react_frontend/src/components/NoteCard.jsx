import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function NoteCard({ note }) {
  const created = note.created_at ? new Date(note.created_at) : null;
  const sizeMB = note.file_size ? (note.file_size / (1024 * 1024)).toFixed(2) : null;

  const initials = (note.author || 'NA')
    .split(' ')
    .map(s => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

  const categoryColorMap = {
    math: 'linear-gradient(135deg, #ef4444, #dc2626)',
    cs: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    physics: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    biology: 'linear-gradient(135deg, #10b981, #059669)',
    business: 'linear-gradient(135deg, #f59e0b, #d97706)',
    literature: 'linear-gradient(135deg, #ec4899, #db2777)',
    other: 'linear-gradient(135deg, #6b7280, #4b5563)'
  };

  const CategoryChip = () => (
    <span 
      className="category-chip"
      style={{ 
        background: categoryColorMap[note.category] || categoryColorMap.other 
      }}
    >
      {(note.category || 'General').toUpperCase()}
    </span>
  );

  return (
    <article className="note-card" aria-label={`Note ${note.title}`}>
      {/* Header with PDF Preview Area */}
      <div className="card-header">
        <div className="pdf-preview">
          <div className="pdf-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 17H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 9H9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <CategoryChip />
        </div>
        
        <div className="metadata">
          {sizeMB && (
            <span className="meta-chip" title="File size">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '4px'}}>
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
              </svg>
              {sizeMB} MB
            </span>
          )}
          {created && (
            <span className="meta-chip" title="Upload date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '4px'}}>
                <path d="M8 7V3M16 7V3M7 11H17M5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21Z"/>
              </svg>
              {created.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="card-content">
        <div className="author-section">
          <div className="avatar" title={note.author || 'Unknown'}>
            {initials}
          </div>
          <div className="title-section">
            <h3 className="title" title={note.title}>{note.title}</h3>
            <p className="author">by {note.author || 'Unknown author'}</p>
          </div>
        </div>
        
        {note.description && (
          <div className="description">
            {note.description}
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="card-actions">
        <Link className="action-btn preview-btn" to={`/preview/${note.id}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '6px'}}>
            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"/>
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"/>
          </svg>
          Preview
        </Link>
        <a className="action-btn download-btn" href={note.public_url} target="_blank" rel="noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '6px'}}>
            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"/>
            <path d="M7 10L12 15L17 10"/>
            <path d="M12 15V3"/>
          </svg>
          Download
        </a>
      </div>

      <style jsx>{`
        .note-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .note-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        /* Header Styles */
        .card-header {
          position: relative;
          height: 140px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .pdf-preview {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .pdf-icon {
          color: white;
          opacity: 0.9;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .category-chip {
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .metadata {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .meta-chip {
          display: flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* Content Styles */
        .card-content {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .author-section {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        .title-section {
          flex: 1;
          min-width: 0;
        }

        .title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .author {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          font-weight: 500;
        }

        .description {
          font-size: 0.875rem;
          color: #4b5563;
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        /* Action Styles */
        .card-actions {
          padding: 0 1.5rem 1.5rem;
          display: flex;
          gap: 0.75rem;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }

        .preview-btn {
          background: #f8fafc;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .preview-btn:hover {
          background: #f1f5f9;
          border-color: #d1d5db;
          transform: translateY(-1px);
        }

        .download-btn {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: 1px solid #3b82f6;
        }

        .download-btn:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .card-content {
            padding: 1.25rem;
          }
          
          .card-actions {
            padding: 0 1.25rem 1.25rem;
            flex-direction: column;
          }
          
          .title {
            font-size: 1rem;
          }
        }
      `}</style>
    </article>
  );
}