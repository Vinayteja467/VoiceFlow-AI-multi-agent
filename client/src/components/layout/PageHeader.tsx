import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
}

/** Consistent page title block used by the non-Command-Center routes. */
export function PageHeader({ title, description, icon: Icon, badge, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start gap-3">
      {Icon && (
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface-2 text-brand-400">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-fluid-hero font-semibold text-ink">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1.5 max-w-2xl text-balance text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'brand' | 'accent' | 'success' | 'warn' | 'danger';
  icon?: LucideIcon;
}

const STAT_TONE: Record<NonNullable<StatProps['tone']>, string> = {
  neutral: 'text-muted',
  brand: 'text-brand-400',
  accent: 'text-accent-400',
  success: 'text-success-500',
  warn: 'text-warn-500',
  danger: 'text-danger-500',
};

/** Compact metric tile for page toolbars. */
export function Stat({ label, value, tone = 'neutral', icon: Icon }: StatProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-1/50 px-3.5 py-2.5">
      {Icon && <Icon className={`size-4 shrink-0 ${STAT_TONE[tone]}`} />}
      <div className="min-w-0">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-subtle">
          {label}
        </div>
        <div className="text-lg font-semibold leading-tight text-ink tabular-nums">{value}</div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

/** Dashed-border empty / zero-data state. */
export function EmptyState({ icon: Icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center ${className ?? ''}`}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-subtle">
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-sm text-balance text-xs text-muted">{message}</p>
      {action}
    </div>
  );
}
