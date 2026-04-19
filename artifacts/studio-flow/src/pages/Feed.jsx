import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getFeedForUser, expandFeedEvents } from '../lib/feed';

export default function Feed() {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const events = await getFeedForUser(user.id);
      const expanded = await expandFeedEvents(events);
      setFeed(expanded);
      setLoading(false);
    }

    load();
  }, [user]);

  if (!user) return <div>Please log in to view your feed.</div>;
  if (loading) return <div>Loading feed...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Your Feed</h1>

      {feed.map((item) => (
        <div key={item.id} style={{ marginBottom: '1.5rem' }}>
          {item.event_type === 'post' && (
            <div>
              <h3>New Post</h3>
              <p>{item.post.content}</p>
            </div>
          )}

          {item.event_type === 'session' && (
            <div>
              <h3>New Session</h3>
              <p>{item.session.title}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
