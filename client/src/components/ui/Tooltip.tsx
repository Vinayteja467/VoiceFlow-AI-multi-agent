import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

const sideClass: Record<'top' | 'bottom', string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
};

/** Lightweight, dependency-free tooltip shown on hover / keyboard focus. */
export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          // `hidden` (display:none) rather than opacity-0 so a hidden tooltip never
          // contributes to the document's scroll width (which caused x-overflow).
          'pointer-events-none absolute z-50 hidden w-max max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md border border-line bg-surface-2 px-2 py-1 text-xs text-ink shadow-e3',
          'group-hover/tt:block group-focus-within/tt:block',
          sideClass[side],
        )}
      >
        {label}
      </span>
    </span>
  );
}
