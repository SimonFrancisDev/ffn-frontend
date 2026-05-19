import { AlertTriangle, Bell, Info, Loader2, Search } from 'lucide-react'
import './UiPrimitives.css'

const cx = (...classes) => classes.filter(Boolean).join(' ')

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'start',
  className = '',
  type = 'button',
  ...props
}) {
  const iconNode = Icon ? <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" /> : null

  return (
    <button
      type={type}
      className={cx('ffn-button', `ffn-button--${variant}`, size !== 'md' && `ffn-button--${size}`, className)}
      {...props}
    >
      {iconPosition === 'start' ? iconNode : null}
      {children}
      {iconPosition === 'end' ? iconNode : null}
    </button>
  )
}

export function IconButton({
  label,
  icon: Icon,
  className = '',
  size = 40,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cx('ffn-icon-button', className)}
      aria-label={label}
      title={label}
      style={{ '--ffn-icon-button-size': `${size}px`, ...(props.style || {}) }}
      {...props}
    >
      {Icon ? <Icon size={Math.max(14, Math.round(size * 0.45))} aria-hidden="true" /> : null}
    </button>
  )
}

export function Card({ as: Component = 'article', className = '', children, ...props }) {
  return <Component className={cx('ffn-card', className)} {...props}>{children}</Component>
}

export function Panel({ as: Component = 'section', className = '', children, ...props }) {
  return <Component className={cx('ffn-panel', className)} {...props}>{children}</Component>
}

export function StatCard({ label, value, meta, icon: Icon, tone = 'info', className = '' }) {
  return (
    <article className={cx('ffn-stat-card', className)}>
      <div className="ffn-cluster" style={{ justifyContent: 'space-between' }}>
        <span className="ffn-stat-card__label">{label}</span>
        {Icon ? <Badge tone={tone} icon={Icon} label="" aria-hidden="true" /> : null}
      </div>
      <strong className="ffn-stat-card__value">{value}</strong>
      {meta ? <span className="ffn-stat-card__meta">{meta}</span> : null}
    </article>
  )
}

export function Badge({ label, tone = 'info', icon: Icon, className = '', ...props }) {
  return (
    <span className={cx('ffn-badge', `ffn-badge--${tone}`, className)} {...props}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {label}
    </span>
  )
}

export function Skeleton({ className = '', circle = false, width, height, ...props }) {
  return (
    <span
      className={cx('ffn-skeleton', circle && 'ffn-skeleton--circle', className)}
      style={{ width, height, ...(props.style || {}) }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function EmptyState({
  icon: Icon = Search,
  title = 'Nothing to show',
  message = '',
  action = null,
  className = '',
}) {
  return (
    <div className={cx('ffn-empty-state', className)}>
      <span className="ffn-empty-state__icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <strong className="ffn-empty-state__title">{title}</strong>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  )
}

export function InlineAlert({
  tone = 'info',
  title,
  children,
  icon: Icon,
  className = '',
}) {
  const AlertIcon = Icon || (tone === 'warning' || tone === 'danger' ? AlertTriangle : Info)
  return (
    <div className={cx('ffn-inline-alert', `ffn-inline-alert--${tone}`, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <AlertIcon size={18} aria-hidden="true" />
      <div className="ffn-stack" style={{ '--ffn-stack-gap': '4px' }}>
        {title ? <strong>{title}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  )
}

export function Tooltip({ label, children, className = '' }) {
  return (
    <span className={cx('ffn-tooltip', className)}>
      {children}
      <span className="ffn-tooltip__bubble" role="tooltip">{label}</span>
    </span>
  )
}

export function LoadingLabel({ label = 'Loading', className = '' }) {
  return (
    <span className={cx('ffn-cluster', className)} aria-live="polite">
      <Loader2 size={15} className="ffn-spin" aria-hidden="true" />
      {label}
    </span>
  )
}

export const NotificationIcon = Bell
