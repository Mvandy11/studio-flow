import { useState } from "react";

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

    const data = await res.json();
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const selfieUrl = await uploadToSupabase(selfieFile, "selfies");
      const voiceUrl = await uploadToSupabase(voiceFile, "voices");

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

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Identity creation failed.");
    }

    setLoading(false);
  }

  return (
    <div className="identity-container">
      <h2>Create Member Identity</h2>

      <form onSubmit={handleSubmit} className="identity-form">

        <label>Upload Member Image (Selfie)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelfieFile(e.target.files[0])}
        />

        <label>Upload Member Voice Sample</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setVoiceFile(e.target.files[0])}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating Identity..." : "Create Identity"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="identity-result">
          <h3>Identity Created</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
