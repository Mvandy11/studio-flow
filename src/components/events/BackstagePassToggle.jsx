const BADGE_ICON = '🎟️';

export default function BackstagePassToggle({
  backstagePass,
  setBackstagePass,
  seatLimit,
  setSeatLimit,
  disabled,
}) {
  return (
    <div className={`bpt-wrapper ${backstagePass ? 'bpt-wrapper--active' : ''}`}>
      <div className="bpt-header">
        <div className="bpt-label-group">
          <span className="bpt-label">Backstage Pass Mode</span>
          <span className="bpt-subtext">Exclusive, intimate, limited-seat live session.</span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={backstagePass}
          aria-label="Toggle Backstage Pass Mode"
          className={`bpt-toggle ${backstagePass ? 'bpt-toggle--on' : ''}`}
          onClick={() => !disabled && setBackstagePass(!backstagePass)}
          disabled={disabled}
          title={disabled ? 'Only available for paid events' : undefined}
        >
          <span className="bpt-toggle-knob" />
        </button>
      </div>

      {disabled && (
        <p className="bpt-disabled-hint">Enable paid event and set a ticket price first.</p>
      )}

      {backstagePass && !disabled && (
        <div className="bpt-expanded cinematic-fade">
          <div className="bpt-badge-preview">
            <span className="bpt-badge-icon" aria-hidden="true">{BADGE_ICON}</span>
            <div>
              <span className="bpt-badge-label">Backstage Pass Moment</span>
              <span className="bpt-badge-tagline">Exclusive · Limited Seats · Live</span>
            </div>
          </div>

          <p className="bpt-description">
            Backstage Pass Moments are ticket-gated, limited-seat live sessions on the
            Live Studio Stage — cinematic real-time chat, emoji reactions, pinned messages,
            and an intimate audience that earned their spot.
          </p>

          <div>
            <label className="cinematic-label" htmlFor="bpt-seat-limit">
              Seat Limit
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
              <input
                id="bpt-seat-limit"
                type="number"
                min={1}
                max={10000}
                className="cinematic-input"
                value={seatLimit}
                onChange={(e) => setSeatLimit(Math.max(1, Number(e.target.value)))}
                style={{ maxWidth: '110px' }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.4 }}>
                Max viewers who can buy a ticket.<br />
                <em>50 is the sweet spot for exclusivity.</em>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
