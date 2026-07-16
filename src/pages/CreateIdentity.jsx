import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import './createIdentity.css';

const BUCKET = 'identities';

function StepIndicator({ current, total }) {
  return (
    <div className="ci-steps">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`ci-step${i + 1 === current ? ' ci-step--active' : i + 1 < current ? ' ci-step--done' : ''}`}>
          <span className="ci-step__dot">{i + 1 < current ? '✓' : i + 1}</span>
          <span className="ci-step__label">
            {['Name', 'Photo', 'Voice'][i]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Name ────────────────────────────────────────────────────────────
function StepName({ name, setName, onNext }) {
  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Give your identity a name</h2>
      <p className="ci-hint">This is how you'll select it in the Video Generator.</p>

      <label className="ci-label">Identity Name</label>
      <input
        className="ci-input"
        type="text"
        placeholder='e.g. "Professional Mike"'
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />

      <button
        className="ci-btn ci-btn--primary"
        disabled={!name.trim()}
        onClick={onNext}
      >
        Next →
      </button>
    </div>
  );
}

// ─── Step 2: Photo ───────────────────────────────────────────────────────────
function StepPhoto({ photoFile, setPhotoFile, photoPreview, setPhotoPreview, onNext, onBack }) {
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Upload your photo</h2>
      <p className="ci-hint">Upload a clear front-facing photo of yourself.</p>

      <div className="ci-photo-area">
        {photoPreview ? (
          <img src={photoPreview} alt="preview" className="ci-photo-preview" />
        ) : (
          <div className="ci-photo-placeholder">📷</div>
        )}
      </div>

      <label className="ci-file-label">
        {photoPreview ? 'Change photo' : 'Choose photo'}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </label>

      <p className="ci-requirements">
        Face clearly visible · Good lighting · No sunglasses
      </p>

      <div className="ci-nav">
        <button className="ci-btn" onClick={onBack}>← Back</button>
        <button className="ci-btn ci-btn--primary" disabled={!photoFile} onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Voice ───────────────────────────────────────────────────────────
function StepVoice({ audioFile, setAudioFile, audioBlob, setAudioBlob, onBack, onSubmit, submitting }) {
  const [recording, setRecording]   = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [recError, setRecError]     = useState('');

  const mediaRecRef = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);

  async function startRecording() {
    setRecError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setElapsed(0);
      setAudioPreviewUrl(null);
      setAudioBlob(null);

      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioFile(null);
        setAudioPreviewUrl(URL.createObjectURL(blob));
      };
      mediaRecRef.current = rec;
      rec.start();
      setRecording(true);

      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err) {
      setRecError('Microphone access denied. Please allow microphone and try again.');
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current.stop();
    setRecording(false);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);
    setAudioBlob(null);
    setAudioPreviewUrl(URL.createObjectURL(file));
  }

  const hasAudio = audioBlob || audioFile;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Add a voice sample</h2>
      <p className="ci-hint">30–60 seconds recommended. Record now or upload a file.</p>

      <div className="ci-voice-options">
        {/* Record */}
        <div className="ci-voice-card">
          <p className="ci-voice-card__title">🎙 Record now</p>
          {recording ? (
            <>
              <p className="ci-timer">{mm}:{ss}</p>
              <button className="ci-btn ci-btn--danger" onClick={stopRecording}>
                Stop
              </button>
            </>
          ) : (
            <button className="ci-btn" onClick={startRecording} disabled={submitting}>
              Record
            </button>
          )}
          {recError && <p className="ci-field-error">{recError}</p>}
        </div>

        {/* Upload */}
        <div className="ci-voice-card">
          <p className="ci-voice-card__title">📁 Upload file</p>
          <label className="ci-file-label">
            Choose audio
            <input
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={submitting}
            />
          </label>
          <p className="ci-hint" style={{ marginTop: 6 }}>mp3, m4a, wav</p>
        </div>
      </div>

      {audioPreviewUrl && (
        <div className="ci-audio-preview">
          <p className="ci-hint" style={{ marginBottom: 6 }}>Preview:</p>
          <audio src={audioPreviewUrl} controls style={{ width: '100%' }} />
        </div>
      )}

      <div className="ci-nav">
        <button className="ci-btn" onClick={onBack} disabled={submitting}>← Back</button>
        <button
          className="ci-btn ci-btn--primary"
          disabled={!hasAudio || submitting}
          onClick={onSubmit}
        >
          {submitting ? (
            <><span className="ci-spinner" /> Creating...</>
          ) : (
            'Create Identity'
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CreateIdentityPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [step, setStep]               = useState(1);
  const [name, setName]               = useState('');
  const [photoFile, setPhotoFile]     = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [audioFile, setAudioFile]     = useState(null);
  const [audioBlob, setAudioBlob]     = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone]               = useState(false);

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const creatorId = user.id;
      const ts = Date.now();

      // ── Upload photo ──────────────────────────────────────────────────────
      const photoPath = `selfies/${creatorId}/${ts}-${photoFile.name}`;
      const { error: photoErr } = await supabase.storage
        .from(BUCKET)
        .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false });
      if (photoErr) throw new Error(`Photo upload failed: ${photoErr.message}`);

      const { data: { publicUrl: imageUrl } } = supabase.storage.from(BUCKET).getPublicUrl(photoPath);

      // ── Upload audio ──────────────────────────────────────────────────────
      const audioSource = audioBlob || audioFile;
      const audioName   = audioFile?.name || 'recording.webm';
      const audioType   = audioBlob ? 'audio/webm' : audioFile.type;
      const audioPath   = `voices/${creatorId}/${ts}-${audioName}`;

      const { error: audioErr } = await supabase.storage
        .from(BUCKET)
        .upload(audioPath, audioSource, { contentType: audioType, upsert: false });
      if (audioErr) throw new Error(`Audio upload failed: ${audioErr.message}`);

      const { data: { publicUrl: audioUrl } } = supabase.storage.from(BUCKET).getPublicUrl(audioPath);

      // ── Insert row ────────────────────────────────────────────────────────
      const { error: insertErr } = await supabase
        .from('identities')
        .insert({ profile_id: creatorId, name: name.trim(), image_url: imageUrl, audio_url: audioUrl });
      if (insertErr) throw new Error(`Save failed: ${insertErr.message}`);

      setDone(true);
    } catch (err) {
      console.error('[CreateIdentity] submit error:', err);
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(1);
    setName('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setAudioFile(null);
    setAudioBlob(null);
    setSubmitError('');
    setDone(false);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="ci-wrapper">
        <div className="ci-card">
          <div className="ci-success">
            <p className="ci-success__icon">✅</p>
            <h2 className="ci-heading">Identity created!</h2>
            <p className="ci-hint">You can now use <strong>{name}</strong> in the Video Generator.</p>
            <div className="ci-nav" style={{ justifyContent: 'center', marginTop: 24 }}>
              <button className="ci-btn" onClick={reset}>Create Another</button>
              <button className="ci-btn ci-btn--primary" onClick={() => navigate('/generator')}>
                Go to Video Generator →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ci-wrapper">
      <div className="ci-card">
        <StepIndicator current={step} total={3} />

        {submitError && <div className="ci-error">{submitError}</div>}

        {step === 1 && (
          <StepName
            name={name}
            setName={setName}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepPhoto
            photoFile={photoFile}
            setPhotoFile={setPhotoFile}
            photoPreview={photoPreview}
            setPhotoPreview={setPhotoPreview}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepVoice
            audioFile={audioFile}
            setAudioFile={setAudioFile}
            audioBlob={audioBlob}
            setAudioBlob={setAudioBlob}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
