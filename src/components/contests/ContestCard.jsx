import { Link } from 'react-router-dom';

const CATEGORY_LABELS = {
  general:   'General',
  creative:  'Creative',
  music:     'Music',
  film:      'Film',
  comedy:    'Comedy',
  photo:     'Photo',
  design:    'Design',
};

export default function ContestCard({ contest }) {
  const categoryLabel = contest.category
    ? (CATEGORY_LABELS[contest.category] ?? contest.category)
    : null;

  return (
    <Link to={`/contests/${contest.id}`} className="contest-card">
      {contest.thumbnail_url ? (
        <img
          src={contest.thumbnail_url}
          alt={contest.title}
          className="contest-card__thumb"
          loading="lazy"
        />
      ) : (
        <div
          className="contest-card__thumb"
          style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem' }}
        >
          🏆
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
