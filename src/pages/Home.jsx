import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="cinematic-hero cinematic-fade">
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        Welcome to Studio Flow
      </h1>
      <p style={{ maxWidth: '600px', opacity: 0.8 }}>
        A cinematic space for creators to host sessions, share moments, and build community.
      </p>

      {!user && (
        <p style={{ marginTop: '2rem', opacity: 0.7 }}>
          Log in to begin your creative journey.
        </p>
      )}
    </div>
  );
}
