'use client';

import Link from 'next/link';
import Spinner from './Spinner';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES = ['sm', 'md', 'lg'];

function buildClassName({ variant, size, loading, block, className }) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'primary';
  const safeSize = SIZES.includes(size) ? size : 'md';

  return [
    'btn',
    `btn--${safeVariant}`,
    `btn--${safeSize}`,
    block ? 'btn--block' : null,
    loading ? 'is-loading' : null,
    className || null,
  ]
    .filter(Boolean)
    .join(' ');
}

export default function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  type = 'button',
  onClick,
  className,
  children,
  ...rest
}) {
  const classes = buildClassName({ variant, size, loading, block, className });
  const spinnerSize = size === 'lg' ? 'md' : 'sm';

  const content = (
    <>
      {loading ? <Spinner size={spinnerSize} label="Working" /> : null}
      <span className="btn__label">{children}</span>
    </>
  );

  // Link rendering — next/link when an href is supplied and the element is not
  // explicitly forced to be a button.
  if (href && as !== 'button') {
    const isDisabled = disabled || loading;
    const isExternal = /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:');

    if (isDisabled) {
      return (
        <span
          className={`${classes} btn--disabled`}
          aria-disabled="true"
          aria-busy={loading ? 'true' : undefined}
          role="link"
          {...rest}
        >
          {content}
        </span>
      );
    }

    if (isExternal || as === 'a') {
      return (
        <a
          className={classes}
          href={href}
          onClick={onClick}
          aria-busy={loading ? 'true' : undefined}
          {...(isExternal ? { rel: 'noopener noreferrer' } : {})}
          {...rest}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        className={classes}
        href={href}
        onClick={onClick}
        aria-busy={loading ? 'true' : undefined}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  const handleClick = (event) => {
    if (loading || disabled) {
      event.preventDefault();
      return;
    }
    if (typeof onClick === 'function') {
      try {
        onClick(event);
      } catch (err) {
        // Never let a handler error break the render tree.
        // eslint-disable-next-line no-console
        console.error('Button onClick handler failed:', err);
      }
    }
  };

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </button>
  );
}

export { Button };