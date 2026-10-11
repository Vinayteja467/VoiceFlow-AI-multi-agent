import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium leading-5 tracking-wide whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-surface-2 text-muted',
        brand: 'border-brand-500/30 bg-brand-500/12 text-brand-300 dark:text-brand-200',
        outline: 'border-line bg-transparent text-muted',
        success: 'border-success-500/30 bg-success-500/12 text-success-600 dark:text-success-400',
        warn: 'border-warn-500/30 bg-warn-500/12 text-warn-600 dark:text-warn-400',
        danger: 'border-danger-500/30 bg-danger-500/12 text-danger-600 dark:text-danger-400',
        research: 'border-research/30 bg-research/12 text-research',
        planning: 'border-planning/30 bg-planning/12 text-planning',
        task: 'border-task/30 bg-task/12 text-task',
        orchestrator: 'border-orchestrator/30 bg-orchestrator/12 text-orchestrator',
      },
      mono: { true: 'font-mono uppercase', false: '' },
      size: { sm: 'px-2 py-0 text-[0.65rem]', md: '', lg: 'px-3 py-1 text-xs' },
    },
    defaultVariants: { tone: 'neutral', mono: false, size: 'md' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, mono, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, mono, size }), className)} {...props} />;
}
