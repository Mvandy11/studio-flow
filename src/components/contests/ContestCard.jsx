import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

const CATEGORY_LABELS = {
  general:   'General',
  creative:  'Creative',
  music:     'Music',
  film:      'Film',
  comedy:    'Comedy',
  photo:     'Photo',
  design:    'Design',
};

function getCategoryGradient(category) {
  const c = (category || '').toLowerCase();
  if (c === 'music')                          return 'linear-gradient(135deg, #6d28d9, #db2777)';
  if (c === 'art' || c === 'design' || c === 'creative') return 'linear-gradient(135deg, #0ea5e9, #6d28d9)';
  if (c === 'comedy' || c === 'entertainment') return 'linear-gradient(135deg, #f59e0b, #ef4444)';
  if (c === 'photo' || c === 'film')          return 'linear-gradient(135deg, #1e3a5f, #0ea5e9)';
  if (c === 'gaming')                         return 'linear-gradient(135deg, #10b981, #6d28d9)';
  return 'linear-gradient(135deg, #7C3AED, #F5C842)';
}

export default function ContestCard({ contest }) {
  const categoryLabel = contest.category
    ? (CATEGORY_LABELS[contest.category] ?? contest.category)
    : null;

  const coverUrl = contest.cover_image || contest.image_url || contest.thumbnail_url;

  return (
    <Link to={`/contests/${contest.id}`} className="contest-card">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={contest.title}
          className="contest-card__thumb"
          loading="lazy"
        />
      ) : (
        <div
          className="contest-card__thumb"
          style={{
            background: getCategoryGradient(contest.category),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <Trophy size={36} color="#F5C842" strokeWidth={1.5} />
          <p style={{
            color: '#fff',
            fontWeight: 700,
            marginTop: 8,
            fontSize: 14,
            textAlign: 'center',
            padding: '0 12px',
            lineHeight: 1.3,
          }}>
            {contest.title}
          </p>
        </div>
      )}

      <div className="contest-card__body">
        <h3 className="contest-card__title">{contest.title}</h3>
        {contest.description && (
          <p className="contest-card__desc">{contest.description}</p>
        )}
        <div className="contest-card__meta">
          <span className="contest-card__status contest-card__status--active">Active</span>
          {categoryLabel && (
            <span className="contest-card__category">{categoryLabel}</span>
          )}
          {contest.prize_pool > 0 && (
            <span className="contest-card__prize">
              ${Number(contest.prize_pool).toLocaleString()} Prize
            </span>
          )}
        </div>
      </div>

      <div className="contest-card__footer">
        <span />
        <span>View →</span>
      </div>
    </Link>
  );
}
