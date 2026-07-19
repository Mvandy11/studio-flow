import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import './createIdentity.css';

const API_BASE = 'https://studio-flow-backend.onrender.com';
const BUCKET   = 'identities';

const STEP_LABELS      = ['Profile', 'Photo', 'Voice', 'Advanced', 'Generate'];
const VOICE_STYLES     = ['Energetic','Calm','Authoritative','Playful','Motivational','Conversational','Dramatic','Friendly'];
const PERSONALITY_TYPES = ['Coach','Entertainer','Teacher','Host','Advisor','Storyteller','Hype Person','Expert'];
const PRIMARY_TOPICS   = ['Fitness','Music','Comedy','Education','Gaming','Lifestyle','Business','Beauty','Food','Sports','Other'];
const ENERGY_LEVELS    = ['High','Medium','Low'];
const SPEAKING_PACES   = ['Fast','Normal','Slow'];

/* ── Shared helpers ──────────────────────────────────────── */
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

function DropdownSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      className="ci-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ marginBottom: 0, cursor: 'pointer' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PillSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
      {options.map(opt => (
        <button
          key={opt} type="button" onClick={() => onChange(opt)}
          style={{
            padding: '0.3rem 0.7rem', borderRadius: '99px', fontSize: '0.78rem',
            fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
            background: value === opt ? 'rgba(110,168,255,0.22)' : 'rgba(255,255,255,0.04)',
            borderColor: value === opt ? 'rgba(110,168,255,0.5)' : 'rgba(255,255,255,0.1)',
            color: value === opt ? 'rgba(180,210,255,0.9)' : 'rgba(200,200,215,0.6)',
          }}
        >{opt}</button>
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
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={addTag} placeholder={tags.length === 0 ? placeholder : ''}
        style={{ border: 'none', background: 'none', outline: 'none', color: 'rgba(200,200,215,0.8)', fontSize: '0.82rem', flexGrow: 1, minWidth: 80 }} />
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

function AccordionSection({ icon, title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', marginBottom: '0.75rem', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.025)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'rgba(220,220,235,0.85)' }}>{title}</p>
          {!open && summary && (
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.38)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{summary}</p>
          )}
        </div>
        <span style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.8rem', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>{children}</div>}
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────────── */
function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 24, zIndex: 9999,
      background: 'rgba(52,199,89,0.92)', color: '#fff',
      padding: '0.65rem 1.1rem', borderRadius: '8px',
      fontSize: '0.88rem', fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(8px)',
      animation: 'ci-toast-in 0.2s ease',
    }}>{message}</div>
  );
}

/* ── Save Draft Modal ────────────────────────────────────── */
function SaveDraftModal({ open, onSave, onCancel, saving }) {
  const [draftName, setDraftName] = useState('');
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8888, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: 360 }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: 'rgba(220,220,235,0.95)' }}>Save Avatar Draft</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'rgba(200,200,215,0.5)' }}>Give this configuration a name. Saving again with the same name will overwrite it.</p>
        <input
          className="ci-input"
          placeholder='e.g. "Flash Fontaine - Aerobics"'
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && draftName.trim() && onSave(draftName.trim())}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="ci-btn ci-btn--primary" disabled={!draftName.trim() || saving} onClick={() => onSave(draftName.trim())} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="ci-btn" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Profile (Name + Required Dropdowns) ─────────── */
function StepProfile({ name, setName, voiceStyle, setVoiceStyle, personalityType, setPersonalityType, primaryTopic, setPrimaryTopic, energyLevel, setEnergyLevel, speakingPace, setSpeakingPace, onNext }) {
  const ready = name.trim() && voiceStyle && personalityType && primaryTopic && energyLevel && speakingPace;
  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Build your avatar profile</h2>
      <p className="ci-hint">These fields define your avatar's core character.</p>

      <label className="ci-label">Avatar Name</label>
      <input className="ci-input" type="text" placeholder='e.g. "Flash Fontaine"' value={name} onChange={e => setName(e.target.value)} autoFocus />

      <FieldRow label="Voice Style">
        <DropdownSelect value={voiceStyle} onChange={setVoiceStyle} options={VOICE_STYLES} placeholder="Choose a voice style…" />
      </FieldRow>
      <FieldRow label="Personality Type">
        <DropdownSelect value={personalityType} onChange={setPersonalityType} options={PERSONALITY_TYPES} placeholder="Choose a personality type…" />
      </FieldRow>
      <FieldRow label="Primary Topic">
        <DropdownSelect value={primaryTopic} onChange={setPrimaryTopic} options={PRIMARY_TOPICS} placeholder="Choose a primary topic…" />
      </FieldRow>
      <FieldRow label="Energy Level">
        <DropdownSelect value={energyLevel} onChange={setEnergyLevel} options={ENERGY_LEVELS} placeholder="Choose energy level…" />
      </FieldRow>
      <FieldRow label="Speaking Pace">
        <DropdownSelect value={speakingPace} onChange={setSpeakingPace} options={SPEAKING_PACES} placeholder="Choose speaking pace…" />
      </FieldRow>

      <button className="ci-btn ci-btn--primary" disabled={!ready} onClick={onNext} style={{ marginTop: '0.5rem' }}>Next: Upload Photo →</button>
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
        <button className="ci-btn ci-btn--primary" disabled={!photoFile} onClick={onNext}>Next: Voice Sample →</button>
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
        <button className="ci-btn ci-btn--primary" disabled={!hasAudio} onClick={onNext}>Next: Advanced Options →</button>
      </div>
    </div>
  );
}

