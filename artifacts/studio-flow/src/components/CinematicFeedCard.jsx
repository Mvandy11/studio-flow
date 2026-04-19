export default function CinematicFeedCard({ title, body, children }) {
  return (
    <div className="cinematic-card cinematic-hover cinematic-fade" style={{ marginBottom: '1.5rem' }}>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      {body && <p style={{ opacity: 0.85 }}>{body}</p>}
      {children}
    </div>
  );
}
