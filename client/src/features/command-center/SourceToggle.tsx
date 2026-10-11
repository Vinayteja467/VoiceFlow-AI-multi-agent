import { Glasses, Mic } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

const SOURCES = [
  { id: 'browser' as const, label: 'Browser mic', icon: Mic },
  { id: 'omi' as const, label: 'Omi', icon: Glasses },
];

/** Choose between the browser microphone and the Omi wearable stream. */
export function SourceToggle() {
  const source = useUiStore((s) => s.source);
  const setSource = useUiStore((s) => s.setSource);

  return (
    <div
      role="tablist"
      aria-label="Voice source"
      className="inline-flex rounded-lg border border-line bg-surface-2/60 p-0.5"
    >
      {SOURCES.map((item) => {
        const selected = source === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setSource(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              selected ? 'bg-surface-1 text-ink shadow-e1' : 'text-subtle hover:text-muted',
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
