import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function FoundingMembersDisplay() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    async function fetchMembers() {
      const { data } = await supabase
        .from('members')
        .select('email, joined_at, is_founding')
        .eq('is_founding', true)
        .order('joined_at', { ascending: true });
      setMembers(data ?? []);
    }
    fetchMembers();
  }, []);

  if (members.length === 0) return null;

  return (
    <section className="founding-members-display">
      <h3>🏅 Our Founding Members</h3>
      <p className="members-subtitle">The first {members.length} creators who believed in Studio Flow</p>
      <div className="members-grid">
        {members.map((m, i) => (
          <div key={m.email} className="member-card">
            <div className="member-avatar">
              {m.email.charAt(0).toUpperCase()}
            </div>
            <div className="member-badge">🔥 Founding Member</div>
            <div className="member-number">#{i + 1}</div>
            <div className="member-email">{m.email.split('@')[0]}</div>
            <div className="member-date">
              Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
