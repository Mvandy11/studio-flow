import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api.js';
import HomeTab       from './tabs/HomeTab.jsx';
import ContestsTab   from './tabs/ContestsTab.jsx';
import '../../styles/hub.css';

const TABS = ['Home', 'Contests'];

const TAB_ICONS = {
  'Home':     '🏠',
  'Contests': '🏆',
};

export default function StudioFlowHub() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Home');
  const [stats,     setStats]     = useState({
    activeContests: 0,
    totalMembers:   0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [contData, memberRes] = await Promise.all([
          api('/contests'),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          activeContests: contData.data?.length ?? 0,
          totalMembers:   memberRes.count       ?? 0,
        });
      } catch (err) {
        console.error('[hub] loadStats error:', err.message ?? err);
      }
    }
    loadStats();
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

      {activeTab === 'Home'     && <HomeTab onTabChange={setActiveTab} stats={stats} />}
      {activeTab === 'Contests' && <ContestsTab />}
    </div>
  );
}
