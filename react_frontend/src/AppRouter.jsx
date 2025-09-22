import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import PreviewPage from './pages/PreviewPage';
import ProfilePage from './pages/ProfilePage';
import UploadModal from './components/UploadModal';

// PUBLIC_INTERFACE
export default function AppRouter() {
  /** This component registers routes and manages auth session for conditional UI. */
  const [session, setSession] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Navbar
        session={session}
        onUpload={() => setShowUpload(true)}
      />
      <Routes>
        <Route path="/" element={<Dashboard session={session} onUpload={() => setShowUpload(true)} />} />
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/preview/:id" element={<PreviewPage />} />
        <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} />
      )}
      <button className="fab" aria-label="Upload PDF" onClick={() => setShowUpload(true)}>
        ⬆
      </button>
    </BrowserRouter>
  );
}
