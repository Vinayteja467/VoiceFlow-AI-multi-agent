import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-out-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:pointer-events-none disabled:opacity-50 motion-safe:active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-white shadow-e2 hover:bg-brand-500 hover:shadow-glow-brand dark:bg-brand-600',
        secondary: 'border border-line bg-surface-2 text-ink hover:bg-surface-3',
        outline: 'border border-line bg-transparent text-ink hover:bg-surface-2',
        ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger-600 text-white hover:bg-danger-500',
        subtle: 'bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 dark:text-brand-200',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-[0.95rem]',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
