const EMOJIS = ['🔥', '❤️', '👏', '😱', '🎉', '💎'];

export default function ReactionBar({ onReact }) {
  return (
    <div className="stage-reaction-bar">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="stage-reaction-btn"
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