/* ── Step 4: Advanced Options (all optional) ─────────────── */
function StepAdvanced({ scriptText, setScriptText, sceneDescription, setSceneDescription, ep, setEp, lp, setLp, ar, setAr, identityName, onBack, onNext, onSaveDraft, onUpdateSaved, activeSavedName }) {
  function epSet(key, val) { setEp(prev => ({ ...prev, [key]: val })); }
  function lpSet(key, val) { setLp(prev => ({ ...prev, [key]: val })); }
  function arSet(key, val) { setAr(prev => ({ ...prev, [key]: val })); }

  const epSummary = [ep.primaryEmotion, `${ep.intensity} intensity`, ep.valence].join(' · ');
  const lpSummary = [`${lp.reasoningStyle} reasoning`, `${lp.decisionMode} decisions`].join(' · ');
  const arSummary = [ar.role || 'No role set', ar.speechStyle].filter(Boolean).join(' · ');

  return (
    <div className="ci-step-body">
      <h2 className="ci-heading">Advanced Options</h2>
      <p className="ci-hint">All fields here are optional. Leave them blank to use your profile settings.</p>

      {/* Script */}
      <AccordionSection icon="📝" title="Script (optional)" summary={scriptText ? scriptText.slice(0, 60) + '…' : 'No script — avatar will improvise'}>
        <label className="ci-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Script (optional)</label>
        <textarea
          className="ci-input"
          rows={5}
          placeholder="Hey everyone, it's [your name] and today I want to talk about..."
          value={scriptText}
          onChange={e => setScriptText(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
        <p style={{ margin: '0.3rem 0 0.75rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', textAlign: 'right' }}>
          {scriptText.length} / 1000 characters
        </p>
        <label className="ci-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Scene Description (optional)</label>
        <textarea
          className="ci-input"
          rows={2}
          placeholder="Describe the background, lighting, and setting for your video..."
          value={sceneDescription}
          onChange={e => setSceneDescription(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
      </AccordionSection>

      {/* Emotional Physics */}
      <AccordionSection icon="🎭" title="Emotional Physics (optional)" summary={epSummary}>
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
        <FieldRow label="Motivation (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What increases positive valence" value={ep.motivation} onChange={e => epSet('motivation', e.target.value)} />
        </FieldRow>
        <FieldRow label="Stressors (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What increases negative valence" value={ep.stressors} onChange={e => epSet('stressors', e.target.value)} />
        </FieldRow>
        <FieldRow label="Anchors (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What stabilizes emotional state" value={ep.anchors} onChange={e => epSet('anchors', e.target.value)} />
        </FieldRow>
      </AccordionSection>

      {/* Logic Profile */}
      <AccordionSection icon="🧠" title="Logic Profile (optional)" summary={lpSummary}>
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
        <FieldRow label="Priority — Primary (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What this identity prioritizes first" value={lp.priorityPrimary} onChange={e => lpSet('priorityPrimary', e.target.value)} />
        </FieldRow>
        <FieldRow label="Priority — Secondary (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="What this identity considers next" value={lp.prioritySecondary} onChange={e => lpSet('prioritySecondary', e.target.value)} />
        </FieldRow>
        <FieldRow label="Never Do (press Enter to add, optional)">
          <TagInput tags={lp.neverDo} onChange={v => lpSet('neverDo', v)} placeholder="Behaviors this identity must avoid" />
        </FieldRow>
        <FieldRow label="Always Do (press Enter to add, optional)">
          <TagInput tags={lp.alwaysDo} onChange={v => lpSet('alwaysDo', v)} placeholder="Commitments this identity must maintain" />
        </FieldRow>
        <FieldRow label="Social Logic (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the identity behaves around others" value={lp.socialLogic} onChange={e => lpSet('socialLogic', e.target.value)} />
        </FieldRow>
        <FieldRow label="Task Logic (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the identity behaves during tasks" value={lp.taskLogic} onChange={e => lpSet('taskLogic', e.target.value)} />
        </FieldRow>
      </AccordionSection>

      {/* Agent Rules */}
      <AccordionSection icon="📋" title="Agent Rules (optional)" summary={arSummary}>
        <FieldRow label="Role (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="e.g. Fitness coach, Host, Educator" value={ar.role} onChange={e => arSet('role', e.target.value)} />
        </FieldRow>
        <FieldRow label="Backstory (optional)">
          <textarea className="ci-input" rows={3} placeholder="Brief origin story or background..." value={ar.backstory} onChange={e => arSet('backstory', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </FieldRow>
        <FieldRow label="Core Traits (press Enter to add, optional)">
          <TagInput tags={ar.coreTraits} onChange={v => arSet('coreTraits', v)} placeholder="e.g. bold, witty, empathetic" />
        </FieldRow>
        <FieldRow label="Speech Style">
          <PillSelect options={['casual','formal','comedic','dramatic','technical']} value={ar.speechStyle} onChange={v => arSet('speechStyle', v)} />
        </FieldRow>
        <FieldRow label="Tone Rules (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the agent speaks to the user" value={ar.toneRules} onChange={e => arSet('toneRules', e.target.value)} />
        </FieldRow>
        <FieldRow label="Response Rules (optional)">
          <input className="ci-input" style={{ marginBottom: 0 }} placeholder="How the agent structures replies" value={ar.responseRules} onChange={e => arSet('responseRules', e.target.value)} />
        </FieldRow>
        <FieldRow label="Restricted Topics (press Enter to add, optional)">
          <TagInput tags={ar.restrictedTopics} onChange={v => arSet('restrictedTopics', v)} placeholder="Topics to avoid" />
        </FieldRow>
      </AccordionSection>

      {/* Draft save buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', margin: '1.25rem 0 0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="ci-btn" onClick={onSaveDraft} style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}>
          💾 Save Draft
        </button>
        {activeSavedName && (
          <button type="button" className="ci-btn" onClick={onUpdateSaved} style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}>
            🔄 Update Saved
          </button>
        )}
      </div>

      <div className="ci-nav" style={{ marginTop: '0.5rem' }}>
        <button className="ci-btn" onClick={onBack}>← Back</button>
        <button className="ci-btn ci-btn--primary" onClick={onNext}>Next: Preview &amp; Generate →</button>
      </div>
    </div>
  );
}

/* ── Step 5: Generate ────────────────────────────────────── */
function StepGenerate({ name, voiceStyle, personalityType, primaryTopic, energyLevel, speakingPace, photoPreview, audioBlob, audioFile, scriptText, sceneDescription, onBack, onGenerate, generating, generateStatus, generateError, jobId, onReset }) {
  const hasVoice = audioBlob || audioFile;
  const scriptExcerpt = scriptText.length > 80 ? scriptText.slice(0, 80) + '…' : scriptText;

  if (generateStatus === 'done') {
    return (
      <div className="ci-step-body" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>✅</p>
        <h2 className="ci-heading">Your video is generating!</h2>
        <p className="ci-hint"><strong>{name}</strong> is being created. This usually takes 2–5 minutes.</p>
        {jobId && <p style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)', marginTop: '0.5rem' }}>Job ID: {jobId}</p>}
        <div className="ci-nav" style={{ justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <button className="ci-btn ci-btn--primary" onClick={() => { window.location.href = '/my-videos'; }}>Watch in My Videos →</button>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
          {[voiceStyle, personalityType, primaryTopic, energyLevel + ' energy', speakingPace + ' pace'].filter(Boolean).map(tag => (
            <span key={tag} style={{ padding: '0.2rem 0.55rem', borderRadius: '99px', background: 'rgba(110,168,255,0.12)', border: '1px solid rgba(110,168,255,0.2)', fontSize: '0.75rem', color: 'rgba(180,210,255,0.8)' }}>{tag}</span>
          ))}
        </div>
        {scriptText && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
            <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.35)' }}>📝 Script preview</p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)', lineHeight: 1.5 }}>"{scriptExcerpt}"</p>
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
const defaultEp = () => ({ primaryEmotion: 'neutral', intensity: 'medium', valence: 'neutral', arousal: 'calm', stability: 'stable', voice: 'expressive', pace: 'steady', tone: 'warm', bodyLanguage: 'open', motivation: '', stressors: '', anchors: '' });
const defaultLp = () => ({ reasoningStyle: 'creative', decisionMode: 'balanced', riskTolerance: 'medium', confidenceLevel: 'medium', priorityPrimary: '', prioritySecondary: '', priorityTertiary: '', neverDo: [], alwaysDo: [], socialLogic: '', taskLogic: '', emotionalLogic: '' });
const defaultAr = () => ({ role: '', backstory: '', coreTraits: [], speechStyle: 'casual', allowedTopics: [], restrictedTopics: [], behaviorLimits: [], toneRules: '', responseRules: '', continuityRules: '', physicalContinuity: '', voiceContinuity: '', emotionalContinuity: '' });

/* ── Main page ───────────────────────────────────────────── */
export default function CreateIdentityPage() {
  const { user } = useAuth();

  // Required fields
  const [step, setStep]                         = useState(1);
  const [name, setName]                         = useState('');
  const [voiceStyle, setVoiceStyle]             = useState('');
  const [personalityType, setPersonalityType]   = useState('');
  const [primaryTopic, setPrimaryTopic]         = useState('');
  const [energyLevel, setEnergyLevel]           = useState('');
  const [speakingPace, setSpeakingPace]         = useState('');

  // File uploads
  const [photoFile, setPhotoFile]               = useState(null);
  const [photoPreview, setPhotoPreview]         = useState(null);
  const [audioFile, setAudioFile]               = useState(null);
  const [audioBlob, setAudioBlob]               = useState(null);

  // Optional fields
  const [scriptText, setScriptText]             = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [ep, setEp]                             = useState(defaultEp);
  const [lp, setLp]                             = useState(defaultLp);
  const [ar, setAr]                             = useState(defaultAr);

  // Generate state
  const [generating, setGenerating]             = useState(false);
  const [generateStatus, setGenerateStatus]     = useState('');
  const [generateError, setGenerateError]       = useState('');
  const [jobId, setJobId]                       = useState(null);

  // Saved avatars
  const [savedAvatars, setSavedAvatars]         = useState([]);
  const [activeSavedId, setActiveSavedId]       = useState(null);
  const [activeSavedName, setActiveSavedName]   = useState('');
  const [selectedSavedId, setSelectedSavedId]   = useState('');
  const [saveDraftOpen, setSaveDraftOpen]       = useState(false);
  const [draftSaving, setDraftSaving]           = useState(false);

  // Toast
  const [toast, setToast]                       = useState('');
  const toastTimerRef                           = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  }

  // Load saved avatars on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_avatars')
      .select('id, name, config, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setSavedAvatars(data); });
  }, [user]);

  // Build config snapshot for saving
  function buildConfig() {
    return { name, voiceStyle, personalityType, primaryTopic, energyLevel, speakingPace, scriptText, sceneDescription, ep, lp, ar };
  }

  // Apply a loaded config to state
  function applyConfig(cfg) {
    if (!cfg) return;
    if (cfg.name           !== undefined) setName(cfg.name);
    if (cfg.voiceStyle     !== undefined) setVoiceStyle(cfg.voiceStyle);
    if (cfg.personalityType !== undefined) setPersonalityType(cfg.personalityType);
    if (cfg.primaryTopic   !== undefined) setPrimaryTopic(cfg.primaryTopic);
    if (cfg.energyLevel    !== undefined) setEnergyLevel(cfg.energyLevel);
    if (cfg.speakingPace   !== undefined) setSpeakingPace(cfg.speakingPace);
    if (cfg.scriptText     !== undefined) setScriptText(cfg.scriptText);
    if (cfg.sceneDescription !== undefined) setSceneDescription(cfg.sceneDescription);
    if (cfg.ep) setEp(cfg.ep);
    if (cfg.lp) setLp(cfg.lp);
    if (cfg.ar) setAr(cfg.ar);
  }

  function handleLoadSaved() {
    if (!selectedSavedId) return;
    const found = savedAvatars.find(a => a.id === selectedSavedId);
    if (!found) return;
    applyConfig(found.config);
    setActiveSavedId(found.id);
    setActiveSavedName(found.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Loaded: ${found.name} ✓`);
  }

  function handleClearSaved() {
    setActiveSavedId(null);
    setActiveSavedName('');
    setSelectedSavedId('');
  }

  async function handleSaveDraft(draftName) {
    if (!user) return;
    setDraftSaving(true);
    try {
      const config = buildConfig();
      // Upsert: if same user + same name exists, overwrite it
      const existing = savedAvatars.find(a => a.name === draftName);
      let result;
      if (existing) {
        result = await supabase.from('saved_avatars').update({ config, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      } else {
        result = await supabase.from('saved_avatars').insert({ user_id: user.id, name: draftName, config }).select().single();
      }
      if (result.error) throw result.error;
      const saved = result.data;
      setSavedAvatars(prev => {
        const filtered = prev.filter(a => a.id !== saved.id);
        return [saved, ...filtered];
      });
      setActiveSavedId(saved.id);
      setActiveSavedName(saved.name);
      setSaveDraftOpen(false);
      showToast('Avatar saved ✓');
    } catch (err) {
      console.error('Save draft error:', err);
      showToast('Save failed — please try again');
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleUpdateSaved() {
    if (!user || !activeSavedId) return;
    try {
      const config = buildConfig();
      const { error } = await supabase.from('saved_avatars').update({ config, updated_at: new Date().toISOString() }).eq('id', activeSavedId);
      if (error) throw error;
      setSavedAvatars(prev => prev.map(a => a.id === activeSavedId ? { ...a, config } : a));
      showToast('Avatar updated ✓');
    } catch (err) {
      console.error('Update saved error:', err);
      showToast('Update failed — please try again');
    }
  }

  // Build identity engine schemas for the API payload
  function buildSchemas() {
    const emotionalPhysics = {
      emotional_state: {
        primary_emotion: ep.primaryEmotion, intensity: ep.intensity, valence: ep.valence, arousal: ep.arousal, stability: ep.stability,
        expression_modifiers: { voice: ep.voice, pace: ep.pace, tone: ep.tone, body_language: ep.bodyLanguage },
        contextual_triggers: { motivation: ep.motivation, stressors: ep.stressors, anchors: ep.anchors },
      },
    };
    const logicProfile = {
      logic_profile: {
        reasoning_style: lp.reasoningStyle, decision_mode: lp.decisionMode, risk_tolerance: lp.riskTolerance, confidence_level: lp.confidenceLevel,
        priority_stack: { primary: lp.priorityPrimary, secondary: lp.prioritySecondary, tertiary: lp.priorityTertiary },
        consistency_rules: { never_do: lp.neverDo, always_do: lp.alwaysDo },
        contextual_logic: { social_logic: lp.socialLogic, task_logic: lp.taskLogic, emotional_logic: lp.emotionalLogic },
      },
    };
    const agentRules = {
      agent_rules: {
        persona: { name, role: ar.role, backstory: ar.backstory, core_traits: ar.coreTraits, speech_style: ar.speechStyle },
        profile: { voice_style: voiceStyle, personality_type: personalityType, primary_topic: primaryTopic, energy_level: energyLevel, speaking_pace: speakingPace },
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

      setGenerateStatus('Saving your identity…');

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
          script:            scriptText            || null,
          scene_description: sceneDescription      || null,
          emotional_physics: emotionalPhysics,
          logic_profile:     logicProfile,
          agent_rules:       agentRules,
        })
        .select()
        .single();
      if (identityErr) throw new Error(`Identity save failed: ${identityErr.message}`);

      setGenerateStatus('Submitting your video for generation…');

      const res = await fetch(`${API_BASE}/api/render-jobs`, {
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
          voice_style:       voiceStyle,
          personality_type:  personalityType,
          primary_topic:     primaryTopic,
          energy_level:      energyLevel,
          speaking_pace:     speakingPace,
          emotional_physics: emotionalPhysics,
          logic_profile:     logicProfile,
          agent_rules:       agentRules,
        }),
      });

      setGenerateStatus('Sending to video engine…');

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }

      window.location.href = '/my-videos';
    } catch (err) {
      console.error('[CreateAvatar] generate error:', err);
      setGenerateError(err.message || 'Something went wrong. Please try again.');
      setGenerating(false);
      setGenerateStatus('');
    }
  }

  function reset() {
    setStep(1);
    setName(''); setVoiceStyle(''); setPersonalityType(''); setPrimaryTopic(''); setEnergyLevel(''); setSpeakingPace('');
    setPhotoFile(null); setPhotoPreview(null);
    setAudioFile(null); setAudioBlob(null);
    setScriptText(''); setSceneDescription('');
    setEp(defaultEp()); setLp(defaultLp()); setAr(defaultAr());
    setGenerating(false); setGenerateStatus(''); setGenerateError(''); setJobId(null);
    setActiveSavedId(null); setActiveSavedName(''); setSelectedSavedId('');
  }

  return (
    <div className="ci-wrapper">
      <Toast message={toast} />
      <SaveDraftModal
        open={saveDraftOpen}
        onSave={handleSaveDraft}
        onCancel={() => setSaveDraftOpen(false)}
        saving={draftSaving}
      />

      <div className="ci-card">
        <h1 style={{ margin: '0 0 1rem', fontSize: '1.3rem', fontWeight: 800, color: 'rgba(220,220,235,0.95)', textAlign: 'center' }}>
          Create Your Avatar Video
        </h1>

        {/* ── Saved Avatars selector ── */}
        {savedAvatars.length > 0 && (
          <div style={{ marginBottom: '1.1rem', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.4)' }}>My Saved Avatars</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="ci-input"
                value={selectedSavedId}
                onChange={e => setSelectedSavedId(e.target.value)}
                style={{ flex: 1, minWidth: 160, marginBottom: 0 }}
              >
                <option value="">Choose a saved avatar…</option>
                {savedAvatars.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button
                className="ci-btn ci-btn--primary"
                disabled={!selectedSavedId}
                onClick={handleLoadSaved}
                style={{ flexShrink: 0, fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
              >
                Load
              </button>
            </div>
          </div>
        )}

        {/* ── Active saved badge ── */}
        {activeSavedName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.45rem 0.75rem', background: 'rgba(110,168,255,0.1)', border: '1px solid rgba(110,168,255,0.25)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(180,210,255,0.85)', flex: 1 }}>📂 Loaded: <strong>{activeSavedName}</strong></span>
            <button type="button" onClick={handleClearSaved} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(180,210,255,0.5)', fontSize: '1rem', lineHeight: 1, padding: 0 }}>✕</button>
          </div>
        )}

        <StepIndicator current={step} />

        {step === 1 && (
          <StepProfile
            name={name} setName={setName}
            voiceStyle={voiceStyle} setVoiceStyle={setVoiceStyle}
            personalityType={personalityType} setPersonalityType={setPersonalityType}
            primaryTopic={primaryTopic} setPrimaryTopic={setPrimaryTopic}
            energyLevel={energyLevel} setEnergyLevel={setEnergyLevel}
            speakingPace={speakingPace} setSpeakingPace={setSpeakingPace}
            onNext={() => setStep(2)}
          />
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
          <StepAdvanced
            scriptText={scriptText} setScriptText={setScriptText}
            sceneDescription={sceneDescription} setSceneDescription={setSceneDescription}
            ep={ep} setEp={setEp}
            lp={lp} setLp={setLp}
            ar={ar} setAr={setAr}
            identityName={name}
            onBack={() => setStep(3)} onNext={() => setStep(5)}
            onSaveDraft={() => setSaveDraftOpen(true)}
            onUpdateSaved={handleUpdateSaved}
            activeSavedName={activeSavedName}
          />
        )}

        {step === 5 && (
          <StepGenerate
            name={name}
            voiceStyle={voiceStyle} personalityType={personalityType}
            primaryTopic={primaryTopic} energyLevel={energyLevel} speakingPace={speakingPace}
            photoPreview={photoPreview}
            audioBlob={audioBlob} audioFile={audioFile}
            scriptText={scriptText} sceneDescription={sceneDescription}
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
