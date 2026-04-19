export default function ChatBubble({ message, isSelf }) {
  return (
    <div
      className="cinematic-fade"
      style={{
        display: 'flex',
        justifyContent: isSelf ? 'flex-end' : 'flex-start',
        marginBottom: '0.6rem',
      }}
    >
      <div
        className="cinematic-card"
        style={{
          maxWidth: '70%',
          padding: '0.8rem 1rem',
          background: isSelf
            ? 'rgba(110, 168, 255, 0.15)'
            : 'rgba(255, 255, 255, 0.05)',
          borderColor: isSelf
            ? 'rgba(110, 168, 255, 0.35)'
            : 'rgba(255, 255, 255, 0.06)',
        }}
      >
        {message}
      </div>
    </div>
  );
}
