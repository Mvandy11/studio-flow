import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionById, updateSession } from '../lib/session';
import { uploadSessionThumbnail } from '../lib/storage';
import ThumbnailPicker from '../components/ThumbnailPicker';

export default function SessionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [livestreamUrl, setLivestreamUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getSessionById(id);
      setSession(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setLivestreamUrl(data.livestream_url || '');
      setStartTime(data.start_time ? data.start_time.slice(0, 16) : '');
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates = {
        title,
        description,
        livestream_url: livestreamUrl,
        start_time: startTime || null,
      };

      if (thumbnailFile) {
        const thumbnail_url = await uploadSessionThumbnail(thumbnailFile, id);
        updates.thumbnail_url = thumbnail_url;
      }

      await updateSession(id, updates);
      navigate('/studio');
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="cinematic-hero">Loading session...</div>;
  if (!session) return <div className="cinematic-hero">Session not found.</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="cinematic-fade" style={{ marginBottom: '1.5rem' }}>Edit Session</h1>

      <form
        onSubmit={handleSubmit}
        className="cinematic-card cinematic-stagger"
        style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <input
          className="cinematic-input"
          placeholder="Session title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="cinematic-input"
          placeholder="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ resize: 'vertical' }}
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

        <div>
          <p style={{ opacity: 0.6, marginBottom: '0.5rem' }}>
            {session.thumbnail_url ? 'Replace thumbnail:' : 'Add thumbnail:'}
          </p>
          {session.thumbnail_url && !thumbnailFile && (
            <img
              src={session.thumbnail_url}
              alt="Current thumbnail"
              style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }}
            />
          )}
          <ThumbnailPicker onThumbnailSelected={setThumbnailFile} />
        </div>

        {error && <p style={{ color: 'var(--accent-red, #ff6b6b)', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="cinematic-button cinematic-hover"
            onClick={() => navigate('/studio')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cinematic-button cinematic-button-accent cinematic-hover"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
