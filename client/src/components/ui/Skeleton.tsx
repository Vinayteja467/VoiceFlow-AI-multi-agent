import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** Shimmering placeholder block. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative overflow-hidden rounded-md bg-surface-2', className)}
      {...props}
    >
      <div className="absolute inset-0 bg-shimmer motion-reduce:hidden" />
    </div>
  );
}
