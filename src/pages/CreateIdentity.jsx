import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function CreateIdentity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selfieFile, setSelfieFile] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);
  const [personaDescription, setPersonaDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function uploadToStorage(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selfieFile || !voiceFile) {
      setError('Please select both a photo and a voice file.');
      return;
    }
    setLoading(true);
    setError('');
    setStatus('Uploading photo...');
    try {
      const ts = Date.now();
      const selfieUrl = await uploadToStorage(
        'identities',
        `selfies/${user.id}/${ts}-${selfieFile.name}`,
        selfieFile
      );
      setStatus('Uploading voice sample...');
      const voiceUrl = await uploadToStorage(
        'identities',
        `voices/${user.id}/${ts}-${voiceFile.name}`,
        voiceFile
      );
      setStatus('Creating your identity...');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/identity/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          selfie_url: selfieUrl,
          voice_url: voiceUrl,
          persona_description: personaDescription,
          profile_id: user.id,
          tenant_id: 'studioflow'
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Identity creation failed');
      setStatus('✅ Identity created! Redirecting...');
      setTimeout(() => navigate('/generator'), 1500);
    } catch (err) {
      setError(err.message);
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto', padding: '2rem', background: '#111', borderRadius: 16, border: '1px solid #2a2a2a' }}>
      <button onClick={() => navigate('/generator')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Video Generator
      </button>
      <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create Your AI Identity</h1>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>Upload a clear photo and a voice sample to generate your identity.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ color: '#ccc', fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Profile Photo (JPG or PNG)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setSelfieFile(e.target.files[0])} style={{ color: '#fff', width: '100%' }} />
          {selfieFile && <p style={{ color: '#f2c98f', fontSize: '0.75rem', marginTop: 4 }}>✓ {selfieFile.name}</p>}
        </div>
        <div>
          <label style={{ color: '#ccc', fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Voice Sample (MP3 or WAV, 30–60 seconds)</label>
          <input type="file" accept="audio/mpeg,audio/wav,audio/mp4" onChange={e => setVoiceFile(e.target.files[0])} style={{ color: '#fff', width: '100%' }} />
          {voiceFile && <p style={{ color: '#f2c98f', fontSize: '0.75rem', marginTop: 4 }}>✓ {voiceFile.name}</p>}
        </div>
        <div>
          <label style={{ color: '#ccc', fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Describe Your Character <span style={{ color: '#555' }}>(optional)</span></label>
          <textarea value={personaDescription} onChange={e => setPersonaDescription(e.target.value)} placeholder="Confident, speaks with purpose, warm but direct..." rows={3} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '0.75rem', color: '#fff', resize: 'none', fontSize: '0.875rem' }} />
        </div>
        {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
        {status && <p style={{ color: '#f2c98f', fontSize: '0.875rem' }}>{status}</p>}
        <button type="submit" disabled={loading} style={{ background: loading ? '#333' : '#f2c98f', color: '#000', fontWeight: 700, padding: '0.875rem', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}>
          {loading ? 'Creating...' : 'Create Identity'}
        </button>
      </form>
    </div>
  );
}
