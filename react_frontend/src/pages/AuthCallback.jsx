import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = async () => {
      try {
        // For Supabase v2, this will parse tokens from URL and set the session
        const { data, error } = await supabase.auth.getSessionFromUrl();
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Auth callback error:', error);
          navigate('/auth/error');
          return;
        }
        if (data?.session) {
          navigate('/'); // or dashboard
          return;
        }
        navigate('/');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        navigate('/auth/error');
      }
    };
    handle();
  }, [navigate]);

  return <main className="container"><div className="helper">Processing authentication…</div></main>;
}
