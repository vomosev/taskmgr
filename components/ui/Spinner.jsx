export default function Spinner({ size = 'md', label = 'Loading' }) {
  const allowed = ['sm', 'md', 'lg'];
  const resolved = allowed.includes(size) ? size : 'md';

  return (
    <span className={`spinner spinner--${resolved}`} role="status" aria-live="polite">
      <svg
        className="spinner__svg"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="spinner__track"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          className="spinner__indicator"
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}