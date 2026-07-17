import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import './createIdentity.css';

const BUCKET = 'identities';
const STEP_LABELS = ['Name', 'Photo', 'Voice', 'Script', 'Generate'];

/* ── Progress indicator ──────────────────────────────────── */
function StepIndicator({ current }) {
  return (
    <div className="ci-steps">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className={`ci-step${i + 1 === current ? ' ci-step--active' : i + 1 < current ? ' ci-step--done' : ''}`}>
          <span className="ci-step__dot">{i + 1 < current ? '✓' : i + 1}</span>
          <span className="ci-step__label">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Step 1: Name ────────────────────────────────────────── */
function StepName({ name, setName, onNext }) {
  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Give your identity a name</h2>
      <p className="ci-hint">This is the name of your avatar character.</p>

      <label className="ci-label">Identity Name</label>
      <input
        className="ci-input"
        type="text"
        placeholder='e.g. "Professional Mike"'
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />

      <button className="ci-btn ci-btn--primary" disabled={!name.trim()} onClick={onNext}>
        Next →
      </button>
    </div>
  );
}

/* ── Step 2: Photo ───────────────────────────────────────── */
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
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </label>

      <p className="ci-requirements">Face clearly visible · Good lighting · No sunglasses</p>

      <div className="ci-nav">
        <button className="ci-btn" onClick={onBack}>← Back</button>
        <button className="ci-btn ci-btn--primary" disabled={!photoFile} onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Voice ───────────────────────────────────────── */
function StepVoice({ audioFile, setAudioFile, audioBlob, setAudioBlob, onBack, onNext }) {
  const [recording, setRecording]         = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [recError, setRecError]           = useState('');

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
    } catch {
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
        <div className="ci-voice-card">
          <p className="ci-voice-card__title">🎙 Record now</p>
          {recording ? (
            <>
              <p className="ci-timer">{mm}:{ss}</p>
              <button className="ci-btn ci-btn--danger" onClick={stopRecording}>Stop</button>
            </>
          ) : (
            <button className="ci-btn" onClick={startRecording}>Record</button>
          )}
          {recError && <p className="ci-field-error">{recError}</p>}
        </div>

        <div className="ci-voice-card">
          <p className="ci-voice-card__title">📁 Upload file</p>
          <label className="ci-file-label">
            Choose audio
            <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileUpload} />
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
        <button className="ci-btn" onClick={onBack}>← Back</button>
        <button className="ci-btn ci-btn--primary" disabled={!hasAudio} onClick={onNext}>
          Next: Script →
        </button>
      </div>
    </div>
  );
}

/* ── Step 4: Script ──────────────────────────────────────── */
function StepScript({ scriptText, setScriptText, sceneDescription, setSceneDescription, onBack, onNext }) {
  const [sceneOpen, setSceneOpen] = useState(false);

  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Write your script</h2>
      <p className="ci-hint">What will your avatar say? 30–90 seconds recommended.</p>

      <label className="ci-label">Script</label>
      <textarea
        className="ci-input"
        rows={6}
        placeholder="Hey everyone, it's [your name] and today I want to talk about..."
        value={scriptText}
        onChange={e => setScriptText(e.target.value)}
        style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
      />
      <p style={{ margin: '0.3rem 0 1rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', textAlign: 'right' }}>
        {scriptText.length} / 1000 characters
      </p>

      {/* Collapsible scene description */}
      <button
        type="button"
        onClick={() => setSceneOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(200,200,215,0.55)', fontSize: '0.85rem',
          padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem',
          marginBottom: sceneOpen ? '0.6rem' : '1.25rem',
        }}
      >
        🎬 Add a scene description (optional) {sceneOpen ? '▲' : '▼'}
      </button>

      {sceneOpen && (
        <textarea
          className="ci-input"
          rows={3}
          placeholder="Describe the background, lighting, and setting for your video..."
          value={sceneDescription}
          onChange={e => setSceneDescription(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: '1.25rem' }}
        />
      )}

      <div className="ci-nav">
        <button className="ci-btn" onClick={onBack}>← Back</button>
        <button className="ci-btn ci-btn--primary" disabled={!scriptText.trim()} onClick={onNext}>
          Next: Preview &amp; Generate →
        </button>
      </div>
    </div>
  );
}

