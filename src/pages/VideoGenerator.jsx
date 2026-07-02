import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from '../lib/supabaseClient';
import "./videoGenerator.css";

export default function VideoGenerator() {
  const { user } = useAuth();
  const [identities, setIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [scenes, setScenes] = useState([{ id: 1, prompt: "" }]);
  const [loading, setLoading] = useState(false);
  const [renderJobId, setRenderJobId] = useState(null);
  const [renderStatus, setRenderStatus] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [error, setError] = useState(null);

  // Load identities from backend
  useEffect(() => {
    if (!user) return;
    async function fetchIdentities() {
      try {
        const { data, error } = await supabase
          .from('identities')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setIdentities(data || []);
      } catch (err) {
        console.error("Failed to load identities", err);
      }
    }
    fetchIdentities();
  }, [user]);

  function addScene() {
    setScenes([...scenes, { id: scenes.length + 1, prompt: "" }]);
  }

  function updateScene(id, value) {
    setScenes(scenes.map(s => s.id === id ? { ...s, prompt: value } : s));
  }

  async function generateVideo() {
    if (!selectedIdentity) {
      setError("Please select an identity.");
      return;
    }

    setLoading(true);
    setFinalVideoUrl(null);
    setError(null);

    try {
      const payload = {
        identity_id: selectedIdentity.id,
        identity_url: selectedIdentity.selfie_url,
        scenes: scenes.map(s => ({ id: s.id, prompt: s.prompt })),
        script_text: scenes.map(s => s.prompt).filter(Boolean).join(" "),
        member_id: user.id
      };

      const res = await fetch("/api/sessions/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start render.");
        setLoading(false);
        return;
      }

      setRenderJobId(data.render_job_id);
      setRenderStatus("queued");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Poll render status
  useEffect(() => {
    if (!renderJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/video/status/${renderJobId}`);
        const data = await res.json();

        setRenderStatus(data.status);

        if (data.status === "completed") {
          setFinalVideoUrl(data.video_url);
          clearInterval(interval);
        } else if (data.status === "error") {
          setError("Render failed. Please try again.");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Status poll error", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [renderJobId]);

  return (
    <div className="vg-wrapper">
      <div className="vg-card">

        <h2 className="vg-title">Video Scene Generator</h2>

        {error && (
          <div className="vg-error">{error}</div>
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
          {identities.map(identity => (
            <option key={identity.id} value={identity.id}>
              {identity.persona_description || identity.id}
            </option>
          ))}
        </select>

        {/* Scene Builder */}
        <div className="vg-scenes">
          <h3>Scenes</h3>

          {scenes.map(scene => (
            <div key={scene.id} className="vg-scene">
              <label>Scene {scene.id}</label>
              <textarea
                className="vg-textarea"
                placeholder="Describe what the AI should say in this scene..."
                value={scene.prompt}
                onChange={(e) => updateScene(scene.id, e.target.value)}
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
          disabled={loading}
          onClick={generateVideo}
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        {/* Render Status */}
        {renderStatus && (
          <p className="vg-status">
            Status: {renderStatus}
          </p>
        )}

        {/* Final Video */}
        {finalVideoUrl && (
          <div className="vg-video">
            <h3>Final Video</h3>
            <video src={finalVideoUrl} controls width="100%" />
          </div>
        )}

      </div>
    </div>
  );
}
