import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { CONTESTS, EVENTS, EDUCATION_CATEGORIES } from './data.js';
import HomeTab      from './tabs/HomeTab.jsx';
import ContestsTab  from './tabs/ContestsTab.jsx';
import EventsTab    from './tabs/EventsTab.jsx';
import EducationTab from './tabs/EducationTab.jsx';
import AdminTab     from './tabs/AdminTab.jsx';
import '../../styles/hub.css';

const TABS = ['Home', 'Contests', 'Events', 'Education', 'Creator Dashboard'];

const TAB_ICONS = {
  'Home':               '🏠',
  'Contests':           '🏆',
  'Events':             '🎟',
  'Education':          '📚',
  'Creator Dashboard':  '🛡',
};

export default function StudioFlowHub() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('Home');
  const [stats,     setStats]     = useState({
    activeContests:    CONTESTS.filter((c) => c.status === 'active').length,
    upcomingEvents:    EVENTS.length,
    educationSessions: EDUCATION_CATEGORIES.reduce((s, cat) => s + cat.sessions.length, 0),
    totalMembers:      0,
  });

  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_member', true);
        setStats((prev) => ({ ...prev, totalMembers: count || 0 }));
      } catch (_) {}
    })();
  }, []);

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

      {activeTab === 'Home' && (
        <HomeTab onTabChange={setActiveTab} stats={stats} />
      )}
      {activeTab === 'Contests' && <ContestsTab />}
      {activeTab === 'Events'   && <EventsTab />}
      {activeTab === 'Education' && (
        <EducationTab />
      )}
      {activeTab === 'Creator Dashboard' && <AdminTab />}
    </div>
  );
}
