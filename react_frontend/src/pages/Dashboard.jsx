import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import NoteCard from '../components/NoteCard';

// PUBLIC_INTERFACE
export default function Dashboard({ session, onUpload, refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, categories: {} });
  const [searchParams] = useSearchParams();

  const q = (searchParams.get('q') || '').trim();
  const cat = searchParams.get('cat') || 'all';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        let query = supabase
          .from('notes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (cat && cat !== 'all') {
          query = query.eq('category', cat);
        }
        if (q) {
          const pattern = `%${q}%`;
          query = query.or(`title.ilike.${pattern},description.ilike.${pattern},author.ilike.${pattern}`);
        }

        const { data, error } = await query;
        if (!active) return;

        if (error) {
          console.error('Server-side filter failed, falling back to client filter:', error);
          const { data: allData, error: allErr } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          if (allErr) {
            console.error('Fallback fetch failed:', allErr);
            setError('Failed to load notes. Please try again.');
            setItems([]);
          } else {
            setItems(allData || []);
          }
        } else {
          setItems(data || []);
        }
      } catch (e) {
        console.error('Unexpected error fetching notes:', e);
        setError('An unexpected error occurred while loading notes.');
        const { data: allData } = await supabase
          .from('notes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (active) setItems(allData || []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [q, cat, refreshKey]);

  // Calculate statistics
  useEffect(() => {
    if (items.length === 0) {
      setStats({ total: 0, categories: {} });
      return;
    }

    const categories = items.reduce((acc, note) => {
      const category = note.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    setStats({
      total: items.length,
      categories
    });
  }, [items]);

  const qLower = q.toLowerCase();
  const filtered = useMemo(() => {
    return items.filter(n => {
      const matchesCat = cat === 'all' || (n.category || 'other') === cat;
      if (!qLower) return matchesCat;
      const hay = [n.title, n.description, n.author].filter(Boolean).join(' ').toLowerCase();
      return matchesCat && hay.includes(qLower);
    });
  }, [items, qLower, cat]);

  const categoryConfig = {
    math: { 
      color: '#ff6b6b', 
      gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
      icon: '∫'
    },
    cs: { 
      color: '#4ecdc4', 
      gradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
      icon: '</>'
    },
    physics: { 
      color: '#a55eea', 
      gradient: 'linear-gradient(135deg, #a55eea, #8e44ad)',
      icon: 'Φ'
    },
    biology: { 
      color: '#26de81', 
      gradient: 'linear-gradient(135deg, #26de81, #20bf6b)',
      icon: '🧬'
    },
    business: { 
      color: '#feca57', 
      gradient: 'linear-gradient(135deg, #feca57, #ff9ff3)',
      icon: '📊'
    },
    literature: { 
      color: '#ff9ff3', 
      gradient: 'linear-gradient(135deg, #ff9ff3, #f368e0)',
      icon: '📚'
    },
    other: { 
      color: '#778ca3', 
      gradient: 'linear-gradient(135deg, #778ca3, #2c2c54)',
      icon: '•'
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const userName = session?.user?.email?.split('@')[0] || 'there';

  return (
    <div className="dashboard">
      {/* Animated Background */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>

      <div className="dashboard-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-text">
              <div className="greeting">Good {getTimeOfDay()}, {userName}! ✨</div>
              <h1 className="hero-title">
                Your Knowledge
                <span className="title-accent"> Universe</span>
              </h1>
              <p className="hero-subtitle">
                Explore, discover, and expand your intellectual horizons with our curated collection of educational resources.
              </p>
            </div>
            
            <div className="hero-actions">
              <button className="cta-button primary" onClick={onUpload}>
                <div className="button-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload New Note
                </div>
              </button>
              
              <button className="cta-button secondary" onClick={() => window.scrollTo({ top: document.querySelector('.content-section').offsetTop, behavior: 'smooth' })}>
                <div className="button-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  Explore Library
                </div>
              </button>
            </div>
          </div>

          {/* Floating Stats */}
          <div className="floating-stats">
            <div className="stat-card premium">
              <div className="stat-icon-wrapper">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.total.toLocaleString()}</div>
                <div className="stat-label">Total Notes</div>
              </div>
            </div>

            <div className="stat-card premium">
              <div className="stat-icon-wrapper">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
              </div>
              <div className="stat-content">
                <div className="stat-number">{Object.keys(stats.categories).length}</div>
                <div className="stat-label">Categories</div>
              </div>
            </div>

            <div className="stat-card premium">
              <div className="stat-icon-wrapper">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                  </svg>
                </div>
              </div>
              <div className="stat-content">
                <div className="stat-number">{filtered.length}</div>
                <div className="stat-label">Showing</div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Showcase */}
        {Object.keys(stats.categories).length > 0 && (
          <section className="category-showcase">
            <div className="section-header">
              <h2 className="section-title">Knowledge Categories</h2>
              <div className="section-subtitle">Explore by subject</div>
            </div>
            
            <div className="category-grid">
              {Object.entries(stats.categories).map(([category, count]) => {
                const config = categoryConfig[category] || categoryConfig.other;
                return (
                  <div key={category} className="category-card">
                    <div className="category-visual">
                      <div className="category-icon" style={{ background: config.gradient }}>
                        <span className="icon-symbol">{config.icon}</span>
                      </div>
                      <div className="category-pulse" style={{ backgroundColor: config.color }}></div>
                    </div>
                    <div className="category-info">
                      <h3 className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                      <div className="category-stats">
                        <span className="note-count">{count} notes</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${(count / Math.max(...Object.values(stats.categories))) * 100}%`,
                              background: config.gradient
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Content Section */}
        <section className="content-section">
          {error && (
            <div className="error-alert">
              <div className="alert-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div className="alert-content">
                <h4 className="alert-title">Something went wrong</h4>
                <p className="alert-message">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="loading-animation">
                <div className="loading-orb"></div>
                <div className="loading-orb"></div>
                <div className="loading-orb"></div>
              </div>
              <h3 className="loading-title">Curating your knowledge...</h3>
              <p className="loading-subtitle">Gathering the best resources for you</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-container">
              <div className="empty-illustration">
                <div className="empty-circle">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
              </div>
              <h3 className="empty-title">No notes found</h3>
              <p className="empty-message">
                {q || cat !== 'all' 
                  ? "We couldn't find any notes matching your criteria. Try adjusting your search."
                  : "Your knowledge universe is waiting to be filled! Upload your first note to get started."
                }
              </p>
              {q || cat !== 'all' ? (
                <button className="action-button" onClick={() => window.location.search = ''}>
                  Clear Filters
                </button>
              ) : (
                <button className="action-button primary" onClick={onUpload}>
                  Upload First Note
                </button>
              )}
            </div>
          ) : (
            <div className="notes-section">
              <div className="section-header">
                <h2 className="section-title">
                  {q || cat !== 'all' ? 'Search Results' : 'Recent Discoveries'}
                  <span className="result-badge">{filtered.length}</span>
                </h2>
                {(q || cat !== 'all') && (
                  <div className="filter-tags">
                    {q && <span className="filter-tag search">🔍 "{q}"</span>}
                    {cat !== 'all' && <span className="filter-tag category">📂 {cat}</span>}
                  </div>
                )}
              </div>
              
              <div className="notes-grid">
                {filtered.map((note, index) => (
                  <div key={note.id} className="note-wrapper" style={{ '--delay': `${index * 0.1}s` }}>
                    <NoteCard note={note} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow-x: hidden;
        }

        .background-orbs {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
          animation: float 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, #a55eea, #26de81);
          top: 60%;
          right: 10%;
          animation-delay: -7s;
        }

        .orb-3 {
          width: 150px;
          height: 150px;
          background: linear-gradient(45deg, #feca57, #ff9ff3);
          bottom: 20%;
          left: 20%;
          animation-delay: -14s;
        }

        .orb-4 {
          width: 250px;
          height: 250px;
          background: linear-gradient(45deg, #4facfe, #00f2fe);
          top: 30%;
          left: 60%;
          animation-delay: -5s;
        }

        .dashboard-container {
          position: relative;
          z-index: 2;
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Hero Section */
        .hero-section {
          padding: 4rem 0 6rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
        }

        .hero-content {
          max-width: 800px;
          margin-bottom: 4rem;
        }

        .greeting {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .hero-title {
          font-size: clamp(3rem, 8vw, 5rem);
          font-weight: 800;
          color: white;
          margin: 0 0 1.5rem 0;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .title-accent {
          background: linear-gradient(135deg, #feca57, #ff9ff3, #4facfe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s ease-in-out infinite;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 3rem;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-button {
          border: none;
          border-radius: 16px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .cta-button.primary {
          background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
          color: white;
          padding: 1rem 2rem;
          box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
        }

        .cta-button.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 1rem 2rem;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
        }

        .cta-button.primary:hover {
          box-shadow: 0 12px 40px rgba(255, 107, 107, 0.4);
        }

        .button-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        /* Floating Stats */
        .floating-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          max-width: 800px;
          width: 100%;
        }

        .stat-card.premium {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card.premium::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.8s ease;
        }

        .stat-card.premium:hover::before {
          left: 100%;
        }

        .stat-card.premium:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .stat-icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
          font-size: 0.95rem;
        }

        /* Category Showcase */
        .category-showcase {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem;
          margin: 4rem 0;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .section-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .category-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .category-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
        }

        .category-visual {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .category-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .icon-symbol {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
        }

        .category-pulse {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-left: auto;
          animation: pulse 2s ease-in-out infinite;
        }

        .category-name {
          color: white;
          font-size: 1.3rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
        }

        .category-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .note-count {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          font-weight: 500;
        }

        .progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease-out;
        }

        /* Content Section */
        .content-section {
          background: white;
          border-radius: 24px;
          padding: 3rem;
          margin: 2rem 0;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.1);
        }

        .error-alert {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border: 1px solid #fca5a5;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .alert-icon {
          color: #dc2626;
          flex-shrink: 0;
        }

        .alert-title {
          color: #dc2626;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .alert-message {
          color: #7f1d1d;
          margin: 0;
        }

        .loading-container {
          text-align: center;
          padding: 6rem 2rem;
        }

        .loading-animation {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .loading-orb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          animation: bounce 1.4s ease-in-out infinite both;
        }

        .loading-orb:nth-child(1) { animation-delay: -0.32s; }
        .loading-orb:nth-child(2) { animation-delay: -0.16s; }

        .loading-title {
          font-size: 1.5rem;
          color: #374151;
          margin: 0 0 0.5rem 0;
        }

        .loading-subtitle {
          color: #6b7280;
          margin: 0;
        }

        .empty-container {
          text-align: center;
          padding: 6rem 2rem;
        }

        .empty-illustration {
          margin-bottom: 2rem;
        }

        .empty-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem auto;
          color: #9ca3af;
        }

        .empty-title {
          font-size: 1.8rem;
          color: #374151;
          margin: 0 0 1rem 0;
          font-weight: 600;
        }

        .empty-message {
          color: #6b7280;
          margin: 0 0 2rem 0;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .action-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
        }

                .notes-section .section-header {
          text-align: left;
          margin-bottom: 3rem;
          display: flex;
          justify-content: between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .notes-section .section-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .result-badge {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 1rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .filter-tags {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-tag {
          background: #f3f4f6;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-tag.search {
          background: #e0f2fe;
          color: #0369a1;
        }

        .filter-tag.category {
          background: #f0fdf4;
          color: #059669;
        }

        .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .note-wrapper {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 0.6s ease-out forwards;
          animation-delay: var(--delay);
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes shimmer {
          0%, 100% { background-position: -200% 0; }
          50% { background-position: 200% 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
          } 
          40% { 
            transform: scale(1.0);
          }
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .dashboard-container {
            padding: 1.5rem;
          }
          
          .hero-section {
            padding: 3rem 0 4rem 0;
          }
          
          .category-showcase {
            padding: 2rem;
          }
          
          .content-section {
            padding: 2rem;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1rem;
          }
          
          .hero-section {
            padding: 2rem 0 3rem 0;
          }
          
          .hero-title {
            font-size: clamp(2.5rem, 10vw, 4rem);
          }
          
          .hero-actions {
            flex-direction: column;
            align-items: center;
          }
          
          .cta-button {
            width: 100%;
            max-width: 300px;
          }
          
          .floating-stats {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .category-showcase {
            padding: 1.5rem;
            margin: 2rem 0;
          }
          
          .category-grid {
            grid-template-columns: 1fr;
          }
          
          .content-section {
            padding: 1.5rem;
            margin: 1rem 0;
            border-radius: 20px;
          }
          
          .notes-section .section-header {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }
          
          .notes-section .section-title {
            font-size: 1.75rem;
          }
          
          .notes-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .filter-tags {
            justify-content: flex-start;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: clamp(2rem, 12vw, 3rem);
          }
          
          .hero-subtitle {
            font-size: 1.1rem;
          }
          
          .stat-card.premium {
            padding: 1.5rem;
          }
          
          .stat-number {
            font-size: 2rem;
          }
          
          .category-card {
            padding: 1.5rem;
          }
          
          .section-title {
            font-size: 2rem;
          }
          
          .notes-section .section-title {
            font-size: 1.5rem;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .content-section {
            background: #1f2937;
            color: white;
          }
          
          .notes-section .section-title {
            color: white;
          }
          
          .filter-tag {
            background: #374151;
            color: #d1d5db;
          }
          
          .filter-tag.search {
            background: #1e3a8a;
            color: #93c5fd;
          }
          
          .filter-tag.category {
            background: #065f46;
            color: #6ee7b7;
          }
          
          .empty-circle {
            background: linear-gradient(135deg, #374151, #4b5563);
            color: #9ca3af;
          }
          
          .empty-title {
            color: #f9fafb;
          }
          
          .empty-message {
            color: #d1d5db;
          }
          
          .loading-title {
            color: #f9fafb;
          }
          
          .loading-subtitle {
            color: #d1d5db;
          }
        }

        /* Print styles */
        @media print {
          .background-orbs,
          .cta-button,
          .floating-stats,
          .category-showcase {
            display: none;
          }
          
          .dashboard {
            background: white !important;
          }
          
          .hero-title {
            color: black !important;
          }
          
          .content-section {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 1rem !important;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .stat-card.premium {
            border: 2px solid white;
          }
          
          .category-card {
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          
          .cta-button {
            border: 2px solid currentColor;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          .orb,
          .stat-card.premium::before,
          .category-pulse,
          .loading-orb,
          .note-wrapper {
            animation: none !important;
          }
          
          .note-wrapper {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}