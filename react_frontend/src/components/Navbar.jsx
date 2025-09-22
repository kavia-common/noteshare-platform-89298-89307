import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function Navbar({ session, onUpload }) {
  /**
   * Ocean Professional Navbar:
   * - Glassmorphism surface with subtle gradient and blur
   * - Animated search input with real-time query syncing to URL
   * - Category filter with smooth highlight
   * - Upload CTA and user actions
   */
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const searchInputId = useId();
  const categorySelectId = useId();

  // Sync with URL
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setCat(searchParams.get('cat') || 'all');
  }, [searchParams]);

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
        <Link to="/" className="brand" aria-label="NoteShare Home">
          <div className="brand-mark" aria-hidden="true">NS</div>
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
          <span aria-hidden="true" style={{ opacity: 0.75 }}>Search</span>
          <input
            id={searchInputId}
            value={q}
            placeholder="Search notes, titles, authors..."
            onChange={(e) => setQ(e.target.value)}
            aria-describedby={`${searchInputId}-desc`}
          />
          {q && (
            <button
              type="button"
              className="btn"
              aria-label="Clear search"
              onClick={() => {
                setQ('');
                const next = buildParams('', cat);
                setSearchParams(next, { replace: false });
                if (location.pathname !== '/') navigate('/');
              }}
              style={{ padding: '6px 10px' }}
            >
              X
            </button>
          )}
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
          title="Upload a PDF"
        >
          Upload
        </button>

        {session ? (
          <div role="group" aria-label="User menu" style={{ display: 'flex', gap: 8 }}>
            <Link className="btn" to="/profile" aria-label="View profile" title="Profile">Profile</Link>
            <button className="btn" onClick={logout} type="button" aria-label="Log out" title="Log out">
              Logout
            </button>
          </div>
        ) : (
          <Link className="btn" to="/login" aria-label="Go to login" title="Log in">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
