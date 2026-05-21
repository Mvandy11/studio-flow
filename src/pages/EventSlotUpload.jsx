import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function EventSlotUpload() {
  const { slotId } = useParams();

  const [password,    setPassword]    = useState('');
  const [file,        setFile]        = useState(null);
  const [status,      setStatus]      = useState('idle'); // idle | uploading | success | error
  const [errorMsg,    setErrorMsg]    = useState('');
  const [progress,    setProgress]    = useState(0);
  const fileRef = useRef();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file)     { setErrorMsg('Please select a video file.'); setStatus('error'); return; }
    if (!password) { setErrorMsg('Password is required.'); setStatus('error'); return; }

    setStatus('uploading');
    setErrorMsg('');
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('You must be logged in to upload.');
        setStatus('error');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      // Simulate progress via XHR for a better UX
      const token = session.access_token;
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/custom-events/upload/${slotId}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status === 403) {
            reject(new Error(json.error || 'Incorrect password or unauthorized.'));
          } else if (xhr.status >= 400) {
            reject(new Error(json.error || 'Upload failed.'));
          } else {
            resolve(json);
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.send(formData);
      });

      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
          <h1 style={title}>Upload Successful!</h1>
          <p style={muted}>Your video has been uploaded to your event slot.</p>
          <Link to="/" style={linkBtn}>Back to Studio Flow</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
        <h1 style={title}>Event Slot Upload</h1>
        <p style={muted}>
          Enter the password provided by Studio Flow and select your video file.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', textAlign: 'left' }}>
          {/* Password */}
          <div style={fieldGroup}>
            <label style={label} htmlFor="esu-password">Upload Password <span style={{ color: '#f87171' }}>*</span></label>
            <input
              id="esu-password"
              type="password"
              placeholder="Enter your slot password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* File */}
          <div style={fieldGroup}>
            <label style={label}>Video File <span style={{ color: '#f87171' }}>*</span></label>
            <div
              style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: '0.75rem',
              }}
              onClick={() => fileRef.current?.click()}
            >
              <span style={{ color: file ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file ? file.name : 'No file chosen — click to browse'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold, #f5a623)', fontWeight: 600, whiteSpace: 'nowrap' }}>Browse</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {status === 'uploading' && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-gold, #f5a623)', transition: 'width 0.3s' }} />
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>{progress}%</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={errorBox}>{errorMsg}</div>
          )}

          <button
            type="submit"
            disabled={status === 'uploading'}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              background: status === 'uploading' ? 'rgba(245,166,35,0.4)' : 'var(--accent-gold, #f5a623)',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'uploading' ? `Uploading… ${progress}%` : 'Upload Video'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Styles ── */
const page = {
  minHeight: '70vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
};

const card = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '2.5rem 2rem',
  maxWidth: '480px',
  width: '100%',
  textAlign: 'center',
};

const title = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#fff',
  margin: '0 0 0.5rem',
};

const muted = {
  color: 'rgba(200,200,215,0.55)',
  fontSize: '0.9rem',
  margin: '0 0 0.25rem',
};

const fieldGroup = { marginBottom: '1.25rem' };

const label = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.45rem',
  color: 'rgba(255,255,255,0.8)',
  textAlign: 'left',
};

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const errorBox = {
  padding: '0.625rem 0.875rem',
  borderRadius: '8px',
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  color: '#fca5a5',
  fontSize: '0.875rem',
  marginBottom: '1rem',
  textAlign: 'left',
};

const linkBtn = {
  display: 'inline-block',
  marginTop: '1.25rem',
  padding: '0.6rem 1.5rem',
  borderRadius: '10px',
  background: 'var(--accent-gold, #f5a623)',
  color: '#000',
  fontWeight: 700,
  fontSize: '0.875rem',
  textDecoration: 'none',
};
