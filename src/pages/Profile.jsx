import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabaseClient';
import ProfileHeader from '../components/ProfileHeader';
import CinematicModal from '../components/CinematicModal';

export default function ProfilePage() {
  const { profile, loading, saveProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
  });

  if (loading) return <div className="cinematic-hero">Loading profile...</div>;
  if (!profile) return <div className="cinematic-hero">No profile found.</div>;

  // --- MEMBERSHIP LABEL LOGIC -----------------------------------------------
  function getMembershipLabel() {
    if (profile.membership_active) {
      if (profile.membership_tier === 'creator_50') return 'Creator Member';
      if (profile.membership_tier === 'member_30') return 'Member';
    }
    return 'Free Member';
  }

  // --- SUBSCRIPTION MANAGEMENT -----------------------------------------------
  async function handleManageSubscription() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: member } = await supabase
      .from('members')
      .select('stripe_customer_id')
      .eq('email', session.user.email)
      .single();

    if (!member?.stripe_customer_id) {
      alert('No active membership found.');
      return;
    }

    const res = await fetch('/.netlify/functions/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: member.stripe_customer_id }),
    });
    const { url } = await res.json();
    window.location.href = url;
  }

  // --- FORM HANDLERS ---------------------------------------------------------
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    await saveProfile(form);
    setEditing(false);
  }

  return (
    <div style={{ padding: '2rem' }}>
      <ProfileHeader
        name={profile.display_name}
        bio={profile.bio}
        avatar={profile.avatar_url}
        membershipLabel={getMembershipLabel()}   // ⭐ NEW
      />

      {/* Membership Status Display */}
      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#111',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '1.1rem',
        }}
      >
        <strong>Membership:</strong> {getMembershipLabel()}
        <button
          onClick={handleManageSubscription}
          style={{
            display: 'block',
            padding: '10px 24px',
            background: 'transparent',
            border: '1px solid #475569',
            color: '#94a3b8',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginTop: '12px',
          }}
        >
          Manage / Cancel Subscription
        </button>
      </div>

      <button
        className="cinematic-button-accent cinematic-hover"
        style={{ marginTop: '1.5rem' }}
        onClick={() => setEditing(true)}
      >
        Edit Profile
      </button>

      <CinematicModal open={editing} onClose={() => setEditing(false)}>
        <h2>Edit Profile</h2>

        <input
          name="display_name"
          className="cinematic-input"
          placeholder="Display Name"
          defaultValue={profile.display_name}
          onChange={handleChange}
        />

        <textarea
          name="bio"
          className="cinematic-input cinematic-textarea"
          placeholder="Bio"
          defaultValue={profile.bio}
          onChange={handleChange}
        />

        <input
          name="avatar_url"
          className="cinematic-input"
          placeholder="Avatar URL"
          defaultValue={profile.avatar_url}
          onChange={handleChange}
        />

        <button className="cinematic-button-accent" onClick={handleSave}>
          Save
        </button>
      </CinematicModal>
    </div>
  );
}
