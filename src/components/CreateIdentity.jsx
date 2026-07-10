import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

const MIN_SECONDS = 10;
const MAX_SECONDS = 120;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CreateIdentity({ onCreated }) {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    async function openCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 512, height: 512, facingMode: 'user' },
          audio: { channelCount: 1, sampleRate: 44100 }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch (err) {
        setCameraError(err.message || 'Could not access camera/microphone.');
      }
    }
    openCamera();
    return () => {
      stopCamera();
      clearInterval(timerRef.current);
    };
  }, [stopCamera]);

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setElapsedSeconds(0);
    setError('');

    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setVideoBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        if (next >= MAX_SECONDS) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  async function handleUpload() {
    if (!videoBlob) return;
    setUploading(true);
    setError('');
    try {
      setProgressMessage('Extracting your face and voice...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired. Please log in again.');

      const formData = new FormData();
      formData.append('video', videoBlob, 'identity.webm');
      formData.append('name', name);
      formData.append('profile_id', user?.id || '');

      setTimeout(() => setProgressMessage('Cloning your voice with ElevenLabs...'), 1500);

      const res = await fetch(`${API_BASE}/identity/create-from-video`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setResult(data);
      setProgressMessage('');
    } catch (err) {
      setError(err.message || 'Something went wrong while creating your identity.');
      setProgressMessage('');
    } finally {
      setUploading(false);
    }
  }

  function resetAll() {
    clearInterval(timerRef.current);
    stopCamera();
    setName('');
    setCameraReady(false);
    setCameraError('');
    setRecording(false);
    setElapsedSeconds(0);
    setPreviewUrl(null);
    setVideoBlob(null);
    setUploading(false);
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

  if (result) {
    return (
      <div className="max-w-md mx-auto bg-studio-surface border border-studio-border rounded-2xl p-6 text-center">
        {result.selfie_url && (
          <img
            src={result.selfie_url}
            alt={result.name}
            className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border border-studio-border"
          />
        )}
        <h2 className="text-white text-lg font-semibold mb-1">{result.name}</h2>
        <p className="text-green-400 text-sm mb-1">Face extracted ✓</p>
        <p className="text-green-400 text-sm mb-4">Voice cloned ✓</p>
        <button
          type="button"
          onClick={resetAll}
          className="text-studio-accent text-sm underline hover:text-white"
        >
          Create another identity
        </button>
      </div>
    );
  }

  const canStop = recording && elapsedSeconds >= MIN_SECONDS;
  const secondsRemaining = MIN_SECONDS - elapsedSeconds;
  const timerColorClass = elapsedSeconds >= MIN_SECONDS ? 'text-green-400' : 'text-yellow-400';

  return (
    <div className="max-w-md mx-auto bg-studio-surface border border-studio-border rounded-2xl p-6">
      <h2 className="text-white text-lg font-semibold mb-1">Create Your Identity</h2>
      <p className="text-studio-muted text-sm mb-4">
        Record a short video (10–120 seconds) to capture your face and voice.
      </p>

      {cameraError && (
        <p className="text-red-400 text-sm mb-3">{cameraError}</p>
      )}

      <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden mb-4">
        {previewUrl ? (
          <video src={previewUrl} controls className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}
        {recording && (
          <div className={`absolute top-3 right-3 font-mono text-sm font-semibold ${timerColorClass} bg-black/60 px-2 py-1 rounded-md`}>
            {formatTime(elapsedSeconds)}
          </div>
        )}
      </div>

      {!previewUrl && (
        <>
          <label className="block text-studio-muted text-sm mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My On-Camera Identity"
            className="w-full bg-black/40 border border-studio-border rounded-lg px-3 py-2 text-white text-sm mb-4 outline-none focus:border-studio-accent"
          />

          {!recording ? (
            <button
              type="button"
              disabled={!cameraReady || !name.trim()}
              onClick={startRecording}
              className="w-full bg-studio-gold text-black font-semibold py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Recording
            </button>
          ) : (
            <button
              type="button"
              disabled={!canStop}
              onClick={stopRecording}
              className="w-full bg-red-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {canStop ? 'Stop Recording' : `${secondsRemaining} more second${secondsRemaining === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      )}

      {previewUrl && !uploading && !error && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={resetAll}
            className="flex-1 bg-black/40 border border-studio-border text-white font-semibold py-2.5 rounded-lg"
          >
            Re-record
          </button>
          <button
            type="button"
            onClick={handleUpload}
            className="flex-1 bg-studio-gold text-black font-semibold py-2.5 rounded-lg"
          >
            Create Identity
          </button>
        </div>
      )}

      {uploading && progressMessage && (
        <p className="text-studio-accent text-sm mt-3 text-center">{progressMessage}</p>
      )}

      {error && (
        <div className="mt-3">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            type="button"
            onClick={handleUpload}
            className="w-full bg-studio-gold text-black font-semibold py-2.5 rounded-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
