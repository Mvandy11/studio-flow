import '../../src/styles/dev.css';
import { useNavigate } from 'react-router-dom';
import { useSessions, useCreateSession } from '../hooks/useSessions';
import { useStudioFlowStore } from '../context/useStudioFlowStore';
import SessionCard from '../components/SessionCard';
import type { Session } from '../mock/seed';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type StatusGroup = { label: string; statuses: Session['status'][] };

const GROUPS: StatusGroup[] = [
  { label: '🔴 Live Now',  statuses: ['live'] },
  { label: '📅 Scheduled', statuses: ['scheduled'] },
  { label: '✅ Published', statuses: ['published'] },
  { label: '✎ Drafts',     statuses: ['draft'] },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useStudioFlowStore();
  const { data: sessions = [], isLoading } = useSessions();
  const { mutate: createSession, isPending } = useCreateSession();

  const mySessions = sessions.filter((s) => s.creator_id === user.id);

  const stats = {
    total:     mySessions.length,
    live:      mySessions.filter((s) => s.status === 'live').length,
    published: mySessions.filter((s) => s.status === 'published').length,
    drafts:    mySessions.filter((s) => s.status === 'draft').length,
  };

  // ⭐ Membership tallies
  const [memberTallies, setMemberTallies] = useState({
    creatorCount: 0,
    memberCount: 0,
    freeCount: 0,
  });

  async function loadMemberTallies() {
    const { count: creatorCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('membership_active', true)
      .eq('membership_tier', 'creator_50');

    const { count: memberCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('membership_active', true)
      .eq('membership_tier', 'member_30');

    const { count: freeCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('membership_active', false);

    setMemberTallies({ creatorCount, memberCount, freeCount });
  }

  useEffect(() => {
    loadMemberTallies();

    const interval = setInterval(() => {
      loadMemberTallies();
    }, 15000); // auto-refresh every 15 seconds

    return () => clearInterval(interval);
  }, []);

  function handleCreate() {
    createSession(
      {
        title: 'New Session',
        description: '',
        thumbnail_url: 'https://images.unsplash.com/photo-1519214605650-76a613ee3245?w=400&q=80',
        status: 'draft',
      },
      { onSuccess: (s) => navigate(`/dev/session/${s.id}/edit`) }
    );
  }

  return (
    <div className="cinematic-layout cinematic-fade">
      {/* ── Dev badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fabc50', background: 'rgba(250,188,80,0.12)', border: '1px solid rgba(250,188,80,0.3)', borderRadius: '4px', padding: '0.2rem 0.55rem', marginBottom: '0.6rem' }}>
            🛠 Dev Mode
          </span>
          <h1 className="cinematic-title">Creator Dashboard</h1>
          <p className="cinematic-subtitle" style={{ color: '#888', marginTop: '0.25rem' }}>
            Signed in as <strong style={{ color: '#c0c0e0' }}>{user.name}</strong>
          </p>
        </div>
        <button
          className="cinematic-button-accent"
          onClick={handleCreate}
          disabled={isPending}
          style={{ flexShrink: 0 }}
        >
          {isPending ? 'Creating…' : '+ Create Session'}
        </button>
      </div>

      {/* ── Session Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {([
          { label: 'Total',     value: stats.total,     color: '#a78bfa' },
          { label: 'Live',      value: stats.live,      color: '#f87171' },
          { label: 'Published', value: stats.published,  color: '#4ade80' },
          { label: 'Drafts',    value: stats.drafts,    color: '#888' },
        ] as const).map(({ label, value, color }) => (
          <div
            key={label}
            className="cinematic-card"
            style={{ padding: '1rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color, letterSpacing: '-0.02em' }}>
              {value}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.2rem' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Membership Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="cinematic-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa' }}>
            {memberTallies.creatorCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.2rem' }}>
            Creator Members
          </div>
        </div>

        <div className="cinematic-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>
            {memberTallies.memberCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.2rem' }}>
            Members
          </div>
        </div>

        <div className="cinematic-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#999' }}>
            {memberTallies.freeCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.2rem' }}>
            Free Users
          </div>
        </div>
      </div>

      {/* ── All creators' sessions grouped by status ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <div className="cinematic-spinner" />
        </div>
      ) : (
        GROUPS.map(({ label, statuses }) => {
          const group = sessions.filter((s) => statuses.includes(s.status));
          if (!group.length) return null;
          return (
            <div key={label} style={{ marginBottom: '2rem' }}>
              <h2 className="cinematic-subtitle" style={{ marginBottom: '1rem', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>
                {label}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
                {group.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/dev/chat/${session.id}`)}
                    onEdit={
                      session.creator_id === user.id
                        ? () => navigate(`/dev/session/${session.id}/edit`)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
