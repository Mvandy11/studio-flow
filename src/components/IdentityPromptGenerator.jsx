import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function IdentityPromptGenerator({ onCreated }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function generateIdentity() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setProgressMessage('Generating your character\'s face...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired. Please log in again.');

      const timeout = setTimeout(
        () => setProgressMessage('Designing a voice to match...'),
        3000
      );

      const res = await fetch('/api/identity/create-from-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ character_prompt: prompt.trim() })
      });

      clearTimeout(timeout);

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setResult(data);
      setProgressMessage('');
    } catch (err) {
      setError(err.message || 'Something went wrong while generating your identity.');
      setProgressMessage('');
    } finally {
      setGenerating(false);
    }
  }

  function resetAll() {
    setPrompt('');
    setGenerating(false);
    setProgressMessage('');
    setError('');
    setResult(null);
  }

  useEffect(() => {
    if (result && onCreated) {
      onCreated(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (result?.identity) {
    return (
      <div className="max-w-md mx-auto bg-studio-surface border border-studio-border rounded-2xl p-6 text-center">
        {result.identity.selfie_url && (
          <img
            src={result.identity.selfie_url}
            alt="Generated identity"
            className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border border-studio-border"
          />
        )}
        <p className="text-green-400 text-sm mb-1">Face generated ✓</p>
        <p className="text-green-400 text-sm mb-4">
          {result.identity.elevenlabs_voice_id ? 'Voice designed ✓' : 'Voice design skipped'}
        </p>
        <button
          type="button"
          onClick={resetAll}
          className="text-studio-accent text-sm underline hover:text-white"
        >
          Generate another identity
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-studio-surface border border-studio-border rounded-2xl p-6">
      <h2 className="text-white text-lg font-semibold mb-1">Generate AI Identity</h2>
      <p className="text-studio-muted text-sm mb-4">
        Describe a character and we'll generate a face and voice for them.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. A confident, warm-toned narrator in their 40s with short grey hair..."
        rows={4}
        disabled={generating}
        className="w-full bg-black/40 border border-studio-border rounded-lg px-3 py-2 text-white text-sm mb-4 outline-none focus:border-studio-accent resize-none disabled:opacity-60"
      />

      <button
        type="button"
        disabled={generating || !prompt.trim()}
        onClick={generateIdentity}
        className="w-full bg-studio-gold text-black font-semibold py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {generating ? 'Generating...' : 'Generate AI Identity'}
      </button>

      {generating && progressMessage && (
        <p className="text-studio-accent text-sm mt-3 text-center">{progressMessage}</p>
      )}

      {error && (
        <div className="mt-3">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            type="button"
            onClick={generateIdentity}
            className="w-full bg-studio-gold text-black font-semibold py-2.5 rounded-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
