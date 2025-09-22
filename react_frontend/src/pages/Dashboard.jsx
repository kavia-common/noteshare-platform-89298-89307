import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import NoteCard from '../components/NoteCard';

// PUBLIC_INTERFACE
export default function Dashboard({ session, onUpload, refreshKey }) {
  /** Dashboard with premium UI states and server-side filters (fallback to client-side). */
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
    return () => { active = false; };
  }, [q, cat, refreshKey]);

  const qLower = q.toLowerCase();
  const filtered = useMemo(() => {
    return items.filter(n => {
      const matchesCat = cat === 'all' || (n.category || 'other') === cat;
      if (!qLower) return matchesCat;
      const hay = [n.title, n.description, n.author].filter(Boolean).join(' ').toLowerCase();
      return matchesCat && hay.includes(qLower);
    });
  }, [items, qLower, cat]);

  return (
    <main className="container" aria-busy={loading}>
      <section style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18
      }}>
        <div>
          <div className="kicker">Explore</div>
          <h1 className="h1-gradient">Latest Notes</h1>
        </div>
        <button className="btn btn-primary" onClick={onUpload} title="Upload a PDF">⬆ Upload</button>
      </section>

      {loading ? (
        <div className="card" style={{ padding: 16 }}>
          <div className="helper">Loading notes…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <div className="kicker" style={{ marginBottom: 6 }}>No results</div>
          <div className="helper">No notes found. Try a different search or category.</div>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(n => <NoteCard key={n.id} note={n} />)}
        </div>
      )}
    </main>
  );
}
