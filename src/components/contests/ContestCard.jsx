import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const STATUS_LABELS = {
  draft:     'Draft',
  active:    'Open',
  voting:    'Voting',
  completed: 'Ended',
  archived:  'Archived',
};

export default function ContestCard({ contest }) {
  const statusClass = `contest-card__status contest-card__status--${contest.status}`;
  const closingDate = contest.submission_end || contest.end_date;
  const closingLabel = closingDate
    ? formatDistanceToNow(new Date(closingDate), { addSuffix: true })
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
          <span className={statusClass}>{STATUS_LABELS[contest.status] ?? contest.status}</span>
          {contest.prize_pool > 0 && (
            <span className="contest-card__prize">
              ${Number(contest.prize_pool).toLocaleString()} Prize
            </span>
          )}
        </div>
      </div>

      {closingLabel && (
        <div className="contest-card__footer">
          <span>Closes {closingLabel}</span>
          <span>→</span>
        </div>
      )}
    </Link>
  );
}
