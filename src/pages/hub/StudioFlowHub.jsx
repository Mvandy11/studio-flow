import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { CONTESTS, EVENTS, EDUCATION_CATEGORIES } from './data.js';
import HomeTab      from './tabs/HomeTab.jsx';
import ContestsTab  from './tabs/ContestsTab.jsx';
import EventsTab    from './tabs/EventsTab.jsx';
import EducationTab from './tabs/EducationTab.jsx';
import MyTicketsTab from './tabs/MyTicketsTab.jsx';
import AdminTab     from './tabs/AdminTab.jsx';
import '../../styles/hub.css';

const TABS = ['Home', 'Contests', 'Events', 'Education', 'My Tickets', 'Creator Dashboard'];

const TAB_ICONS = {
  'Home':               '🏠',
  'Contests':           '🏆',
  'Events':             '🎟',
  'Education':          '📚',
  'My Tickets':         '🎫',
  'Creator Dashboard':  '🛡',
};

export default function StudioFlowHub() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab]   = useState('Home');
  const [isMember,  setIsMember]    = useState(false);
  const [ticketKey, setTicketKey]   = useState(0);      // bump to refresh ticket tab
  const [stats,     setStats]       = useState({
    activeContests:   CONTESTS.filter((c) => c.status === 'active').length,
    upcomingEvents:   EVENTS.length,
    educationSessions: EDUCATION_CATEGORIES.reduce((s, cat) => s + cat.sessions.length, 0),
    totalMembers:     0,
  });

  // Load membership status
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_member')
          .eq('id', user.id)
          .maybeSingle();
        setIsMember(!!data?.is_member);
      } catch (_) {}
    })();
  }, [user, authLoading]);

  // Load member count for stats
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
  }, [isMember]);

  const handleToggleMember = useCallback(async () => {
    if (!user) {
      // Redirect to login/signup — just show alert for now
      alert('Sign in to become a Studio Flow Member!');
      return;
    }
    const next = !isMember;
    setIsMember(next);
    try {
      await supabase
        .from('profiles')
        .update({ is_member: next })
        .eq('id', user.id);
    } catch (_) {
      setIsMember(!next); // revert
    }
  }, [user, isMember]);

  const handleTicketPurchased = useCallback(() => {
    setTicketKey((k) => k + 1);
  }, []);

  return (
    <div className="hub">
      {/* ── Tab bar ── */}
      <nav className="hub-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`hub-tab${activeTab === tab ? ' hub-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span style={{ marginRight:'0.3rem' }}>{TAB_ICONS[tab]}</span>
            {tab}
          </button>
        ))}

        {/* Membership toggle in tab bar */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'0.625rem', padding:'0 0.5rem' }}>
          {user ? (
            <label className="member-toggle" title={isMember ? 'Cancel membership' : 'Become a Studio Flow Member'}>
              <div
                className={`member-toggle__pill${isMember ? ' member-toggle__pill--on' : ''}`}
                onClick={handleToggleMember}
                role="switch"
                aria-checked={isMember}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleToggleMember()}
              >
                <div className="member-toggle__knob" />
              </div>
              <span style={{ fontSize:'0.78rem', color: isMember ? 'var(--hub-green)' : 'var(--hub-muted)', fontWeight:600, whiteSpace:'nowrap' }}>
                {isMember ? '✓ Member' : 'Member?'}
              </span>
            </label>
          ) : (
            <span style={{ fontSize:'0.78rem', color:'var(--hub-muted)' }}>Sign in to join</span>
          )}
        </div>
      </nav>

      {/* ── Tab content ── */}
      {activeTab === 'Home' && (
        <HomeTab
          isMember={isMember}
          onToggleMember={handleToggleMember}
          onTabChange={setActiveTab}
          stats={stats}
        />
      )}
      {activeTab === 'Contests' && (
        <ContestsTab isMember={isMember} />
      )}
      {activeTab === 'Events' && (
        <EventsTab isMember={isMember} onTicketPurchased={handleTicketPurchased} />
      )}
      {activeTab === 'Education' && (
        <EducationTab isMember={isMember} onTicketPurchased={handleTicketPurchased} />
      )}
      {activeTab === 'My Tickets' && (
        <MyTicketsTab refreshKey={ticketKey} />
      )}
      {activeTab === 'Creator Dashboard' && (
        <AdminTab />
      )}
    </div>
  );
}
