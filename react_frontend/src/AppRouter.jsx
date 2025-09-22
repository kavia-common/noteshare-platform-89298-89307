import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import PreviewPage from './pages/PreviewPage';
import ProfilePage from './pages/ProfilePage';
import UploadModal from './components/UploadModal';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';

// PUBLIC_INTERFACE
export default function AppRouter() {
  /** This component registers routes and manages auth session for conditional UI. */
  const [session, setSession] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  // State used to trigger Dashboard re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate ? undefined : undefined; // placeholder for linter; navigate used inside child hook below.

  // Inner component to access navigate hook cleanly
  function AppContent() {
    const nav = useNavigate();

    useEffect(() => {
      // Initialize session on mount
      supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
      // Subscribe to auth changes
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      return () => sub.subscription.unsubscribe();
    }, []);

    // Callback to be invoked after a successful upload to refresh dashboard
    const handleUploaded = useCallback(() => {
      setRefreshKey((k) => k + 1);
      setShowUpload(false);
    }, []);

    // Guarded upload opener: redirect to login if not authenticated
    const openUploadGuarded = useCallback(() => {
      if (!session) {
        nav('/login');
        return;
      }
      setShowUpload(true);
    }, [session, nav]);

    return (
      <>
        <Navbar session={session} onUpload={openUploadGuarded} />
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                session={session}
                onUpload={openUploadGuarded}
                refreshKey={refreshKey}
              />
            }
          />
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="/preview/:id" element={<PreviewPage />} />
          <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {showUpload && (
          <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />
        )}
        <button
          className="fab"
          aria-label="Upload PDF"
          onClick={openUploadGuarded}
        >
          ⬆
        </button>
      </>
    );
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
