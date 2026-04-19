import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';

export default function ProfilePage() {
  const { profile, loading, saveProfile } = useProfile();

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
  });

  if (loading) return <div className="cinematic-hero cinematic-fade">Loading profile...</div>;
  if (!profile) return <div className="cinematic-hero cinematic-fade">No profile found.</div>;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    await saveProfile(form);
    alert('Profile updated!');
  }

  return (
    <div className="cinematic-fade" style={{ padding: '2rem' }}>
      <h1>Edit Profile</h1>

      <div className="cinematic-card cinematic-hover" style={{ marginTop: '1rem' }}>
        <input
          className="cinematic-input"
          name="display_name"
          placeholder="Display Name"
          defaultValue={profile.display_name}
          onChange={handleChange}
        />

        <textarea
          className="cinematic-input cinematic-textarea"
          name="bio"
          placeholder="Bio"
          defaultValue={profile.bio}
          onChange={handleChange}
        />

        <input
          className="cinematic-input"
          name="avatar_url"
          placeholder="Avatar URL"
          defaultValue={profile.avatar_url}
          onChange={handleChange}
        />

        <button className="cinematic-button cinematic-hover" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
