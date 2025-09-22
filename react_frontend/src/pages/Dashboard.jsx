import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import NoteCard from '../components/NoteCard';

// PUBLIC_INTERFACE
export default function Dashboard({ session, onUpload, refreshKey }) {
  /** Dashboard pulls notes from Supabase with server-side filters and falls back to client filtering on error. */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const q = (searchParams.get('q') || '').trim();
  const cat = searchParams.get('cat') || 'all';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        // Build a base query
        let query = supabase
          .from('notes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        // Apply category filter if not "all"
        if (cat && cat !== 'all') {
          query = query.eq('category', cat);
        }

        // Apply search filter (ilike) across title, description, author
        if (q) {
          const pattern = `%${q}%`;
          // Use or() with ilike checks across multiple columns
          query = query.or(`title.ilike.${pattern},description.ilike.${pattern},author.ilike.${pattern}`);
        }

        const { data, error } = await query;
        if (!active) return;

        if (error) {
          // Backend failed: fall back to fetching and applying client-side filters
          // eslint-disable-next-line no-console
          console.error('Server-side filter failed, falling back to client filter:', error);
          const { data: allData, error: allErr } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          if (allErr) {
            // eslint-disable-next-line no-console
            console.error('Fallback fetch failed:', allErr);
            setItems([]);
          } else {
            setItems(allData || []);
          }
        } else {
          setItems(data || []);
        }
      } catch (e) {
        // Any unexpected error -> fallback to simple fetch
        // eslint-disable-next-line no-console
        console.error('Unexpected error fetching notes:', e);
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
    // Refresh when filters or refreshKey changes
    return () => { active = false; };
  }, [q, cat, refreshKey]);

  // Client-side fallback filtering when server-side filtering fails and we fetched unfiltered data
  const qLower = q.toLowerCase();
  const filtered = useMemo(() => {
    // If we requested server-side filters, in success case items are already filtered.
    // When fallback occurred, we need to filter client-side here.
    return items.filter(n => {
      const matchesCat = cat === 'all' || (n.category || 'other') === cat;
      if (!qLower) return matchesCat;
      const hay = [n.title, n.description, n.author].filter(Boolean).join(' ').toLowerCase();
      return matchesCat && hay.includes(qLower);
    });
  }, [items, qLower, cat]);

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
