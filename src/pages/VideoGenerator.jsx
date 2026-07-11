import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import "./videoGenerator.css";

export default function VideoGenerator() {
  const { user } = useAuth();
  const [identities, setIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [scenes, setScenes] = useState([{ id: 1, prompt: "", description: "" }]);
  const [loading, setLoading] = useState(false);
  const [renderJobId, setRenderJobId] = useState(null);
  const [renderStatus, setRenderStatus] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [showPostSubmitExplainer, setShowPostSubmitExplainer] = useState(false);
  const [rewrittenScript, setRewrittenScript] = useState(null);
  const [showRewriteTooltip, setShowRewriteTooltip] = useState(false);

  // Load identities from backend (merges legacy identities + new video identity_records)
  useEffect(() => {
    if (!user) return;
    async function fetchIdentities() {
      try {
        const data = await api(`/identity/list?creator_id=${user.id}`);
        setIdentities(data.identities || []);
      } catch (err) {
        console.error("Failed to load identities", err);
      }
    }
    fetchIdentities();
  }, [user]);

  function addScene() {
    setScenes([...scenes, { id: scenes.length + 1, prompt: "", description: "" }]);
  }

  function updateScene(id, value) {
    setScenes(scenes.map(s => s.id === id ? { ...s, prompt: value } : s));
  }

  function updateSceneDescription(id, value) {
    setScenes(scenes.map(s => s.id === id ? { ...s, description: value } : s));
  }

  async function generateVideo() {
    if (!selectedIdentity) {
      setError("Please select an identity.");
      return;
    }

    setLoading(true);
    setFinalVideoUrl(null);
    setError(null);
    setRewrittenScript(null);
    setRenderStatus(null);

    try {
      const payload = {
        identity_id: selectedIdentity.id,
        identity_type: selectedIdentity.type,
        // video identities use video_url; legacy identities use selfie_url
        identity_url: selectedIdentity.type === 'video'
          ? selectedIdentity.video_url
          : selectedIdentity.selfie_url,
        scenes: scenes.map(s => ({ id: s.id, prompt: s.prompt, description: s.description })),
        script_text: scenes.map(s => s.prompt).filter(Boolean).join(" "),
        member_id: user.id
      };

      const { data: { session } } = await supabase.auth.getSession();
      const data = await api("/sessions/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (data.error) {
        setError(data.error || "Failed to start render.");
        setLoading(false);
        return;
      }

      setRenderJobId(data.render_job_id);
      setShowPostSubmitExplainer(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const STATUS_MESSAGES = {
    awaiting_emotion: "AI is reading your intent and crafting your script...",
    emotion_detected: "Tone locked in. Rendering your video now...",
    rendering: "Generating voice and expression — almost there...",
    completed: "Your video is ready.",
    error: "Something went wrong during rendering. Your script was saved — tap Try Again and we'll pick up where we left off."
  };

  function getStatusMessage(status) {
    return STATUS_MESSAGES[status] || `Status: ${status}`;
  }

  // Poll render status
  useEffect(() => {
    if (!renderJobId) return;
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Session expired. Please refresh and try again.');
          clearInterval(interval);
          return;
        }
        const data = await api(`/sessions/video/status/${renderJobId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        setShowPostSubmitExplainer(false);
        setRenderStatus(data.status);
        setRewrittenScript(data.rewritten_script || null);
        if (data.status === 'completed') {
          setFinalVideoUrl(data.video_url);
          clearInterval(interval);
        } else if (data.status === 'error') {
          setError('Render failed. Please try again.');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Status poll error', err);
        setError(`Poll error: ${err.message}`);
        setShowPostSubmitExplainer(false);
        clearInterval(interval);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [renderJobId]);

  return (
    <div className="vg-wrapper">
      <div className="vg-card">

        <h2 className="vg-title">Create Your Video</h2>
        <p className="vg-subtitle">
          Write your message. Our AI will detect the emotional tone, sharpen your script, and render it with matched voice energy and expression — automatically.
        </p>

        {error && (
          <div className="vg-error">
            Something went wrong during rendering.<br />
            Your script was saved — tap "Try Again" and we'll pick up where we left off.
          </div>
        )}

        {/* Identity Selector */}
        <label className="vg-label">Select Member Identity</label>
        <select
          className="vg-select"
          onChange={(e) => {
            const id = e.target.value;
            const identity = identities.find(i => i.id === id);
            setSelectedIdentity(identity || null);
          }}
        >
          <option value="">Choose identity...</option>
          {identities.map(identity => {
            const label = identity.type === 'video'
              ? `🎥 Video Identity — ${identity.created_at?.slice(0, 10) || identity.id.slice(0, 8)}`
              : identity.persona_description
                ? `🖼 ${identity.persona_description.slice(0, 40)}`
                : `🖼 Identity ${identity.created_at?.slice(0, 10) || identity.id.slice(0, 8)}`;
            return (
              <option key={identity.id} value={identity.id}>{label}</option>
            );
          })}
        </select>

        {/* Scene Builder */}
        <div className="vg-scenes">
          <h3>Scenes</h3>

          {scenes.map(scene => (
            <div key={scene.id} className="vg-scene">
              <label>Your Script{scenes.length > 1 ? ` — Scene ${scene.id}` : ""}</label>
              <textarea
                className="vg-textarea"
                placeholder={`Write what you want to say — be direct and authentic. Speak like you're talking to one person.\n\nExample: "I just wanted to reach out because I've been thinking about you. The work you've been doing is exactly what this industry needs — and I'd love to connect..."`}
                value={scene.prompt}
                onChange={(e) => updateScene(scene.id, e.target.value)}
              />
              <p className="vg-helper">
                Aim for 30–90 seconds of natural speech. Don't worry about tone — our AI will read your intent and amplify it.
              </p>
              <label style={{ marginTop: '10px', display: 'block' }}>Scene {scene.id} — Visual Description</label>
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

        {/* Generate Button */}
        <button
          className="vg-generate"
          disabled={loading || showPostSubmitExplainer || (renderStatus && renderStatus !== 'completed' && !error)}
          onClick={generateVideo}
        >
          {error
            ? "Try Again"
            : loading
              ? "Generating..."
              : finalVideoUrl
                ? "View My Video"
                : "Generate My Video"}
        </button>

        {/* Post-Submit Explainer — shown between job creation and first status poll response */}
        {showPostSubmitExplainer && !error && (
          <p className="vg-status">
            🤖  Analyzing your script...
            {"\n"}Our AI is reading your message for emotional intent — then rewriting it with sharper word choice, rhythm, and pacing to match your natural tone before rendering begins.
          </p>
        )}

        {/* Render Status */}
        {!showPostSubmitExplainer && renderStatus && !error && (
          <p className="vg-status">
            {getStatusMessage(renderStatus)}
          </p>
        )}

        {/* Rewritten Script Preview */}
        {!showPostSubmitExplainer && rewrittenScript && (
          <div className="vg-rewrite-card">
            <div className="vg-rewrite-label">
              Your AI-enhanced script
              <span
                className="vg-info-icon"
                tabIndex={0}
                onMouseEnter={() => setShowRewriteTooltip(true)}
                onMouseLeave={() => setShowRewriteTooltip(false)}
                onFocus={() => setShowRewriteTooltip(true)}
                onBlur={() => setShowRewriteTooltip(false)}
              >
                ⓘ
                {showRewriteTooltip && (
                  <span className="vg-tooltip">
                    Our AI detected the emotional intent of your original script and enhanced the word choice, pacing, and rhythm to match — so your delivery lands harder on camera. Your message stays the same. The impact gets amplified.
                  </span>
                )}
              </span>
            </div>
            <p className="vg-rewrite-content">{rewrittenScript}</p>
          </div>
        )}

        {/* Final Video */}
        {finalVideoUrl && (
          <div className="vg-video">
            <h3>Final Video</h3>
            <video src={finalVideoUrl} controls crossOrigin="anonymous"
              onError={() => window.open(finalVideoUrl, '_blank')} />
            <a href={finalVideoUrl} target="_blank" rel="noreferrer"
              style={{color:'#facc15', fontSize:'0.85rem', marginTop:'8px', display:'block'}}>
              ↗ Open video in new tab if player fails
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