/* ── Step 5: Generate ────────────────────────────────────── */
function StepGenerate({ name, photoPreview, audioBlob, audioFile, scriptText, sceneDescription, onBack, onGenerate, generating, generateStatus, generateError, jobId, onReset }) {
  const navigate  = useNavigate();
  const hasVoice  = audioBlob || audioFile;
  const scriptExcerpt = scriptText.length > 100 ? scriptText.slice(0, 100) + '...' : scriptText;
  const sceneExcerpt  = sceneDescription?.length > 60 ? sceneDescription.slice(0, 60) + '...' : sceneDescription;

  // ── Success state ──────────────────────────────────────
  if (generateStatus === 'done') {
    return (
      <div className="ci-step-body" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>✅</p>
        <h2 className="ci-heading">Your video is generating!</h2>
        <p className="ci-hint">
          <strong>{name}</strong> is being created. This usually takes 2–5 minutes.
        </p>
        {jobId && (
          <p style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)', marginTop: '0.5rem' }}>
            Job ID: {jobId}
          </p>
        )}
        <div className="ci-nav" style={{ justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <button className="ci-btn ci-btn--primary" onClick={() => navigate('/my-videos')}>
            Watch in My Videos →
          </button>
          <button className="ci-btn" onClick={onReset}>
            Create Another Avatar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Ready to generate!</h2>
      <p className="ci-hint">Review your avatar details then hit generate.</p>

      {/* Summary card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1rem 1.1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {photoPreview ? (
            <img src={photoPreview} alt={name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(110,168,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🎭</div>
          )}
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'rgba(220,220,235,0.9)' }}>{name}</p>
            {hasVoice && (
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(134,239,172,0.75)' }}>✅ Voice sample ready</p>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
          <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.35)' }}>
            📝 Script preview
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)', lineHeight: 1.5 }}>
            "{scriptExcerpt}"
          </p>
        </div>

        {sceneExcerpt && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
            <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.35)' }}>
              🎬 Scene
            </p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)', lineHeight: 1.5 }}>
              {sceneExcerpt}
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {generateError && (
        <div className="ci-error" style={{ marginBottom: '1rem' }}>
          Something went wrong: {generateError}
        </div>
      )}

      {/* Progress status */}
      {generating && generateStatus && (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(200,200,215,0.55)', marginBottom: '0.75rem' }}>
          <span className="ci-spinner" /> {generateStatus}
        </p>
      )}

      {/* Generate button */}
      <button
        className="ci-btn ci-btn--primary"
        style={{ width: '100%', fontSize: '1rem', padding: '0.85rem', justifyContent: 'center' }}
        disabled={generating}
        onClick={onGenerate}
      >
        {generating ? generateStatus || 'Working…' : '🎬 Generate My Avatar Video'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(200,200,215,0.3)', marginTop: '0.75rem' }}>
        Your video will appear in My Videos when it's ready (2–5 minutes)
      </p>

      {!generating && (
        <div className="ci-nav" style={{ marginTop: '1rem' }}>
          <button className="ci-btn" onClick={onBack}>← Back</button>
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function CreateIdentityPage() {
  const { user } = useAuth();

  const [step, setStep]                     = useState(1);
  const [name, setName]                     = useState('');
  const [photoFile, setPhotoFile]           = useState(null);
  const [photoPreview, setPhotoPreview]     = useState(null);
  const [audioFile, setAudioFile]           = useState(null);
  const [audioBlob, setAudioBlob]           = useState(null);
  const [scriptText, setScriptText]         = useState('');
  const [sceneDescription, setSceneDescription] = useState('');

  const [generating, setGenerating]         = useState(false);
  const [generateStatus, setGenerateStatus] = useState('');
  const [generateError, setGenerateError]   = useState('');
  const [jobId, setJobId]                   = useState(null);

  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);
    setGenerateError('');

    try {
      const creatorId = user.id;
      const ts = Date.now();

      // ── Step A: Upload files ────────────────────────────────────────────────
      setGenerateStatus('Saving your identity...');

      const photoPath = `selfies/${creatorId}/${ts}-${photoFile.name}`;
      const { error: photoErr } = await supabase.storage
        .from(BUCKET)
        .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false });
      if (photoErr) throw new Error(`Photo upload failed: ${photoErr.message}`);
      const { data: { publicUrl: imageUrl } } = supabase.storage.from(BUCKET).getPublicUrl(photoPath);

      const audioSource = audioBlob || audioFile;
      const audioName   = audioFile?.name || 'recording.webm';
      const audioType   = audioBlob ? 'audio/webm' : audioFile.type;
      const audioPath   = `voices/${creatorId}/${ts}-${audioName}`;
      const { error: audioErr } = await supabase.storage
        .from(BUCKET)
        .upload(audioPath, audioSource, { contentType: audioType, upsert: false });
      if (audioErr) throw new Error(`Audio upload failed: ${audioErr.message}`);
      const { data: { publicUrl: audioUrl } } = supabase.storage.from(BUCKET).getPublicUrl(audioPath);

      // ── Insert identity ─────────────────────────────────────────────────────
      const { data: identity, error: identityErr } = await supabase
        .from('identities')
        .insert({
          creator_id: creatorId,
          profile_id: creatorId,
          tenant_id:  creatorId,
          name:       name.trim(),
          selfie_url: imageUrl,
          image_url:  imageUrl,
          voice_url:  audioUrl,
          audio_url:  audioUrl,
          status:     'active',
        })
        .select()
        .single();
      if (identityErr) throw new Error(`Identity save failed: ${identityErr.message}`);

      // ── Step B+C: Create render job + fire webhook via API ─────────────────
      setGenerateStatus('Submitting your video for generation...');

      const res = await fetch('/api/render-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identity_id:      identity.id,
          creator_id:       creatorId,
          script:           scriptText,
          script_text:      scriptText,
          scenes:           sceneDescription ? { description: sceneDescription } : null,
          image_url:        imageUrl,
          audio_url:        audioUrl,
          scene_description: sceneDescription || '',
        }),
      });

      setGenerateStatus('Sending to video engine...');

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }

      const job = await res.json();
      setJobId(job.id || job.jobId || job.render_job_id || null);
      setGenerateStatus('done');
    } catch (err) {
      console.error('[CreateAvatar] generate error:', err);
      setGenerateError(err.message || 'Something went wrong. Please try again.');
      setGenerating(false);
      setGenerateStatus('');
    }
  }

  function reset() {
    setStep(1);
    setName('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setAudioFile(null);
    setAudioBlob(null);
    setScriptText('');
    setSceneDescription('');
    setGenerating(false);
    setGenerateStatus('');
    setGenerateError('');
    setJobId(null);
  }

  return (
    <div className="ci-wrapper">
      <div className="ci-card">
        <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.3rem', fontWeight: 800, color: 'rgba(220,220,235,0.95)', textAlign: 'center' }}>
          Create Your Avatar Video
        </h1>

        <StepIndicator current={step} />

        {step === 1 && (
          <StepName name={name} setName={setName} onNext={() => setStep(2)} />
        )}

        {step === 2 && (
          <StepPhoto
            photoFile={photoFile} setPhotoFile={setPhotoFile}
            photoPreview={photoPreview} setPhotoPreview={setPhotoPreview}
            onNext={() => setStep(3)} onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepVoice
            audioFile={audioFile} setAudioFile={setAudioFile}
            audioBlob={audioBlob} setAudioBlob={setAudioBlob}
            onBack={() => setStep(2)} onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <StepScript
            scriptText={scriptText} setScriptText={setScriptText}
            sceneDescription={sceneDescription} setSceneDescription={setSceneDescription}
            onBack={() => setStep(3)} onNext={() => setStep(5)}
          />
        )}

        {step === 5 && (
          <StepGenerate
            name={name}
            photoPreview={photoPreview}
            audioBlob={audioBlob}
            audioFile={audioFile}
            scriptText={scriptText}
            sceneDescription={sceneDescription}
            onBack={() => setStep(4)}
            onGenerate={handleGenerate}
            generating={generating}
            generateStatus={generateStatus}
            generateError={generateError}
            jobId={jobId}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}
