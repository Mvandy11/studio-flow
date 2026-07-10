import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function memberHandle(email) {
  return email ? email.split('@')[0] : 'member';
}

export default function FoundingMembersSection() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('members')
        .select('id, email, role, badge, joined_at')
        .eq('role', 'founding')
        .order('joined_at', { ascending: true });

      if (!error) setMembers(data ?? []);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel('founding-members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => load()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <section style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
        <h2 className="hub-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Star size={16} /> First 1,000 Members</h2>
        {!loading && (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(245,200,66,0.12)',
            color: '#F5C842',
            border: '1px solid rgba(245,200,66,0.3)',
            borderRadius: '100px',
            padding: '2px 10px',
          }}>
            {members.length} / 1,000
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--hub-muted)' }}>Loading founding members…</p>
      ) : members.length === 0 ? (
        <div style={{
          padding: '2rem',
          background: 'var(--hub-card)',
          borderRadius: '14px',
          textAlign: 'center',
          color: 'var(--hub-muted)',
          fontSize: '0.875rem',
        }}>
          No members yet — be the first of 1,000.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.85rem',
        }}>
          {members.map((m, i) => (
            <div
              key={m.id}
              style={{
                background: 'var(--hub-card)',
                border: '1px solid rgba(245,200,66,0.15)',
                borderRadius: '14px',
                padding: '1.1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F5C842, #D4A830)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: '#0A0A0F',
                  flexShrink: 0,
                }}>
                  {memberHandle(m.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    @{memberHandle(m.email)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--hub-muted)' }}>
                    #{i + 1} · {formatDate(m.joined_at)}
                  </div>
                </div>
              </div>

              <span style={{
                alignSelf: 'flex-start',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'rgba(245,200,66,0.1)',
                color: '#F5C842',
                border: '1px solid rgba(245,200,66,0.25)',
                borderRadius: '100px',
                padding: '2px 8px',
              }}>
                <Star size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} /> First 1,000 Member
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
