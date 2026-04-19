import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getFeedForUser, expandFeedEvents } from '../lib/feed';
import CinematicFeedCard from '../components/CinematicFeedCard';
import SessionTile from '../components/SessionTile';

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

  if (!user) return <div className="cinematic-hero">Please log in to view your feed.</div>;
  if (loading) return <div className="cinematic-hero">Loading feed...</div>;

  return (
    <div style={{ padding: '2rem' }} className="cinematic-stagger">
      <h1>Your Feed</h1>

      {feed.map((item) => (
        <div key={item.id}>
          {item.event_type === 'post' && (
            <CinematicFeedCard title="New Post" body={item.post.content} />
          )}

          {item.event_type === 'session' && (
            <SessionTile
              title={item.session.title}
              description={item.session.description}
              thumbnail={item.session.thumbnail_url}
            />
          )}
        </div>
      ))}
    </div>
  );
}
