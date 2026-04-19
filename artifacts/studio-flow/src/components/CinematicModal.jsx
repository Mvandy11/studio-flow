export default function CinematicModal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div
      className="cinematic-fade"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        className="cinematic-card cinematic-hover"
        style={{
          width: '90%',
          maxWidth: '480px',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
