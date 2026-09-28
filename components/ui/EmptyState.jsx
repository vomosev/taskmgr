export default function EmptyState({ title, description, action, icon }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        {icon || (
          <svg viewBox="0 0 64 64" width="64" height="64" focusable="false">
            <rect
              x="10"
              y="8"
              width="44"
              height="48"
              rx="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M20 24h24M20 34h24M20 44h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      {title ? <h3 className="empty-state__title">{title}</h3> : null}
      {description ? (
        <p className="empty-state__desc">{description}</p>
      ) : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}