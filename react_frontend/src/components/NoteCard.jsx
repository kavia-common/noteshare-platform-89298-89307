import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function NoteCard({ note }) {
  /**
   * Premium card with:
   * - Category chip
   * - PDF thumbnail overlay area (simulated with gradient + icon)
   * - Avatar stub from author initials
   * - Metadata chips for size and date
   */
  const created = note.created_at ? new Date(note.created_at) : null;
  const sizeMB = note.file_size ? (note.file_size / (1024 * 1024)).toFixed(2) : null;

  const initials = (note.author || 'NA')
    .split(' ')
    .map(s => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

  const CategoryChip = () => (
    <span className="badge">{(note.category || 'General').toUpperCase()}</span>
  );

  return (
    <article className="card" aria-label={`Note ${note.title}`} style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          height: 160,
          background: 'var(--grad-primary-soft)'
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          color: 'var(--color-primary)', fontSize: 44, opacity: 0.95,
          textShadow: '0 6px 22px rgba(37,99,235,0.25)'
        }}>
          📄
        </div>
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <CategoryChip />
        </div>
        <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 6 }}>
          {sizeMB && <span className="badge" title="File size">{sizeMB} MB</span>}
          {created && <span className="badge" title="Uploaded on">{created.toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 12,
              display: 'grid', placeItems: 'center',
              background: 'rgba(37,99,235,0.10)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(37,99,235,0.25)',
              fontSize: 12, fontWeight: 800,
              boxShadow: '0 2px 8px rgba(37,99,235,0.10)'
            }}
            aria-hidden="true"
            title={note.author || 'Unknown'}
          >
            {initials}
          </div>
          <div>
            <div className="title" style={{ lineHeight: 1.2 }}>{note.title}</div>
            <div className="subtitle" style={{ lineHeight: 1.2 }}>
              {note.author ? `by ${note.author}` : 'Unknown author'}
            </div>
          </div>
        </div>
        {note.description && (
          <div className="helper" style={{ marginTop: 6 }}>
            {note.description}
          </div>
        )}
      </div>

      <div className="card-footer" style={{ gap: 8 }}>
        <Link className="btn" to={`/preview/${note.id}`} title="Preview">Preview</Link>
        <a className="btn btn-primary" href={note.public_url} target="_blank" rel="noreferrer" title="Download">
          Download
        </a>
      </div>
    </article>
  );
}
