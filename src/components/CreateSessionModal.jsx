import { useState } from 'react';
import { createSession, updateSession } from '../lib/session';
import { uploadSessionThumbnail } from '../lib/storage';
import ThumbnailPicker from './ThumbnailPicker';

export default function CreateSessionModal({ creatorId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [livestreamUrl, setLivestreamUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleCreate() {
    setError('');
    try {
      setLoading(true);

      const session = await createSession({
        creator_id:     creatorId,
        title,
        description,
        livestream_url: livestreamUrl,
        start_time:     startTime,
      });

      let thumbnailUrl = null;
      if (thumbnailFile) {
        thumbnailUrl = await uploadSessionThumbnail(thumbnailFile, session.id);
        await updateSession(session.id, { thumbnail_url: thumbnailUrl });
      }

      onCreated({ ...session, thumbnail_url: thumbnailUrl });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create session.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cinematic-backdrop">
      <div className="cinematic-card-xl cinematic-fade" style={{ width: '600px' }}>
        <h2 className="cinematic-title">✦ Create New Session</h2>

        <label>Title</label>
        <input
          className="cinematic-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label>Description</label>
        <textarea
          className="cinematic-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label>Livestream URL</label>
        <input
          className="cinematic-input"
          value={livestreamUrl}
          onChange={(e) => setLivestreamUrl(e.target.value)}
        />

        <label>Start Time</label>
        <input
          type="datetime-local"
          className="cinematic-input"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />

        <label>Thumbnail</label>
        <ThumbnailPicker onThumbnailSelected={setThumbnailFile} />

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.25rem 0' }}>{error}</p>
        )}

        <div className="cinematic-modal-actions">
          <button className="cinematic-button" onClick={onClose}>Cancel</button>
          <button
            className="cinematic-button-accent"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
