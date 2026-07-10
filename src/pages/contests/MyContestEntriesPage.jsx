import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMembership } from '../../modules/memberships/useMembership';
import { isCreatorAdmin } from '../../lib/roles';

const STATUS_COLORS = {
  active:    { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa',  border: 'rgba(96,165,250,0.25)'  },
  voting:    { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa',  border: 'rgba(167,139,250,0.25)' },
  completed: { bg: 'rgba(52,211,153,0.12)',  color: '#34d399',  border: 'rgba(52,211,153,0.25)'  },
  archived:  { bg: 'rgba(148,163,184,0.1)',  color: '#94a3b8',  border: 'rgba(148,163,184,0.2)'  },
  draft:     { bg: 'rgba(255,255,255,0.06)', color: 'rgba(200,200,215,0.5)', border: 'rgba(255,255,255,0.1)' },
};

export default function MyContestEntriesPage() {
  const { role }   = useAuth();
  const { tier }   = useMembership();
  const isAdmin    = isCreatorAdmin(role);
  const isEligible = isAdmin || tier === 'member_30' || tier === 'creator_50';

  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [user,     setUser]     = useState(null);

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUser(session.user);

      const { data, error: err } = await supabase
        .from('contest_entries')
        .select(`
          id, title, description, vote_count, created_at,
          contests:contest_id ( id, title, status, prize_description )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setEntries(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="cinematic-spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  );

  if (!user) return (
    <div style={S.gate}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</div>
      <h2 style={S.gateTitle}>Sign in to view entries</h2>
      <p style={S.gateSub}>Log in to see your contest submissions.</p>
      <Link to="/login" style={S.primaryBtn}>Log In</Link>
    </div>
  );

  const totalVotes = entries.reduce((s, e) => s + (e.vote_count ?? 0), 0);

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={S.title}>🏆 My Contest Entries</h1>
          <p style={S.sub}>{entries.length} submission{entries.length !== 1 ? 's' : ''} · {totalVotes} total votes</p>
        </div>
        <Link to="/contests" style={S.outlineBtn}>Browse Contests →</Link>
      </div>

      {/* Free-tier reward eligibility notice */}
      {user && !isEligible && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontWeight: 700, margin: '0 0 0.2rem', fontSize: '0.9rem', color: '#fbbf24' }}>⚠️ Not eligible for contest rewards</p>
            <p style={{ color: 'rgba(200,200,215,0.5)', fontSize: '0.8rem', margin: 0 }}>Upgrade to a membership to compete for prizes and win rewards.</p>
          </div>
          <Link to="/membership" style={{ display: 'inline-block', padding: '0.5rem 1.1rem', borderRadius: '9px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', flexShrink: 0 }}>
            Upgrade →
          </Link>
        </div>
      )}

      {error && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{error}</p>}

      {entries.length === 0 ? (
        <div style={S.empty}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
          <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>No contest entries yet</p>
          <p style={S.gateSub}>Enter a contest to appear here.</p>
          <Link to="/contests" style={{ ...S.primaryBtn, marginTop: '1rem' }}>Browse Contests</Link>
        </div>
      ) : (
        <div style={S.list}>
          {entries.map(entry => {
            const cs = STATUS_COLORS[entry.contests?.status] ?? STATUS_COLORS.draft;
            return (
              <div key={entry.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ ...S.statusBadge, background: cs.bg, color: cs.color, borderColor: cs.border }}>
                        {entry.contests?.status ?? 'unknown'}
                      </span>
                    </div>
                    <div style={S.entryTitle}>{entry.title || '(Untitled entry)'}</div>
                    {entry.contests?.title && (
                      <div style={S.contestName}>
                        Contest: <Link to={`/contests/${entry.contests.id}`} style={{ color: '#a78bfa', textDecoration: 'none' }}>{entry.contests.title}</Link>
                      </div>
                    )}
                    {entry.description && (
                      <p style={S.entryDesc}>{entry.description}</p>
                    )}
                    <div style={S.entryDate}>{new Date(entry.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={S.voteBox}>
                    <div style={S.voteCount}>{entry.vote_count ?? 0}</div>
                    <div style={S.voteLabel}>votes</div>
                  </div>
                </div>
                {entry.contests?.prize_description && (
                  <div style={S.prize}>🏅 Prize: {entry.contests.prize_description}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to="/contests" style={S.outlineBtn}>Browse All Contests</Link>
      </div>
    </div>
  );
}

const S = {
  page:        { maxWidth: '760px', margin: '0 auto', padding: '2rem 1.25rem' },
  title:       { fontSize: '1.7rem', fontWeight: 800, color: '#fff', margin: 0 },
  sub:         { color: 'rgba(200,200,215,0.45)', fontSize: '0.88rem', margin: '0.2rem 0 0' },
  list:        { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  card:        { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem' },
  statusBadge: { fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px', border: '1px solid', textTransform: 'capitalize' },
  entryTitle:  { fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.2rem' },
  contestName: { color: 'rgba(200,200,215,0.5)', fontSize: '0.82rem', marginBottom: '0.3rem' },
  entryDesc:   { color: 'rgba(200,200,215,0.5)', fontSize: '0.83rem', margin: '0.25rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  entryDate:   { color: 'rgba(200,200,215,0.35)', fontSize: '0.75rem', marginTop: '0.3rem' },
  voteBox:     { textAlign: 'center', minWidth: '56px' },
  voteCount:   { fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa' },
  voteLabel:   { color: 'rgba(200,200,215,0.4)', fontSize: '0.72rem' },
  prize:       { marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)', color: '#34d399', fontSize: '0.82rem' },
  empty:       { padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', color: '#fff' },
  gate:        { maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '2rem' },
  gateTitle:   { fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' },
  gateSub:     { color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', margin: 0 },
  primaryBtn:  { display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' },
  outlineBtn:  { display: 'inline-block', padding: '0.55rem 1.25rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(220,220,235,0.7)', fontWeight: 600, fontSize: '0.87rem', textDecoration: 'none' },
};
