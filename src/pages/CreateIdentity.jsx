import { useState } from "react";
import "./identity.css"; // optional styling file if you want to separate styles

export default function CreateIdentity() {
  const [selfieFile, setSelfieFile] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function uploadToSupabase(file, bucket) {
    const fileName = `${Date.now()}-${file.name}`;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/upload/${bucket}`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    const data = await res.json();
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!selfieFile || !voiceFile) {
        setError("Please upload both a selfie and a voice sample.");
        setLoading(false);
        return;
      }

      // Upload selfie → Supabase
      const selfieUrl = await uploadToSupabase(selfieFile, "selfies");

      // Upload voice → Supabase
      const voiceUrl = await uploadToSupabase(voiceFile, "voices");

      // Identity creation payload
      const payload = {
        selfie_url: selfieUrl,
        voice_url: voiceUrl,
        persona_description: "Member identity for video generator",
        profile_id: "member-profile",
        tenant_id: "studioflow",
        device_id: "web",
        realm_id: "identity-engine"
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/identity/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        throw new Error("Identity creation failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Identity creation failed.");
    }

    setLoading(false);
  }

  return (
    <div className="identity-wrapper">
      <div className="identity-card">
        <h2 className="identity-title">Create Member Identity</h2>

        <form onSubmit={handleSubmit} className="identity-form">

          <label className="identity-label">Upload Member Image (Selfie)</label>
          <input
            type="file"
            accept="image/*"
            className="identity-input"
            onChange={(e) => setSelfieFile(e.target.files[0])}
          />

          <label className="identity-label">Upload Member Voice Sample</label>
          <input
            type="file"
            accept="audio/*"
            className="identity-input"
            onChange={(e) => setVoiceFile(e.target.files[0])}
          />

          <button type="submit" className="identity-button" disabled={loading}>
            {loading ? "Creating Identity..." : "Create Identity"}
          </button>
        </form>

        {error && <p className="identity-error">{error}</p>}

        {result && (
          <div className="identity-result">
            <h3>Identity Created</h3>
            <pre className="identity-json">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

