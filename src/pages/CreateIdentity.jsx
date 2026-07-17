import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../lib/apiBase';
import './createIdentity.css';

const BUCKET = 'identities';
const STEP_LABELS = ['Name', 'Photo', 'Voice', 'Identity', 'Script', 'Generate'];

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

/* ── Shared sub-components ───────────────────────────────── */
function PillSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: '0.3rem 0.7rem', borderRadius: '99px', fontSize: '0.78rem',
            fontWeight: 500, cursor: 'pointer', border: '1px solid',
            transition: 'all 0.15s',
            background: value === opt ? 'rgba(110,168,255,0.22)' : 'rgba(255,255,255,0.04)',
            borderColor: value === opt ? 'rgba(110,168,255,0.5)' : 'rgba(255,255,255,0.1)',
            color: value === opt ? 'rgba(180,210,255,0.9)' : 'rgba(200,200,215,0.6)',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('');

  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) onChange([...tags, input.trim()]);
      setInput('');
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', minHeight: 42 }}>
      {tags.map(tag => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '99px', background: 'rgba(110,168,255,0.15)', border: '1px solid rgba(110,168,255,0.25)', fontSize: '0.78rem', color: 'rgba(180,210,255,0.85)' }}>
          {tag}
          <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(180,210,255,0.5)', fontSize: '0.9rem', lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={addTag}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{ border: 'none', background: 'none', outline: 'none', color: 'rgba(200,200,215,0.8)', fontSize: '0.82rem', flexGrow: 1, minWidth: 80 }}
      />
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <p style={{ margin: '0 0 0.3rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.4)' }}>{label}</p>
      {children}
    </div>
  );
}

function AccordionSection({ icon, title, summary, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', marginBottom: '0.75rem', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.025)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'rgba(220,220,235,0.85)' }}>{title}</p>
          {!open && summary && (
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.38)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{summary}</p>
          )}
        </div>
        <span style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.8rem', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {children}
        </div>
      )}
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
      <button className="ci-btn ci-btn--primary" disabled={!name.trim()} onClick={onNext}>Next →</button>
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
        {photoPreview ? <img src={photoPreview} alt="preview" className="ci-photo-preview" /> : <div className="ci-photo-placeholder">📷</div>}
      </div>
      <label className="ci-file-label">
        {photoPreview ? 'Change photo' : 'Choose photo'}
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </label>
      <p className="ci-requirements">Face clearly visible · Good lighting · No sunglasses</p>
      <div className="ci-nav">
        <button className="ci-btn" onClick={onBack}>← Back</button>
        <button className="ci-btn ci-btn--primary" disabled={!photoFile} onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}

/* ── Step 3: Voice ───────────────────────────────────────── */
function StepVoice({ audioFile, setAudioFile, audioBlob, setAudioBlob, onBack, onNext }) {
  const [recording, setRecording]             = useState(false);
  const [elapsed, setElapsed]                 = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [recError, setRecError]               = useState('');
  const mediaRecRef = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);

  async function startRecording() {
    setRecError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setElapsed(0); setAudioPreviewUrl(null); setAudioBlob(null);
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob); setAudioFile(null);
        setAudioPreviewUrl(URL.createObjectURL(blob));
      };
      mediaRecRef.current = rec;
      rec.start(); setRecording(true);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch { setRecError('Microphone access denied. Please allow microphone and try again.'); }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current.stop();
    setRecording(false);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file); setAudioBlob(null);
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
            <><p className="ci-timer">{mm}:{ss}</p><button className="ci-btn ci-btn--danger" onClick={stopRecording}>Stop</button></>
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
        <button className="ci-btn ci-btn--primary" disabled={!hasAudio} onClick={onNext}>Next: Identity Engine →</button>
      </div>
    </div>
  );
}

