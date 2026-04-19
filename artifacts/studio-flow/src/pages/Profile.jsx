import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
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
      />

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
