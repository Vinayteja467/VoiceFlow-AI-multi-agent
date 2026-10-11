import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-line bg-surface-2/70 px-3 text-sm text-ink shadow-inner',
        'placeholder:text-subtle',
        'transition-colors duration-200 hover:border-line focus:border-accent-500/60 focus:bg-surface-2 focus:outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