/* ── Step 4: Identity Engine ─────────────────────────────── */
function StepIdentityEngine({ ep, setEp, lp, setLp, ar, setAr, identityName, onBack, onNext }) {
  const epSummary = [ep.primaryEmotion, `${ep.intensity} intensity`, ep.valence, ep.arousal, ep.stability].join(' · ');
  const lpSummary = [`${lp.reasoningStyle} reasoning`, `${lp.decisionMode} decisions`, `${lp.riskTolerance} risk`].join(' · ');
  const arSummary = [ar.role || 'No role set', ar.speechStyle, ar.coreTraits.slice(0, 3).join(', ')].filter(Boolean).join(' · ');

  function epSet(key, val) { setEp(prev => ({ ...prev, [key]: val })); }
  function lpSet(key, val) { setLp(prev => ({ ...prev, [key]: val })); }
  function arSet(key, val) { setAr(prev => ({ ...prev, [key]: val })); }

  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">⚡ Configure Your Identity Engine</h2>
      <p className="ci-hint">Define how your avatar thinks, feels, and behaves. All sections are optional.</p>

      {/* ── Emotional Physics ── */}
      <AccordionSection icon="🎭" title="Emotional Physics — How your avatar feels" summary={epSummary}>
        <FieldRow label="Primary Emotion">
          <PillSelect options={['neutral','confident','excited','anxious','angry','joyful','focused']} value={ep.primaryEmotion} onChange={v => epSet('primaryEmotion', v)} />
        </FieldRow>
        <FieldRow label="Intensity">
          <PillSelect options={['low','medium','high']} value={ep.intensity} onChange={v => epSet('intensity', v)} />
        </FieldRow>
        <FieldRow label="Valence">
          <PillSelect options={['positive','negative','neutral']} value={ep.valence} onChange={v => epSet('valence', v)} />
        </FieldRow>
        <FieldRow label="Arousal">
          <PillSelect options={['calm','activated','hyper']} value={ep.arousal} onChange={v => epSet('arousal', v)} />
        </FieldRow>
        <FieldRow label="Stability">
          <PillSelect options={['stable','shifting','volatile']} value={ep.stability} onChange={v => epSet('stability', v)} />
        </FieldRow>
        <FieldRow label="Voice">
          <PillSelect options={['soft','firm','energetic','monotone','expressive']} value={ep.voice} onChange={v => epSet('voice', v)} />
        </FieldRow>
        <FieldRow label="Pace">
          <PillSelect options={['slow','steady','fast']} value={ep.pace} onChange={v => epSet('pace', v)} />
        </FieldRow>
        <FieldRow label="Tone">
          <PillSelect options={['warm','cold','sharp','playful','serious']} value={ep.tone} onChange={v => epSet('tone', v)} />
        </FieldRow>
        <FieldRow label="Body Language">
          <PillSelect options={['open','closed','animated','restrained']} value={ep.bodyLanguage} onChange={v => epSet('bodyLanguage', v)} />
        </FieldRow>
        <FieldRow label="Motivation">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What increases positive valence" value={ep.motivation} onChange={e => epSet('motivation', e.target.value)} />
        </FieldRow>
        <FieldRow label="Stressors">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What increases negative valence" value={ep.stressors} onChange={e => epSet('stressors', e.target.value)} />
        </FieldRow>
        <FieldRow label="Anchors">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What stabilizes emotional state" value={ep.anchors} onChange={e => epSet('anchors', e.target.value)} />
        </FieldRow>
      </AccordionSection>

      {/* ── Logic Profile ── */}
      <AccordionSection icon="🧠" title="Logic Profile — How your avatar thinks" summary={lpSummary}>
        <FieldRow label="Reasoning Style">
          <PillSelect options={['analytical','intuitive','creative','procedural','emotional']} value={lp.reasoningStyle} onChange={v => lpSet('reasoningStyle', v)} />
        </FieldRow>
        <FieldRow label="Decision Mode">
          <PillSelect options={['fast','deliberate','balanced']} value={lp.decisionMode} onChange={v => lpSet('decisionMode', v)} />
        </FieldRow>
        <FieldRow label="Risk Tolerance">
          <PillSelect options={['low','medium','high']} value={lp.riskTolerance} onChange={v => lpSet('riskTolerance', v)} />
        </FieldRow>
        <FieldRow label="Confidence Level">
          <PillSelect options={['low','medium','high']} value={lp.confidenceLevel} onChange={v => lpSet('confidenceLevel', v)} />
        </FieldRow>
        <FieldRow label="Priority — Primary">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What this identity prioritizes first" value={lp.priorityPrimary} onChange={e => lpSet('priorityPrimary', e.target.value)} />
        </FieldRow>
        <FieldRow label="Priority — Secondary">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What this identity considers next" value={lp.prioritySecondary} onChange={e => lpSet('prioritySecondary', e.target.value)} />
        </FieldRow>
        <FieldRow label="Priority — Tertiary">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What this identity considers last" value={lp.priorityTertiary} onChange={e => lpSet('priorityTertiary', e.target.value)} />
        </FieldRow>
        <FieldRow label="Never Do (press Enter to add)">
          <TagInput tags={lp.neverDo} onChange={v => lpSet('neverDo', v)} placeholder="Behaviors this identity must avoid" />
        </FieldRow>
        <FieldRow label="Always Do (press Enter to add)">
          <TagInput tags={lp.alwaysDo} onChange={v => lpSet('alwaysDo', v)} placeholder="Commitments this identity must maintain" />
        </FieldRow>
        <FieldRow label="Social Logic">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the identity behaves around others" value={lp.socialLogic} onChange={e => lpSet('socialLogic', e.target.value)} />
        </FieldRow>
        <FieldRow label="Task Logic">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the identity behaves during tasks" value={lp.taskLogic} onChange={e => lpSet('taskLogic', e.target.value)} />
        </FieldRow>
        <FieldRow label="Emotional Logic">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How emotions influence decisions" value={lp.emotionalLogic} onChange={e => lpSet('emotionalLogic', e.target.value)} />
        </FieldRow>
      </AccordionSection>

      {/* ── Agent Rules ── */}
      <AccordionSection icon="📋" title="Agent Rules — How your avatar behaves" summary={arSummary}>
        <FieldRow label="Name">
          <input className="ci-input" style={{ marginBottom: 0, opacity: 0.6, cursor: 'default' }} value={identityName} readOnly />
        </FieldRow>
        <FieldRow label="Role">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="e.g. Fitness coach, Host, Educator" value={ar.role} onChange={e => arSet('role', e.target.value)} />
        </FieldRow>
        <FieldRow label="Backstory">
          <textarea className="ci-input" rows={3} placeholder="Brief origin story or background..." value={ar.backstory} onChange={e => arSet('backstory', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </FieldRow>
        <FieldRow label="Core Traits (press Enter to add)">
          <TagInput tags={ar.coreTraits} onChange={v => arSet('coreTraits', v)} placeholder="e.g. bold, witty, empathetic" />
        </FieldRow>
        <FieldRow label="Speech Style">
          <PillSelect options={['casual','formal','comedic','dramatic','technical']} value={ar.speechStyle} onChange={v => arSet('speechStyle', v)} />
        </FieldRow>
        <FieldRow label="Allowed Topics (press Enter to add)">
          <TagInput tags={ar.allowedTopics} onChange={v => arSet('allowedTopics', v)} placeholder="Topics this avatar can discuss" />
        </FieldRow>
        <FieldRow label="Restricted Topics (press Enter to add)">
          <TagInput tags={ar.restrictedTopics} onChange={v => arSet('restrictedTopics', v)} placeholder="Topics to avoid" />
        </FieldRow>
        <FieldRow label="Behavior Limits (press Enter to add)">
          <TagInput tags={ar.behaviorLimits} onChange={v => arSet('behaviorLimits', v)} placeholder="Actions or tones not allowed" />
        </FieldRow>
        <FieldRow label="Tone Rules">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the agent speaks to the user" value={ar.toneRules} onChange={e => arSet('toneRules', e.target.value)} />
        </FieldRow>
        <FieldRow label="Response Rules">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the agent structures replies" value={ar.responseRules} onChange={e => arSet('responseRules', e.target.value)} />
        </FieldRow>
        <FieldRow label="Continuity Rules">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the agent maintains persona consistency" value={ar.continuityRules} onChange={e => arSet('continuityRules', e.target.value)} />
        </FieldRow>
        <FieldRow label="Physical Continuity">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the identity should appear or move" value={ar.physicalContinuity} onChange={e => arSet('physicalContinuity', e.target.value)} />
        </FieldRow>
        <FieldRow label="Voice Continuity">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the identity should sound" value={ar.voiceContinuity} onChange={e => arSet('voiceContinuity', e.target.value)} />
        </FieldRow>
        <FieldRow label="Emotional Continuity">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the identity should feel" value={ar.emotionalContinuity} onChange={e => arSet('emotionalContinuity', e.target.value)} />
        </FieldRow>
      </AccordionSection>

      <div className="ci-nav">
        <button className="ci-btn" onClick={onBack}>← Back</button>
        <button className="ci-btn ci-btn--primary" onClick={onNext}>Next: Write Script →</button>
      </div>
    </div>
  );
}

/* ── Step 5: Script ──────────────────────────────────────── */
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
      <button
        type="button"
        onClick={() => setSceneOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,200,215,0.55)', fontSize: '0.85rem', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: sceneOpen ? '0.6rem' : '1.25rem' }}
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
        <button className="ci-btn ci-btn--primary" disabled={!scriptText.trim()} onClick={onNext}>Next: Preview &amp; Generate →</button>
      </div>
    </div>
  );
}

