import { useMemo } from 'react';
import { JSON_KIND_CLASS, tokenizeJson } from '../../lib/jsonHighlight';
import { cn } from '../../lib/cn';

interface JsonPanelProps {
  label: string;
  value: unknown;
  className?: string;
  maxHeightClass?: string;
}

/** Collapsible-agnostic, syntax-highlighted JSON block. */
export function JsonPanel({ label, value, className, maxHeightClass = 'max-h-56' }: JsonPanelProps) {
  const tokens = useMemo(() => tokenizeJson(value), [value]);

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface-0/70', className)}>
      <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-subtle">
          {label}
        </span>
      </div>
      <pre
        className={cn(
          'scrollbar-thin overflow-auto p-2.5 font-mono text-[0.7rem] leading-relaxed',
          maxHeightClass,
        )}
      >
        <code>
          {tokens.map((token, i) => (
            <span key={i} className={JSON_KIND_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
