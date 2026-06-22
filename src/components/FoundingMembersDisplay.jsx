import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function FoundingMembersDisplay() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    supabase
      .from('members')
      .select('email, display_name, joined_at, badge')
      .eq('is_founding', true)
      .order('joined_at', { ascending: true })
      .then(({ data }) => setMembers(data ?? []));
  }, []);

  if (members.length === 0) return null;

  return (
    <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px' }}>
      <h3 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
        🏅 Our First 1,000 Members
      </h3>
      <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '40px' }}>
        The first {members.length} creators who believed in Studio Flow
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        {members.map((m, i) => (
          <div
            key={m.email}
            style={{
              background: '#1e293b',
              border: '1px solid #ffb800',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffb800, #ff6b35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', fontWeight: '800', color: '#000',
              margin: '0 auto 12px',
            }}>
              {(m.display_name || m.email).charAt(0).toUpperCase()}
            </div>
            <div style={{
              fontSize: '0.7rem', background: 'rgba(255,184,0,0.2)', color: '#ffb800',
              borderRadius: '20px', padding: '3px 10px', marginBottom: '8px', display: 'inline-block',
            }}>
              First 1,000 Member
            </div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>
              {m.display_name || m.email.split('@')[0]}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
              #{i + 1} · {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
