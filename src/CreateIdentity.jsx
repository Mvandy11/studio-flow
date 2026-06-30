import { useState } from "react";

export default function CreateIdentity() {
  const [selfie, setSelfie] = useState(null);
  const [voice, setVoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      selfie_url: selfie,
      voice_url: voice,
      persona_description: "Default persona",
      profile_id: "demo-profile",
      tenant_id: "demo-tenant",
      device_id: "demo-device",
      realm_id: "demo-realm"
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
    setLoading(false);
  }

  return (
    <div>
      <h2>Create Identity</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Selfie URL"
          onChange={(e) => setSelfie(e.target.value)}
        />

        <input
          type="text"
          placeholder="Voice URL"
          onChange={(e) => setVoice(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Identity"}
        </button>
      </form>

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
