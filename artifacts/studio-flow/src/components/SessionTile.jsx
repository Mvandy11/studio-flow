export default function SessionTile({ title, description, thumbnail }) {
  return (
    <div className="cinematic-card cinematic-hover cinematic-fade" style={{ padding: 0 }}>
      <div
        className="session-fallback"
        style={{
          backgroundImage: thumbnail
            ? `url(${thumbnail})`
            : `url('/src/assets/art/session-fallback.png')`,
        }}
      />

      <div style={{ padding: '1.2rem' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ opacity: 0.75 }}>{description}</p>
      </div>
    </div>
  );
}