/* ── Step 6: Generate ────────────────────────────────────── */
function StepGenerate({ name, photoPreview, audioBlob, audioFile, scriptText, sceneDescription, onBack, onGenerate, generating, generateStatus, generateError, jobId, onReset }) {
  const navigate  = useNavigate();
  const hasVoice  = audioBlob || audioFile;
  const scriptExcerpt = scriptText.length > 100 ? scriptText.slice(0, 100) + '...' : scriptText;
  const sceneExcerpt  = sceneDescription?.length > 60 ? sceneDescription.slice(0, 60) + '...' : sceneDescription;

  if (generateStatus === 'done') {
    return (
      <div className="ci-step-body" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>✅</p>
        <h2 className="ci-heading">Your video is generating!</h2>
        <p className="ci-hint"><strong>{name}</strong> is being created. This usually takes 2–5 minutes.</p>
        {jobId && <p style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)', marginTop: '0.5rem' }}>Job ID: {jobId}</p>}
        <div className="ci-nav" style={{ justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <button className="ci-btn ci-btn--primary" onClick={() => navigate('/my-videos')}>Watch in My Videos →</button>
          <button className="ci-btn" onClick={onReset}>Create Another Avatar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Ready to generate!</h2>
      <p className="ci-hint">Review your avatar details then hit generate.</p>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem 1.1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {photoPreview ? (
            <img src={photoPreview} alt={name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(110,168,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🎭</div>
          )}
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'rgba(220,220,235,0.9)' }}>{name}</p>
            {hasVoice && <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(134,239,172,0.75)' }}>✅ Voice sample ready</p>}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
          <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.35)' }}>📝 Script preview</p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)', lineHeight: 1.5 }}>"{scriptExcerpt}"</p>
        </div>
        {sceneExcerpt && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
            <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.35)' }}>🎬 Scene</p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)', lineHeight: 1.5 }}>{sceneExcerpt}</p>
          </div>
        )}
      </div>

      {generateError && <div className="ci-error" style={{ marginBottom: '1rem' }}>Something went wrong: {generateError}</div>}

      {generating && generateStatus && (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(200,200,215,0.55)', marginBottom: '0.75rem' }}>
          <span className="ci-spinner" /> {generateStatus}
        </p>
      )}

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

