import { useState } from 'react';
import ThumbnailPicker from './ThumbnailPicker';
import { createSession, updateSession } from '../lib/session';
import { uploadSessionThumbnail } from '../lib/storage';
import { useAuth } from '../hooks/useAuth';

export default function CreateSessionModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [livestreamUrl, setLivestreamUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const session = await createSession({
        creator_id: user.id,
        title,
        description,
        livestream_url: livestreamUrl,
        start_time: startTime || null,
      });

      if (thumbnailFile) {
        const thumbnail_url = await uploadSessionThumbnail(thumbnailFile, session.id);
        await updateSession(session.id, { thumbnail_url });
        session.thumbnail_url = thumbnail_url;
      }

      onCreated?.(session);
      handleClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTitle('');
    setDescription('');
    setLivestreamUrl('');
    setStartTime('');
    setThumbnailFile(null);
    setError(null);
    onClose();
  }

  return (
    <div
      className="cinematic-backdrop"
      onClick={handleClose}
    >
      <div
        className="cinematic-card-xl cinematic-fade"
        style={{ width: '90%', maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Create Session</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="cinematic-input"
            placeholder="Session title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="cinematic-input cinematic-textarea"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="cinematic-input"
            placeholder="Livestream URL (optional)"
            value={livestreamUrl}
            onChange={(e) => setLivestreamUrl(e.target.value)}
          />
          <input
            className="cinematic-input"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />

          <ThumbnailPicker onThumbnailSelected={setThumbnailFile} />

          {error && (
            <p style={{ color: 'var(--accent-rose)', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="cinematic-button cinematic-hover" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="cinematic-button cinematic-button-accent cinematic-hover" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
