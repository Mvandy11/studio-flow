import '../../src/styles/dev.css';
import { useNavigate } from 'react-router-dom';
import { useFeed } from '../hooks/useFeed';
import FeedItem from '../components/FeedItem';

export default function DevFeed() {
  const navigate = useNavigate();
  const { data: events = [], isLoading, dataUpdatedAt } = useFeed();

  return (
    <div className="cinematic-layout cinematic-fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fabc50', background: 'rgba(250,188,80,0.12)', border: '1px solid rgba(250,188,80,0.3)', borderRadius: '4px', padding: '0.2rem 0.55rem', marginBottom: '0.5rem' }}>
            🛠 Dev Mode
          </span>
          <h1 className="cinematic-title">Activity Feed</h1>
          <p style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.2rem' }}>
            Auto-refreshes every 5s · Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        </div>
        <button className="cinematic-button" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/dev')}>
          ← Dashboard
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="cinematic-spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {events.map((event) => (
            <FeedItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
