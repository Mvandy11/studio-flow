import { useState } from 'react';
import StudioSidebar from '../components/StudioSidebar';
import StudioTopbar from '../components/StudioTopbar';
import CinematicFeedCard from '../components/CinematicFeedCard';
import StudioSessions from './StudioSessions';

export default function Studio() {
  const [section, setSection] = useState('overview');

  return (
    <div style={{ display: 'flex' }}>
      <StudioSidebar current={section} onSelect={setSection} />

      <div style={{ marginLeft: '240px', width: '100%' }}>
        <StudioTopbar />

        <div style={{ padding: '2rem' }} className="cinematic-stagger">
          {section === 'overview' && (
            <>
              <h1>Overview</h1>
              <CinematicFeedCard
                title="Welcome Back"
                body="Here's what's happening in your creator world today."
              />
            </>
          )}

          {section === 'sessions' && <StudioSessions />}

          {section === 'posts' && (
            <>
              <h1>Your Posts</h1>
              <CinematicFeedCard
                title="Draft Post"
                body="You have an unfinished post waiting."
              />
            </>
          )}

          {section === 'analytics' && (
            <>
              <h1>Analytics</h1>
              <CinematicFeedCard
                title="Coming Soon"
                body="Creator analytics will appear here."
              />
            </>
          )}

          {section === 'settings' && (
            <>
              <h1>Settings</h1>
              <CinematicFeedCard
                title="Profile Settings"
                body="Manage your creator preferences."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