/* ── Default state factories ─────────────────────────────── */
const defaultEp = () => ({
  primaryEmotion: 'neutral', intensity: 'medium', valence: 'neutral',
  arousal: 'calm', stability: 'stable',
  voice: 'expressive', pace: 'steady', tone: 'warm', bodyLanguage: 'open',
  motivation: '', stressors: '', anchors: '',
});

const defaultLp = () => ({
  reasoningStyle: 'creative', decisionMode: 'balanced',
  riskTolerance: 'medium', confidenceLevel: 'medium',
  priorityPrimary: '', prioritySecondary: '', priorityTertiary: '',
  neverDo: [], alwaysDo: [],
  socialLogic: '', taskLogic: '', emotionalLogic: '',
});

const defaultAr = () => ({
  role: '', backstory: '', coreTraits: [], speechStyle: 'casual',
  allowedTopics: [], restrictedTopics: [], behaviorLimits: [],
  toneRules: '', responseRules: '', continuityRules: '',
  physicalContinuity: '', voiceContinuity: '', emotionalContinuity: '',
});

/* ── Main page ───────────────────────────────────────────── */
export default function CreateIdentityPage() {
  const { user } = useAuth();

  const [step, setStep]                       = useState(1);
  const [name, setName]                       = useState('');
  const [photoFile, setPhotoFile]             = useState(null);
  const [photoPreview, setPhotoPreview]       = useState(null);
  const [audioFile, setAudioFile]             = useState(null);
  const [audioBlob, setAudioBlob]             = useState(null);
  const [scriptText, setScriptText]           = useState('');
  const [sceneDescription, setSceneDescription] = useState('');

  // Identity Engine state
  const [ep, setEp] = useState(defaultEp);
  const [lp, setLp] = useState(defaultLp);
  const [ar, setAr] = useState(defaultAr);

  const [generating, setGenerating]           = useState(false);
  const [generateStatus, setGenerateStatus]   = useState('');
  const [generateError, setGenerateError]     = useState('');
  const [jobId, setJobId]                     = useState(null);

  // ── Build schemas from current state ─────────────────────────────────────────
  function buildSchemas() {
    const emotionalPhysics = {
      emotional_state: {
        primary_emotion: ep.primaryEmotion,
        intensity: ep.intensity,
        valence: ep.valence,
        arousal: ep.arousal,
        stability: ep.stability,
        expression_modifiers: { voice: ep.voice, pace: ep.pace, tone: ep.tone, body_language: ep.bodyLanguage },
        contextual_triggers: { motivation: ep.motivation, stressors: ep.stressors, anchors: ep.anchors },
      },
    };

    const logicProfile = {
      logic_profile: {
        reasoning_style: lp.reasoningStyle,
        decision_mode: lp.decisionMode,
        risk_tolerance: lp.riskTolerance,
        confidence_level: lp.confidenceLevel,
        priority_stack: { primary: lp.priorityPrimary, secondary: lp.prioritySecondary, tertiary: lp.priorityTertiary },
        consistency_rules: { never_do: lp.neverDo, always_do: lp.alwaysDo },
        contextual_logic: { social_logic: lp.socialLogic, task_logic: lp.taskLogic, emotional_logic: lp.emotionalLogic },
      },
    };

    const agentRules = {
      agent_rules: {
        persona: { name, role: ar.role, backstory: ar.backstory, core_traits: ar.coreTraits, speech_style: ar.speechStyle },
        boundaries: { allowed_topics: ar.allowedTopics, restricted_topics: ar.restrictedTopics, behavior_limits: ar.behaviorLimits },
        interaction_rules: { tone_rules: ar.toneRules, response_rules: ar.responseRules, continuity_rules: ar.continuityRules },
        identity_constraints: { physical_continuity: ar.physicalContinuity, voice_continuity: ar.voiceContinuity, emotional_continuity: ar.emotionalContinuity },
      },
    };

    return { emotionalPhysics, logicProfile, agentRules };
  }

  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);
    setGenerateError('');

    try {
      const creatorId = user.id;
      const ts = Date.now();
      const { emotionalPhysics, logicProfile, agentRules } = buildSchemas();

      // ── Step A: Upload files ──────────────────────────────────────────────────
      setGenerateStatus('Saving your identity...');

      const photoPath = `selfies/${creatorId}/${ts}-${photoFile.name}`;
      const { error: photoErr } = await supabase.storage.from(BUCKET).upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false });
      if (photoErr) throw new Error(`Photo upload failed: ${photoErr.message}`);
      const { data: { publicUrl: imageUrl } } = supabase.storage.from(BUCKET).getPublicUrl(photoPath);

      const audioSource = audioBlob || audioFile;
      const audioName   = audioFile?.name || 'recording.webm';
      const audioType   = audioBlob ? 'audio/webm' : audioFile.type;
      const audioPath   = `voices/${creatorId}/${ts}-${audioName}`;
      const { error: audioErr } = await supabase.storage.from(BUCKET).upload(audioPath, audioSource, { contentType: audioType, upsert: false });
      if (audioErr) throw new Error(`Audio upload failed: ${audioErr.message}`);
      const { data: { publicUrl: audioUrl } } = supabase.storage.from(BUCKET).getPublicUrl(audioPath);

      // ── Insert identity (with all three schemas) ──────────────────────────────
      const { data: identity, error: identityErr } = await supabase
        .from('identities')
        .insert({
          creator_id:        creatorId,
          profile_id:        creatorId,
          tenant_id:         creatorId,
          name:              name.trim(),
          selfie_url:        imageUrl,
          image_url:         imageUrl,
          voice_url:         audioUrl,
          audio_url:         audioUrl,
          status:            'active',
          emotional_physics: emotionalPhysics,
          logic_profile:     logicProfile,
          agent_rules:       agentRules,
        })
        .select()
        .single();
      if (identityErr) throw new Error(`Identity save failed: ${identityErr.message}`);

      // ── Step B+C: Create render job + fire webhook ────────────────────────────
      setGenerateStatus('Submitting your video for generation...');

      const res = await fetch(`${API_BASE}/render-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_id:       identity.id,
          creator_id:        creatorId,
          script:            scriptText,
          script_text:       scriptText,
          scenes:            sceneDescription ? { description: sceneDescription } : null,
          image_url:         imageUrl,
          audio_url:         audioUrl,
          scene_description: sceneDescription || '',
          emotional_physics: emotionalPhysics,
          logic_profile:     logicProfile,
          agent_rules:       agentRules,
        }),
      });

      setGenerateStatus('Sending to video engine...');

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }

      // Success — redirect to My Videos with a toast message
      navigate('/my-videos', {
        state: { toast: `${name} is being generated! Check back in 2–5 minutes.` },
      });
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
    setEp(defaultEp());
    setLp(defaultLp());
    setAr(defaultAr());
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

        {step === 1 && <StepName name={name} setName={setName} onNext={() => setStep(2)} />}

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
          <StepIdentityEngine
            ep={ep} setEp={setEp}
            lp={lp} setLp={setLp}
            ar={ar} setAr={setAr}
            identityName={name}
            onBack={() => setStep(3)} onNext={() => setStep(5)}
          />
        )}

        {step === 5 && (
          <StepScript
            scriptText={scriptText} setScriptText={setScriptText}
            sceneDescription={sceneDescription} setSceneDescription={setSceneDescription}
            onBack={() => setStep(4)} onNext={() => setStep(6)}
          />
        )}

        {step === 6 && (
          <StepGenerate
            name={name}
            photoPreview={photoPreview}
            audioBlob={audioBlob}
            audioFile={audioFile}
            scriptText={scriptText}
            sceneDescription={sceneDescription}
            onBack={() => setStep(5)}
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
