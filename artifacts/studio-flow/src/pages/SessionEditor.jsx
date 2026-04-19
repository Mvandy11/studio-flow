import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionById, updateSession } from '../lib/session';
import { uploadSessionThumbnail } from '../lib/storage';
import ThumbnailPicker from '../components/ThumbnailPicker';

export default function SessionEditor() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSessionById(id).then(setSession);
  }, [id]);

  if (!session) return <div>Loading…</div>;

  async function save() {
    setLoading(true);

    let updates = {
      title: session.title,
      description: session.description,
      livestream_url: session.livestream_url,
      start_time: session.start_time,
    };

    if (thumbnailFile) {
      const url = await uploadSessionThumbnail(thumbnailFile, id);
      updates.thumbnail_url = url;
    }

    await updateSession(id, updates);
    setLoading(false);
  }

  return (
    <div className="cinematic-layout cinematic-fade">
      <h2 className="cinematic-title">✦ Edit Session</h2>

      <div className="cinematic-card-xl" style={{ padding: '1.5rem' }}>
        <label>Title</label>
        <input
          className="cinematic-input"
          value={session.title}
          onChange={(e) => setSession({ ...session, title: e.target.value })}
        />

        <label>Description</label>
        <textarea
          className="cinematic-textarea"
          value={session.description}
          onChange={(e) => setSession({ ...session, description: e.target.value })}
        />

        <label>Livestream URL</label>
        <input
          className="cinematic-input"
          value={session.livestream_url}
          onChange={(e) => setSession({ ...session, livestream_url: e.target.value })}
        />

        <label>Start Time</label>
        <input
          type="datetime-local"
          className="cinematic-input"
          value={session.start_time?.slice(0, 16)}
          onChange={(e) => setSession({ ...session, start_time: e.target.value })}
        />

        <label>Thumbnail</label>
        <ThumbnailPicker onThumbnailSelected={setThumbnailFile} />

        <button
          className="cinematic-button-accent"
          onClick={save}
          disabled={loading}
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
