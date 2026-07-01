import { useState, useEffect } from "react";
import "./videoGenerator.css";

export default function VideoGenerator() {
  const [identities, setIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [scenes, setScenes] = useState([
    { id: 1, prompt: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [renderId, setRenderId] = useState(null);
  const [renderStatus, setRenderStatus] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

  // Load identities from backend
  useEffect(() => {
    async function fetchIdentities() {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/identity/list`);
      const data = await res.json();
      setIdentities(data.identities || []);
    }
    fetchIdentities();
  }, []);

  function addScene() {
    setScenes([...scenes, { id: scenes.length + 1, prompt: "" }]);
  }

  function updateScene(id, value) {
    setScenes(scenes.map(s => s.id === id ? { ...s, prompt: value } : s));
  }

  async function generateVideo() {
    if (!selectedIdentity) {
      alert("Please select an identity.");
      return;
    }

    setLoading(true);
    setFinalVideoUrl(null);

    const payload = {
      identity_id: selectedIdentity.identity_id,
      scenes: scenes.map(s => ({
        id: s.id,
        prompt: s.prompt
      }))
    };

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/video/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await res.json();
    setRenderId(data.render_id);
    setRenderStatus("queued");
    setLoading(false);
  }

  // Poll render status
  useEffect(() => {
    if (!renderId) return;

    const interval = setInterval(async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/video/status/${renderId}`
      );
      const data = await res.json();

      setRenderStatus(data.status);

      if (data.status === "completed") {
        setFinalVideoUrl(data.video_url);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [renderId]);

  return (
    <div className="vg-wrapper">
      <div className="vg-card">

        <h2 className="vg-title">Video Scene Generator</h2>

        {/* Identity Selector */}
        <label className="vg-label">Select Member Identity</label>
        <select
          className="vg-select"
          onChange={(e) => {
            const id = e.target.value;
            const identity = identities.find(i => i.identity_id === id);
            setSelectedIdentity(identity);
          }}
        >
          <option value="">Choose identity...</option>
          {identities.map(identity => (
            <option key={identity.identity_id} value={identity.identity_id}>
              {identity.identity_id}
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
                placeholder="Describe the scene..."
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
