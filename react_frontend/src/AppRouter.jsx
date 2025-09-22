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
  /** Registers routes, manages auth session, and orchestrates modal upload interactions. */
  const [session, setSession] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <BrowserRouter>
      <Navbar
        session={session}
        onUpload={() => setShowUpload(true)}
      />
      <Routes>
        <Route path="/" element={<Dashboard session={session} onUpload={() => setShowUpload(true)} refreshKey={refreshKey} />} />
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/preview/:id" element={<PreviewPage />} />
        <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={triggerRefresh}
        />
      )}
      <button
        className="fab"
        aria-label="Upload PDF"
        onClick={() => setShowUpload(true)}
        title="Upload a PDF"
      >
        ⬆
      </button>
    </BrowserRouter>
  );
}
