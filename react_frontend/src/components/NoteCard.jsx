import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function NoteCard({ note }) {
  /** Card displaying note metadata with preview/download actions. */
  const created = note.created_at ? new Date(note.created_at) : null;
  const sizeMB = note.file_size ? (note.file_size / (1024 * 1024)).toFixed(2) : null;

  return (
    <article className="card" aria-label={`Note ${note.title}`}>
      <div className="card-header">
        <span className="badge">{(note.category || 'General').toUpperCase()}</span>
      </div>
      <div className="card-body">
        <div className="title">{note.title}</div>
        <div className="subtitle">{note.description || '—'}</div>
        <div className="helper">
          {note.author ? `by ${note.author}` : ''} {created ? `• ${created.toLocaleDateString()}` : ''}
        </div>
        <div className="helper">{sizeMB ? `${sizeMB} MB` : ''}</div>
      </div>
      <div className="card-footer">
        <Link className="btn" to={`/preview/${note.id}`}>Preview</Link>
        <a className="btn btn-primary" href={note.public_url} target="_blank" rel="noreferrer">Download</a>
      </div>
    </article>
  );
}
