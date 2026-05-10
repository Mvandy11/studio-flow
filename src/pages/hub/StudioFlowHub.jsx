import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import HomeTab       from './tabs/HomeTab.jsx';
import ContestsTab   from './tabs/ContestsTab.jsx';
import EventsTab     from './tabs/EventsTab.jsx';
import SubmissionsTab from './tabs/SubmissionsTab.jsx';
import AdminTab      from './tabs/AdminTab.jsx';
import '../../styles/hub.css';

const TABS = ['Home', 'Contests', 'Events', 'Submissions', 'Creator Dashboard'];

const TAB_ICONS = {
  'Home':               '🏠',
  'Contests':           '🏆',
  'Events':             '🎟',
  'Submissions':        '📬',
  'Creator Dashboard':  '🛡',
};

export default function StudioFlowHub() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Home');
  const [stats,     setStats]     = useState({
    activeContests: 0,
    upcomingEvents: 0,
    totalMembers:   0,
  });


  return (
    <div className="hub">
      <nav className="hub-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`hub-tab${activeTab === tab ? ' hub-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span style={{ marginRight: '0.3rem' }}>{TAB_ICONS[tab]}</span>
            {tab}
          </button>
        ))}

        {user && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--hub-muted)' }}>
              {user.email?.split('@')[0]}
            </span>
          </div>
        )}
      </nav>

      {activeTab === 'Home'             && <HomeTab onTabChange={setActiveTab} stats={stats} />}
      {activeTab === 'Contests'         && <ContestsTab />}
      {activeTab === 'Events'           && <EventsTab />}
      {activeTab === 'Submissions'      && <SubmissionsTab />}
      {activeTab === 'Creator Dashboard' && <AdminTab />}
    </div>
  );
}
