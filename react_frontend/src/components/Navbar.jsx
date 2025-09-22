import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function Navbar({ session, onUpload }) {
  /** Top navigation bar with brand, search, filters, upload and user menu. */
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Generate stable ids for inputs to connect labels (a11y)
  const searchInputId = useId();
  const categorySelectId = useId();

  // Keep internal state in sync with URL params
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setCat(searchParams.get('cat') || 'all');
  }, [searchParams]);

  // Helper: build next params object consistently (omit defaults)
  const buildParams = (nextQ, nextCat) => {
    const params = {};
    if (nextQ && nextQ.trim().length > 0) params.q = nextQ.trim();
    if (nextCat && nextCat !== 'all') params.cat = nextCat;
    return params;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const next = buildParams(q, cat);
    setSearchParams(next, { replace: false });
    if (location.pathname !== '/') navigate('/');
  };

  const onCategoryChange = (value) => {
    setCat(value);
    const next = buildParams(q, value);
    setSearchParams(next, { replace: false });
    if (location.pathname !== '/') navigate('/');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="navbar" role="navigation" aria-label="Primary">
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="NoteShare Home" style={{ textDecoration: 'none' }}>
          <div className="brand-mark" aria-hidden="true">📘</div>
          <span>NoteShare</span>
        </Link>

        <form
          className="search"
          onSubmit={onSubmit}
          role="search"
          aria-label="Search notes"
        >
          <label htmlFor={searchInputId} className="helper" style={{ position: 'absolute', left: -9999 }}>
            Search query
          </label>
          <span aria-hidden="true">🔎</span>
          <input
            id={searchInputId}
            value={q}
            placeholder="Search notes, titles, authors…"
            onChange={(e) => setQ(e.target.value)}
            aria-describedby={`${searchInputId}-desc`}
          />
          <span id={`${searchInputId}-desc`} className="helper" style={{ position: 'absolute', left: -9999 }}>
            Type a keyword and press Enter to search
          </span>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor={categorySelectId} className="helper" style={{ position: 'absolute', left: -9999 }}>
            Category filter
          </label>
          <select
            id={categorySelectId}
            className="select"
            value={cat}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Category filter"
            style={{ maxWidth: 180 }}
          >
            <option value="all">All Categories</option>
            <option value="math">Mathematics</option>
            <option value="cs">Computer Science</option>
            <option value="physics">Physics</option>
            <option value="biology">Biology</option>
            <option value="business">Business</option>
            <option value="literature">Literature</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="nav-spacer" />

        <button
          className="btn btn-primary"
          onClick={onUpload}
          aria-label="Open upload modal"
          type="button"
        >
          Upload
        </button>

        {session ? (
          <div role="group" aria-label="User menu" style={{ display: 'flex', gap: 8 }}>
            <Link className="btn" to="/profile" aria-label="View profile">Profile</Link>
            <button className="btn" onClick={logout} type="button" aria-label="Log out">
              Logout
            </button>
          </div>
        ) : (
          <Link className="btn" to="/login" aria-label="Go to login">Login</Link>
        )}
      </div>
    </div>
  );
}
```

Explanation: Add NoteCard component to render each note
````write file="noteshare-platform-89298-89307/react_frontend/src/components/NoteCard.jsx"
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
```

Explanation: Upload modal to send file to Supabase Storage and metadata to a table
````write file="noteshare-platform-89298-89307/react_frontend/src/components/UploadModal.jsx"
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * UploadModal uploads a PDF file to Supabase Storage bucket "notes" and
 * inserts metadata into a "notes" table.
 * Required Supabase setup:
 * - Storage bucket: notes (public)
 * - Table: notes (id uuid pk default gen_random_uuid(), title text, description text, author text, category text, file_path text, file_size bigint, created_at timestamptz default now())
 *   with Row Level Security enabled and suitable policies for read/insert by authenticated users.
 */
