import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useRenderJobStatus } from '../hooks/useRenderJobStatus';
import "./videoGenerator.css";

// ─────────────────────────────────────────────
// Status panel — shown after a successful submit
// ─────────────────────────────────────────────
function StatusPanel({ renderJobId, onReset }) {
  const { status, video_url, error_message, loading } = useRenderJobStatus(renderJobId);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="vg-status-panel">
        <div className="vg-spinner" />
        <p className="vg-status-text">🎬 Your video is being generated...</p>
        <p className="vg-status-sub">This usually takes 2–5 minutes. We'll update this page automatically.</p>
        <p className="vg-job-ref">Job: {renderJobId}</p>
      </div>
    );
  }

  if (status === "completed" && video_url) {
    return (
      <div className="vg-status-panel vg-status-panel--done">
        <p className="vg-status-text">✅ Your video is ready!</p>
        <video
          src={video_url}
          controls
          autoPlay
          playsInline
          style={{ width: "100%", borderRadius: "12px", marginTop: "16px" }}
        />
        <div className="vg-status-actions">
          <a
            href={video_url}
            download
            className="vg-btn vg-btn--primary"
          >
            Download
          </a>
          <button
            className="vg-btn"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ url: video_url, title: "My Studio Flow video" }).catch(() => {});
              } else {
                navigator.clipboard.writeText(video_url);
              }
            }}
          >
            Share
          </button>
          <button
            className="vg-btn"
            onClick={() => navigate("/my-videos")}
          >
            Go to My Videos →
          </button>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="vg-status-panel vg-status-panel--error">
        <p className="vg-status-text">❌ Something went wrong during rendering. Please try again.</p>
        {error_message && <p className="vg-job-ref">{error_message}</p>}
        <button className="vg-btn vg-btn--primary" onClick={onReset}>
          Try Again
        </button>
      </div>
    );
  }

  // pending | processing | any in-progress status
  return (
    <div className="vg-status-panel">
      <div className="vg-spinner" />
      <p className="vg-status-text">🎬 Your video is being generated...</p>
      <p className="vg-status-sub">This usually takes 2–5 minutes. We'll update this page automatically.</p>
      <p className="vg-job-ref">Job: {renderJobId}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function VideoGenerator() {
  const { user } = useAuth();

  const [identities, setIdentities]           = useState([]);
  const [identitiesLoaded, setIdentitiesLoaded] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [scenes, setScenes]                   = useState([{ id: 1, prompt: "", description: "" }]);
  const [submitting, setSubmitting]           = useState(false);
  const [renderJobId, setRenderJobId]         = useState(null);
  const [formError, setFormError]             = useState(null);
  const [scriptError, setScriptError]         = useState(null);
  const [identityError, setIdentityError]     = useState(null);

  // ── Load identities ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function fetchIdentities() {
      try {
        const data = await api(`/identity/list?creator_id=${user.id}`);
        setIdentities(data.identities || []);
      } catch (err) {
        console.error("Failed to load identities", err);
        setIdentities([]);
      } finally {
        setIdentitiesLoaded(true);
      }
    }
    fetchIdentities();
  }, [user]);

  // ── Scene helpers ────────────────────────────────────────────────────────
  function addScene() {
    setScenes(prev => [...prev, { id: prev.length + 1, prompt: "", description: "" }]);
  }

  function updateScene(id, value) {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, prompt: value } : s));
  }

  function updateSceneDescription(id, value) {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, description: value } : s));
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleGenerate() {
    // Validate
    let valid = true;
    if (!selectedIdentity) { setIdentityError("Please select an identity."); valid = false; }
    else setIdentityError(null);

    const combinedScript = scenes.map(s => s.prompt).filter(Boolean).join(" ").trim();
    if (!combinedScript) { setScriptError("Please write your script before generating."); valid = false; }
    else setScriptError(null);

    if (!valid) return;

    setFormError(null);
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expired. Please refresh.");

      const data = await api("/render-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          identity_id: selectedIdentity.id,
          script: combinedScript,
          scenes: scenes.map(s => s.description).filter(Boolean)
        })
      });

      setRenderJobId(data.render_job_id);
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
      console.error("Generate error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Reset after failure ──────────────────────────────────────────────────
  function handleReset() {
    setRenderJobId(null);
    setFormError(null);
    setScriptError(null);
    setIdentityError(null);
  }

  // ── If we have a job ID, show the status panel ───────────────────────────
  if (renderJobId) {
    return (
      <div className="vg-wrapper">
        <div className="vg-card">
          <h2 className="vg-title">Create Your Video</h2>
          <StatusPanel renderJobId={renderJobId} onReset={handleReset} />
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="vg-wrapper">
      <div className="vg-card">

        <h2 className="vg-title">Create Your Video</h2>
        <p className="vg-subtitle">
          Write your message. Our AI will render it with your chosen identity — automatically.
        </p>

        {formError && (
          <div className="vg-error">{formError}</div>
        )}

        {/* Identity selector */}
        <label className="vg-label">Select Identity</label>
        <select
          className={`vg-select${identityError ? " vg-select--error" : ""}`}
          value={selectedIdentity?.id || ""}
          onChange={(e) => {
            const identity = identities.find(i => i.id === e.target.value) || null;
            setSelectedIdentity(identity);
            if (identity) setIdentityError(null);
          }}
        >
          <option value="">Choose identity...</option>
          {identities.map(identity => {
            const label = identity.type === 'video'
              ? `🎥 Video Identity — ${identity.created_at?.slice(0, 10) || identity.id.slice(0, 8)}`
              : identity.persona_description
                ? `🖼 ${identity.persona_description.slice(0, 40)}`
                : `🖼 Identity ${identity.created_at?.slice(0, 10) || identity.id.slice(0, 8)}`;
            return <option key={identity.id} value={identity.id}>{label}</option>;
          })}
        </select>

        {identityError && (
          <p className="vg-field-error">{identityError}</p>
        )}

        {identitiesLoaded && identities.length === 0 && (
          <p className="vg-empty-identities">
            No identities yet.{" "}
            <a href="/create-identity" className="vg-link">Create one first →</a>
          </p>
        )}

        {/* Scene builder */}
        <div className="vg-scenes">
          <h3>Script &amp; Scenes</h3>

          {scenes.map((scene, idx) => (
            <div key={scene.id} className="vg-scene">
              <label>Your Script{scenes.length > 1 ? ` — Scene ${scene.id}` : ""}</label>
              <textarea
                className="vg-textarea"
                placeholder={`Write what you want to say — be direct and authentic. Speak like you're talking to one person.\n\nExample: "I just wanted to reach out because I've been thinking about you..."`}
                value={scene.prompt}
                onChange={(e) => { updateScene(scene.id, e.target.value); if (scriptError) setScriptError(null); }}
              />
              {idx === 0 && scriptError && (
                <p className="vg-field-error">{scriptError}</p>
              )}
              <p className="vg-helper">
                Aim for 30–90 seconds of natural speech.
              </p>
              <label style={{ marginTop: "10px", display: "block" }}>
                Scene {scene.id} — Visual Description
              </label>
              <textarea
                className="vg-textarea"
                placeholder="Describe the background or setting, e.g. 'Cinematic dark studio, warm spotlight, shallow depth of field'"
                value={scene.description}
                onChange={(e) => updateSceneDescription(scene.id, e.target.value)}
                rows={2}
              />
            </div>
          ))}

          <button className="vg-add" onClick={addScene}>
            + Add Scene
          </button>
        </div>

        {/* Generate button */}
        <button
          className="vg-generate"
          disabled={submitting}
          onClick={handleGenerate}
        >
          {submitting ? (
            <>
              <span className="vg-btn-spinner" /> Generating...
            </>
          ) : (
            "Generate My Video"
          )}
        </button>

      </div>
    </div>
  );
}
