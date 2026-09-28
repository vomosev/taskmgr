export function Card({
  as: Tag = 'div',
  padding = 'md',
  raised = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'card',
    `card--pad-${padding}`,
    raised ? 'card--raised' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, actions, className = '', children }) {
  const classes = ['card__header', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="card__header-text">
        {title ? <h3 className="card__title">{title}</h3> : null}
        {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="card__actions cluster">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className = '', children, ...rest }) {
  const classes = ['card__body', 'stack', className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...rest }) {
  const classes = ['card__footer', 'cluster', className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export default Card;