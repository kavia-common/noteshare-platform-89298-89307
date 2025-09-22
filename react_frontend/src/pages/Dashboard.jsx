import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import NoteCard from '../components/NoteCard';

// PUBLIC_INTERFACE
export default function Dashboard({ session, onUpload, refreshKey }) {
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
  }, [refreshKey]); // refetch when refreshKey changes

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
