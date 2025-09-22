import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// PUBLIC_INTERFACE
export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ notesCount: 0, lastActive: null });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData.user || null);
        
        if (userData.user) {
          // Fetch user-specific statistics
          const { count } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('owner', userData.user.id);
            
          setUserStats({
            notesCount: count || 0,
            lastActive: userData.user.last_sign_in_at || userData.user.created_at
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (email) => {
    return email ? email[0].toUpperCase() : 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString) => {
    if (!dateString) return 'Unknown';
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now - then;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.0784 19.0784L16.25 16.25M19.0784 4.99994L16.25 7.82837M4.92157 19.0784L7.75 16.25M4.92157 4.99994L7.75 7.82837" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <div className="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V11M12 15H12.01M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z" 
                  stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <h2>Profile Not Available</h2>
        <p>Please sign in to view your profile.</p>
        <button className="signin-button" onClick={() => window.location.href = '/login'}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Background Elements */}
      <div className="profile-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>

      <div className="profile-content">
        {/* Header Section */}
        <section className="profile-header">
          <div className="header-content">
            <div className="avatar-section">
              <div className="user-avatar">
                <div className="avatar-initials">
                  {getInitials(user.email)}
                </div>
                <div className="avatar-status"></div>
              </div>
              <div className="user-info">
                <h1 className="user-greeting">Welcome back!</h1>
                <p className="user-email">{user.email}</p>
                <div className="user-meta">
                  <span className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"/>
                      <path d="M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                    </svg>
                    Member since {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <button className="signout-button" onClick={handleSignOut}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16V17C13 18.6569 11.6569 20 10 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H10C11.6569 4 13 5.34315 13 7V8"/>
              </svg>
              Sign Out
            </button>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12L11 14L15 10M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{userStats.notesCount}</div>
                <div className="stat-label">Notes Uploaded</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8V4L8 8L12 12ZM12 8C8.69 8 6 10.69 6 14C6 17.31 8.69 20 12 20C15.31 20 18 17.31 18 14C18 10.69 15.31 8 12 8Z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{getTimeSince(userStats.lastActive)}</div>
                <div className="stat-label">Last Active</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12Z"/>
                  <path d="M12 6V12L16 14"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{new Date(user.created_at).getFullYear()}</div>
                <div className="stat-label">Member Since</div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="tabs-section">
          <nav className="tabs-nav">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"/>
                <path d="M9 22V12H15V22"/>
              </svg>
              Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 12H18L15 21L9 3L6 12H2"/>
              </svg>
              Activity
            </button>
            <button 
              className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"/>
                <path d="M19.4 15C19.2669 15.3 19.2 15.629 19.2 16C19.2 16.72 19.48 17.4 19.94 17.88C20.4 18.36 21.04 18.62 21.72 18.62C22.4 18.62 23.04 18.36 23.5 17.88C23.96 17.4 24.24 16.72 24.24 16C24.24 15.28 23.96 14.6 23.5 14.12C23.04 13.64 22.4 13.38 21.72 13.38C21.04 13.38 20.4 13.64 19.94 14.12C19.48 14.6 19.2 15.28 19.2 16C19.2 16.371 19.2669 16.7 19.4 17"/>
              </svg>
              Settings
            </button>
          </nav>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <h3>Account Overview</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Email Address</label>
                    <p>{user.email}</p>
                  </div>
                  <div className="info-item">
                    <label>User ID</label>
                    <p className="user-id">{user.id}</p>
                  </div>
                  <div className="info-item">
                    <label>Account Created</label>
                    <p>{formatDate(user.created_at)}</p>
                  </div>
                  <div className="info-item">
                    <label>Last Sign In</label>
                    <p>{formatDate(user.last_sign_in_at)}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="activity-tab">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p>Uploaded {userStats.notesCount} notes to the library</p>
                      <span className="activity-time">Ongoing</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"/>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p>Joined NoteShare community</p>
                      <span className="activity-time">{getTimeSince(user.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-tab">
                <h3>Account Settings</h3>
                <div className="settings-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Email Notifications</h4>
                      <p>Receive updates about your notes and activity</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Public Profile</h4>
                      <p>Allow others to see your uploaded notes</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="secondary-button">Download Data</button>
                  <button className="secondary-button">Change Password</button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .profile-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          padding: 2rem;
        }

        .profile-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
        }

        .bg-shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
          animation: float 20s ease-in-out infinite;
        }

        .shape-1 {
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, #a55eea, #26de81);
          bottom: 20%;
          right: 15%;
          animation-delay: -10s;
        }

        .shape-3 {
          width: 150px;
          height: 150px;
          background: linear-gradient(45deg, #feca57, #ff9ff3);
          top: 50%;
          left: 5%;
          animation-delay: -5s;
        }

        .profile-content {
          position: relative;
          z-index: 2;
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Loading States */
        .profile-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: white;
          text-align: center;
        }

        .loading-spinner {
          animation: spin 2s linear infinite;
          margin-bottom: 1rem;
          color: white;
        }

        .profile-error {
          text-align: center;
          color: white;
          padding: 4rem 2rem;
        }

        .error-icon {
          margin-bottom: 2rem;
          opacity: 0.8;
        }

        .signin-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
        }

        .signin-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Header Section */
        .profile-header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 3rem;
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 2rem;
        }

        .avatar-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .user-avatar {
          position: relative;
        }

        .avatar-initials {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 2rem;
          font-weight: 700;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .avatar-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 20px;
          height: 20px;
          background: #26de81;
          border: 3px solid white;
          border-radius: 50%;
        }

        .user-info {
          color: white;
        }

        .user-greeting {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }

        .user-email {
          font-size: 1.2rem;
          opacity: 0.9;
          margin: 0 0 1rem 0;
        }

        .user-meta {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .signout-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .signout-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        /* Stats Section */
        .stats-section {
          margin-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.15);
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

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          line-height: 1;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          margin-top: 0.5rem;
        }

        /* Tabs Section */
        .tabs-section {
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .tabs-nav {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }

        .tab-button {
          flex: 1;
          background: none;
          border: none;
          padding: 1.5rem 2rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          justify-content: center;
        }

        .tab-button:hover {
          color: #374151;
          background: #f1f5f9;
        }

        .tab-button.active {
          color: #3b82f6;
          background: white;
          border-bottom: 3px solid #3b82f6;
        }

        .tab-content {
          padding: 3rem;
        }

        .tab-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 2rem 0;
        }

        /* Overview Tab */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .info-item label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .info-item p {
          color: #6b7280;
          margin: 0;
          word-break: break-all;
        }

        .user-id {
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          background: #f3f4f6;
          padding: 0.5rem;
          border-radius: 6px;
        }

        /* Activity Tab */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 12px;
        }

        .activity-icon {
          color: #3b82f6;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-content p {
          margin: 0 0 0.5rem 0;
          color: #374151;
        }

        .activity-time {
          color: #6b7280;
          font-size: 0.9rem;
        }

        /* Settings Tab */
        .settings-list {
          margin-bottom: 2rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .setting-info h4 {
          margin: 0 0 0.5rem 0;
          color: #374151;
        }

        .setting-info p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #3b82f6;
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        .settings-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .secondary-button {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .secondary-button:hover {
          background: #e5e7eb;
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .profile-container {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
          }

          .avatar-section {
            flex-direction: column;
            text-align: center;
          }

          .user-greeting {
            font-size: 2rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .tabs-nav {
            flex-direction: column;
          }

          .tab-content {
            padding: 2rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}