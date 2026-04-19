import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionById } from '../lib/session';

export default function SessionPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getSessionById(id);
      setSession(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div>Loading session...</div>;
  if (!session) return <div>Session not found.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{session.title}</h1>
      <p>{session.description}</p>

      {session.livestream_url && (
        <iframe
          src={session.livestream_url}
          width="100%"
          height="400"
          allow="autoplay; encrypted-media"
        />
      )}
    </div>
  );
}
