import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function Navbar({ session, onUpload }) {
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
        {/* Brand */}
        <Link to="/" className="brand" aria-label="NoteShare Home">
          <div className="brand-mark" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#brandGradient)"/>
              <path d="M12 10L20 10M12 16L20 16M12 22L16 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6"/>
                  <stop offset="1" stopColor="#1D4ED8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-text">NoteShare</span>
        </Link>

        {/* Search Form */}
        <form
          className="search-form"
          onSubmit={onSubmit}
          role="search"
          aria-label="Search notes"
        >
          <div className="search-container">
            <label htmlFor={searchInputId} className="sr-only">
              Search query
            </label>
            <div className="search-icon">🔍</div>
            <input
              id={searchInputId}
              className="search-input"
              value={q}
              placeholder="Search notes, titles, authors..."
              onChange={(e) => setQ(e.target.value)}
              aria-describedby={`${searchInputId}-desc`}
            />
            {q && (
              <button
                type="button"
                className="clear-search"
                aria-label="Clear search"
                onClick={() => {
                  setQ('');
                  const next = buildParams('', cat);
                  setSearchParams(next, { replace: false });
                  if (location.pathname !== '/') navigate('/');
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8L4 4M8 8L12 12M8 8L12 4M8 8L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
          <span id={`${searchInputId}-desc`} className="sr-only">
            Type a keyword and press Enter to search
          </span>
        </form>

        {/* Category Filter */}
        <div className="filter-container">
          <label htmlFor={categorySelectId} className="sr-only">
            Category filter
          </label>
          <div className="select-wrapper">
            <select
              id={categorySelectId}
              className="category-select"
              value={cat}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Category filter"
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
            <div className="select-arrow">▼</div>
          </div>
        </div>

        <div className="nav-spacer" />

        {/* Action Buttons */}
        <div className="nav-actions">
          <Link className="nav-btn nav-btn-secondary" to="/troubleshoot" aria-label="Open Supabase diagnostics" title="Troubleshoot">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{marginRight: '6px'}}>
              <path d="M9 6V9M9 12H9.0075M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Troubleshoot
          </Link>

          <button
            className="nav-btn nav-btn-primary"
            onClick={onUpload}
            aria-label="Open upload modal"
            type="button"
            title="Upload a PDF"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{marginRight: '6px'}}>
              <path d="M9 12V3M9 3L6 6M9 3L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 15H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Upload
          </button>

          {session ? (
            <div className="user-menu" role="group" aria-label="User menu">
              <Link className="nav-btn nav-btn-secondary" to="/profile" aria-label="View profile" title="Profile">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{marginRight: '6px'}}>
                  <path d="M12 5.5C12 7.15685 10.6569 8.5 9 8.5C7.34315 8.5 6 7.15685 6 5.5C6 3.84315 7.34315 2.5 9 2.5C10.6569 2.5 12 3.84315 12 5.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M14.5 15.5C14.5 12.7386 12.0376 10.5 9 10.5C5.96243 10.5 3.5 12.7386 3.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Profile
              </Link>
              <button className="nav-btn nav-btn-secondary" onClick={logout} type="button" aria-label="Log out" title="Log out">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{marginRight: '6px'}}>
                  <path d="M7.5 15H4.5C3.67157 15 3 14.3284 3 13.5V4.5C3 3.67157 3.67157 3 4.5 3H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M11.5 12.5L15 9L11.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 9H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Logout
              </button>
            </div>
          ) : (
            <Link className="nav-btn nav-btn-secondary" to="/login" aria-label="Go to login" title="Log in">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{marginRight: '6px'}}>
                <path d="M7.5 15H4.5C3.67157 15 3 14.3284 3 13.5V4.5C3 3.67157 3.67157 3 4.5 3H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M11.5 5.5L15 9L11.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Login
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        .navbar {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-inner {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 2rem;
        }

        /* Brand Styles */
        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: #1f2937;
          font-weight: 700;
          font-size: 1.25rem;
          transition: color 0.2s;
        }

        .brand:hover {
          color: #3b82f6;
        }

        .brand-text {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Search Styles */
        .search-form {
          flex: 1;
          max-width: 400px;
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: #6b7280;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .clear-search:hover {
          color: #374151;
        }

        /* Filter Styles */
        .filter-container {
          min-width: 160px;
        }

        .select-wrapper {
          position: relative;
        }

        .category-select {
          width: 100%;
          padding: 0.75rem 2rem 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          font-size: 0.875rem;
          background: white;
          appearance: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .select-arrow {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #6b7280;
          font-size: 0.75rem;
        }

        .nav-spacer {
          flex: 1;
        }

        /* Action Buttons */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .nav-btn-secondary {
          background: #f8fafc;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .nav-btn-secondary:hover {
          background: #f1f5f9;
          border-color: #d1d5db;
        }

        .nav-btn-primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: 1px solid #3b82f6;
        }

        .nav-btn-primary:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .user-menu {
          display: flex;
          gap: 0.75rem;
        }

        /* Utility Classes */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .nav-inner {
            padding: 1rem;
            gap: 1rem;
          }
          
          .search-form {
            max-width: 300px;
          }
        }

        @media (max-width: 768px) {
          .nav-inner {
            flex-wrap: wrap;
          }
          
          .search-form {
            max-width: 100%;
            order: 3;
            flex: 0 0 100%;
            margin-top: 1rem;
          }
          
          .filter-container {
            min-width: 140px;
          }
        }
      `}</style>
    </div>
  );
}