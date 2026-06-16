import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FoundingSuccess() {
  const [status, setStatus] = useState('loading');
  const [memberData, setMemberData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      navigate('/');
      return;
    }

    fetch('/.netlify/functions/claim-founding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('claim-founding response:', data);
        if (data.success || data.message === 'Already a founding member') {
          setMemberData(data);
          setStatus('success');
        } else {
          setStatus('failed');
        }
      })
      .catch(err => {
        console.error('claim-founding error:', err);
        setStatus('failed');
      });
  }, []);

  if (status === 'loading') return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏅</div>
      <h2 style={{ color: '#ffb800', marginBottom: '8px' }}>Locking in your founding spot...</h2>
      <p style={{ color: '#94a3b8' }}>This will only take a moment.</p>
    </div>
  );

  if (status === 'failed') return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>Something went wrong</h2>
      <p style={{ color: '#94a3b8' }}>Please contact support at obviouslyinspiredstudio@outlook.com</p>
    </div>
  );

  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
      <h1 style={{ color: '#ffb800', marginBottom: '8px' }}>You're a Founding Member!</h1>
      <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Welcome to Studio Flow. Your founding badge has been locked in.</p>
      <button
        onClick={() => navigate('/')}
        style={{ background: '#ffb800', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '12px 32px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
      >
        Go to Dashboard →
      </button>
    </div>
  );
}
