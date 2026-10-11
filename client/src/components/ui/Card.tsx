import { forwardRef, type HTMLAttributes, type MouseEvent } from 'react';
import { cn } from '../../lib/cn';

type CardVariant = 'glass' | 'solid' | 'plain' | 'sunken';

const variantClass: Record<CardVariant, string> = {
  glass: 'glass shadow-e2',
  solid: 'border border-line bg-surface-1 shadow-e1',
  plain: '',
  sunken: 'border border-line bg-surface-2/60',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Enable the cursor-follow spotlight highlight (sets --mx/--my). */
  spotlight?: boolean;
  /** Draw the animated gradient hairline border. */
  gradientBorder?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'glass', spotlight = false, gradientBorder = false, onMouseMove, ...props },
  ref,
) {
  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (spotlight) {
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      el.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }
    onMouseMove?.(event);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative rounded-2xl',
        variantClass[variant],
        spotlight && 'spotlight',
        gradientBorder && 'gradient-border',
        className,
      )}
      {...props}
    />
  );
});