// PUBLIC_INTERFACE
export default function UploadModal({ onClose }) {
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

      onClose();
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
```

Explanation: Dashboard page with browsing, search, filter and grid of notes
````write file="noteshare-platform-89298-89307/react_frontend/src/pages/Dashboard.jsx"
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import NoteCard from '../components/NoteCard';

// PUBLIC_INTERFACE
export default function Dashboard({ session, onUpload }) {
  /** Dashboard pulls notes from Supabase and applies search/filter on client. */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (active) {
        if (error) {
          // eslint-disable-next-line no-console
          console.error(error);
          setItems([]);
        } else {
          setItems(data || []);
        }
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const q = (searchParams.get('q') || '').toLowerCase();
  const cat = searchParams.get('cat') || 'all';

  const filtered = useMemo(() => {
    return items.filter(n => {
      const matchesQ = !q || [n.title, n.description, n.author].filter(Boolean).join(' ').toLowerCase().includes(q);
      const matchesCat = cat === 'all' || (n.category || 'other') === cat;
      return matchesQ && matchesCat;
    });
  }, [items, q, cat]);

  return (
    <main className="container" aria-busy={loading}>
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div className="kicker">Explore</div>
          <h1 style={{ margin: '6px 0 0 0' }}>Latest Notes</h1>
        </div>
        <button className="btn btn-primary" onClick={onUpload}>Upload</button>
      </section>

      {loading ? (
        <div className="helper">Loading notes…</div>
      ) : filtered.length === 0 ? (
        <div className="helper">No notes found. Try a different search or category.</div>
      ) : (
        <div className="card-grid">
          {filtered.map(n => <NoteCard key={n.id} note={n} />)}
        </div>
      )}
    </main>
  );
}
```

Explanation: Authentication page for login and signup with Supabase
````write file="noteshare-platform-89298-89307/react_frontend/src/pages/AuthPage.jsx"
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function AuthPage() {
  /** Login/Signup with Supabase email/password. */
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const doAuth = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (err) throw err;
        navigate('/');
      } else {
        // IMPORTANT: redirectTo should use SITE URL; for CRA, use window.location.origin
        const { error: err } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) throw err;
        alert('Signup successful. Please check your email for verification link.');
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: 480 }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 18, background: 'linear-gradient(180deg, rgba(37,99,235,0.10), #fff)' }}>
          <div className="kicker">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
          <h2 style={{ margin: '6px 0 0 0' }}>NoteShare</h2>
        </div>
        <form onSubmit={doAuth} style={{ padding: 18, display: 'grid', gap: 12 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Email</div>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 6 }}>Password</div>
            <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
          </label>
          {error && <div style={{ color: 'var(--color-error)' }}>{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Please wait…' : (mode === 'login' ? 'Log In' : 'Sign Up')}
          </button>
          <button type="button" className="btn" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
          </button>
        </form>
      </div>
    </main>
  );
}
```

Explanation: PDF Preview page using iframe with public URL
````write file="noteshare-platform-89298-89307/react_frontend/src/pages/PreviewPage.jsx"
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function PreviewPage() {
  /** Loads a single note by id and renders a PDF preview. */
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from('notes').select('*').eq('id', id).single();
      if (!active) return;
      if (error) setErr(error.message);
      else setNote(data);
    })();
    return () => { active = false; };
  }, [id]);

  if (err) return <main className="container"><div style={{ color: 'var(--color-error)' }}>{err}</div></main>;
  if (!note) return <main className="container"><div className="helper">Loading…</div></main>;

  return (
    <main className="container">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="kicker">{(note.category || 'General').toUpperCase()}</div>
          <h1 style={{ margin: '6px 0 0 0' }}>{note.title}</h1>
          <div className="helper">{note.author ? `by ${note.author}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn" href={note.public_url} target="_blank" rel="noreferrer">Open</a>
          <a className="btn btn-primary" href={note.public_url} download>Download</a>
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <iframe
          title="PDF Preview"
          src={note.public_url}
          style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 12 }}
        />
      </div>
    </main>
  );
}
```

Explanation: Profile page with basic user info and signout
````write file="noteshare-platform-89298-89307/react_frontend/src/pages/ProfilePage.jsx"
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function ProfilePage() {
  /** Shows current user's basic auth profile, email, and metadata placeholder. */
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, []);

  if (!user) {
    return <main className="container"><div className="helper">Loading profile…</div></main>;
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ padding: 18, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="kicker">Account</div>
          <h2 style={{ margin: '6px 0 0 0' }}>Profile</h2>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>User ID:</strong> <span className="helper">{user.id}</span></div>
          <div className="helper">This is a basic profile view. Extend with preferences and uploads list if needed.</div>
        </div>
      </div>
    </main>
  );
}
```

Explanation: Add .env.example to document required env vars
````write file="noteshare-platform-89298-89307/react_frontend/.env.example"
# Copy this file to .env and set your Supabase project credentials.
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_KEY=
