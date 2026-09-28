'use client';

import { forwardRef, useId } from 'react';

function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
}) {
  const generatedId = useId();
  const controlId = htmlFor || `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control =
    typeof children === 'function'
      ? children({
          id: controlId,
          'aria-describedby': describedBy,
          'aria-invalid': error ? 'true' : undefined,
          invalid: Boolean(error),
          required,
        })
      : children;

  return (
    <div className={classNames('field', error && 'field--invalid', className)}>
      {label ? (
        <label className="field__label" htmlFor={controlId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {control}

      {hint && !error ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { type = 'text', invalid = false, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={classNames('input', invalid && 'input--invalid', className)}
      aria-invalid={invalid ? 'true' : rest['aria-invalid']}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { rows = 4, invalid = false, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={classNames(
        'input',
        'textarea',
        invalid && 'input--invalid',
        className
      )}
      aria-invalid={invalid ? 'true' : rest['aria-invalid']}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select(
  { options, placeholder, invalid = false, className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={classNames(
        'input',
        'select',
        invalid && 'input--invalid',
        className
      )}
      aria-invalid={invalid ? 'true' : rest['aria-invalid']}
      {...rest}
    >
      {placeholder ? (
        <option value="">{placeholder}</option>
      ) : null}
      {Array.isArray(options)
        ? options.map((option) => {
            const value =
              typeof option === 'string' ? option : String(option.value);
            const label =
              typeof option === 'string' ? option : option.label ?? value;
            return (
              <option key={value} value={value} disabled={option.disabled}>
                {label}
              </option>
            );
          })
        : null}
      {children}
    </select>
  );
});

export default Input;