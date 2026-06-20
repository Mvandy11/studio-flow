import { useState, useMemo } from 'react';
import { calculateEarnings } from '../../lib/calcEarnings';

const DEFAULT_QUANTITY = 10;

export default function EarningsCalculator({ ticketPrice, membershipCost = 15 }) {
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);

  const { revenue, breakEvenTickets, profit } = useMemo(
    () => calculateEarnings({ ticketPrice, membershipCost, quantity }),
    [ticketPrice, membershipCost, quantity]
  );

  const isProfitable = profit > 0;

  const barFillPct = Math.min(
    100,
    membershipCost > 0 ? Math.round((revenue / membershipCost) * 100) : 100
  );

  function fmt(n) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  }

  return (
    <div className="earnings-calculator">
      <div className="earnings-calc-row">
        <label className="cinematic-label" style={{ flex: 1 }}>
          Expected Attendees
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input
              type="range"
              min={1}
              max={200}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="earnings-slider"
            />
            <input
              type="number"
              min={1}
              max={9999}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="cinematic-input"
              style={{ width: '72px', textAlign: 'center', padding: '0.4rem 0.5rem' }}
            />
          </div>
        </label>
      </div>

      <div className="earnings-stats">
        <div className="earnings-stat">
          <span className="earnings-stat-value" style={{ color: '#a78bfa' }}>
            {breakEvenTickets}
          </span>
          <span className="earnings-stat-label">to break even</span>
        </div>

        <div className="earnings-stat">
          <span className="earnings-stat-value" style={{ color: '#60a5fa' }}>
            {fmt(revenue)}
          </span>
          <span className="earnings-stat-label">revenue</span>
        </div>

        <div className="earnings-stat">
          <span
            className="earnings-stat-value"
            style={{ color: isProfitable ? '#4ade80' : '#f87171' }}
          >
            {isProfitable ? '+' : ''}{fmt(profit)}
          </span>
          <span className="earnings-stat-label">profit</span>
        </div>
      </div>

      <div className="earnings-bar-track">
        <div
          className="earnings-bar-fill"
          style={{
            width: `${barFillPct}%`,
            background: isProfitable
              ? 'linear-gradient(90deg, #4ade80, #60a5fa)'
              : 'linear-gradient(90deg, #f87171, #fb923c)',
          }}
        />
        {barFillPct < 100 && (
          <div
            className="earnings-bar-goal"
            style={{ left: `${Math.min(barFillPct + 1, 98)}%` }}
          >
            <span className="earnings-bar-goal-label">Cost</span>
          </div>
        )}
      </div>

      <p className="earnings-motivation">
        {isProfitable
          ? `You profit after ${breakEvenTickets} ticket${breakEvenTickets === 1 ? '' : 's'}. Most creators earn back their membership with just ${breakEvenTickets} ticket${breakEvenTickets === 1 ? '' : 's'}.`
          : `Sell ${breakEvenTickets - quantity} more ticket${breakEvenTickets - quantity === 1 ? '' : 's'} to cover your membership cost.`}
      </p>
    </div>
  );
}
