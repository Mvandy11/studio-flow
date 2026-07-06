import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IdentityVideoRecorder from '../components/CreateIdentity';
import IdentityPromptGenerator from '../components/IdentityPromptGenerator';

export default function CreateIdentity() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('video');

  function handleCreated() {
    setTimeout(() => navigate('/generator'), 1500);
  }

  return (
    <div style={{ maxWidth: 560, margin: '2rem auto', padding: '0 1rem' }}>
      <button
        onClick={() => navigate('/generator')}
        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to Video Generator
      </button>

      <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create Your Identity</h1>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Record a short video of yourself, or generate an AI character from a text description.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setTab('video')}
          style={{
            flex: 1,
            padding: '0.625rem',
            borderRadius: 10,
            border: `1px solid ${tab === 'video' ? '#fabc50' : 'rgba(255,255,255,0.08)'}`,
            background: tab === 'video' ? 'rgba(250,188,80,0.1)' : 'transparent',
            color: tab === 'video' ? '#fabc50' : '#888',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Record Personal Identity
        </button>
        <button
          type="button"
          onClick={() => setTab('prompt')}
          style={{
            flex: 1,
            padding: '0.625rem',
            borderRadius: 10,
            border: `1px solid ${tab === 'prompt' ? '#fabc50' : 'rgba(255,255,255,0.08)'}`,
            background: tab === 'prompt' ? 'rgba(250,188,80,0.1)' : 'transparent',
            color: tab === 'prompt' ? '#fabc50' : '#888',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Generate AI Identity
        </button>
      </div>

      {tab === 'video' ? (
        <IdentityVideoRecorder onCreated={handleCreated} />
      ) : (
        <IdentityPromptGenerator onCreated={handleCreated} />
      )}
    </div>
  );
}
