import { STATUS_LABELS, PRIORITY_LABELS } from '../../lib/format';

const TONES = ['neutral', 'accent', 'success', 'warning', 'danger'];
const SIZES = ['sm', 'md'];

export default function Badge({
  tone = 'neutral',
  size = 'sm',
  className = '',
  children,
  ...rest
}) {
  const safeTone = TONES.includes(tone) ? tone : 'neutral';
  const safeSize = SIZES.includes(size) ? size : 'sm';
  const classes = ['badge', `badge--${safeTone}`, `badge--${safeSize}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

const STATUS_TONES = {
  todo: 'neutral',
  in_progress: 'accent',
  done: 'success',
};

const PRIORITY_TONES = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
};

const FALLBACK_STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

const FALLBACK_PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function statusBadgeProps(status) {
  const key = typeof status === 'string' ? status : '';
  const labels = STATUS_LABELS || FALLBACK_STATUS_LABELS;
  return {
    tone: STATUS_TONES[key] || 'neutral',
    label: labels[key] || FALLBACK_STATUS_LABELS[key] || 'Unknown',
  };
}

export function priorityBadgeProps(priority) {
  const key = typeof priority === 'string' ? priority : '';
  const labels = PRIORITY_LABELS || FALLBACK_PRIORITY_LABELS;
  return {
    tone: PRIORITY_TONES[key] || 'neutral',
    label: labels[key] || FALLBACK_PRIORITY_LABELS[key] || 'Normal',
  };
}

export { Badge };