import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionById, updateSession, deleteSession } from '../lib/session';
import { uploadSessionThumbnail } from '../lib/storage';
import ThumbnailPicker from '../components/ThumbnailPicker';

export default function SessionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      navigate('/studio/sessions');
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteSession(id);
      navigate('/studio/sessions');
    } catch (err) {
      setError(err.message || 'Failed to delete session.');
      setDeleting(false);
    }
  }

  if (loading) return <div className="cinematic-hero">Loading session...</div>;
  if (!session) return <div className="cinematic-hero">Session not found.</div>;

  return (
    <div className="cinematic-layout">
      <h1 className="cinematic-title">Edit Session</h1>

      <form
        onSubmit={handleSubmit}
        className="cinematic-card-xl cinematic-stagger"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
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

        <div>
          <p style={{ opacity: 0.6, marginBottom: '0.5rem' }}>
            {session.thumbnail_url ? 'Replace thumbnail:' : 'Add thumbnail:'}
          </p>
          {session.thumbnail_url && !thumbnailFile && (
            <img
              src={session.thumbnail_url}
              alt="Current thumbnail"
              className="cinematic-thumbnail"
              style={{ marginBottom: '0.8rem' }}
            />
          )}
          <ThumbnailPicker onThumbnailSelected={setThumbnailFile} />
        </div>

        {error && <p style={{ color: 'var(--accent-rose)', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="cinematic-button cinematic-button-danger cinematic-hover"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Session'}
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="cinematic-button cinematic-hover"
              onClick={() => navigate('/studio/sessions')}
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
        </div>
      </form>
    </div>
  );
}
