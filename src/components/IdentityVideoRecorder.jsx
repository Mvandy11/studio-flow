import { useState, useRef, useEffect } from "react";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

export default function IdentityVideoRecorder() {
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);
  const [identityStatus, setIdentityStatus] = useState(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Initialize camera + microphone
  useEffect(() => {
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        // Attach stream to video element
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check if audio track exists
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        if (videoTracks.length > 0 && audioTracks.length > 0) {
          setReady(true); // <-- Enable Start Recording button
        } else {
          setError("Microphone or camera not detected.");
        }
      } catch (err) {
        console.error(err);
        setError("Camera or microphone blocked by browser or permissions policy.");
      }
    }

    init();
  }, []);

  async function startRecording() {
    const stream = videoRef.current.srcObject;

    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/mp4" });
      const file = new File([blob], "identity.mp4", { type: "video/mp4" });

      const formData = new FormData();
      formData.append("identity_video", file);

      const res = await fetch(`${API_BASE}/identity/create-from-video`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      setIdentityStatus(data);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }

  return (
    <div className="identity-recorder">
      <h2>Create Your Identity</h2>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      <video
        ref={videoRef}
        width="480"
        height="360"
        style={{ background: "#000", marginBottom: "10px" }}
      />

      {!recording && (
        <button disabled={!ready} onClick={startRecording}>
          Start Recording
        </button>
      )}

      {recording && (
        <button onClick={stopRecording}>
          Stop Recording
        </button>
      )}

      {identityStatus && (
        <div className="identity-result">
          <h3>Identity Created</h3>
          <pre>{JSON.stringify(identityStatus, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
