import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';

export default function ProfilePage() {
  const { profile, loading, saveProfile } = useProfile();

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
    alert('Profile updated!');
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Edit Profile</h1>

      <div className="cinematic-card" style={{ marginTop: '1rem' }}>
        <input
          name="display_name"
          placeholder="Display Name"
          defaultValue={profile.display_name}
          onChange={handleChange}
        />
        <br />

        <textarea
          name="bio"
          placeholder="Bio"
          defaultValue={profile.bio}
          onChange={handleChange}
        />
        <br />

        <input
          name="avatar_url"
          placeholder="Avatar URL"
          defaultValue={profile.avatar_url}
          onChange={handleChange}
        />
        <br />

        <button onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
