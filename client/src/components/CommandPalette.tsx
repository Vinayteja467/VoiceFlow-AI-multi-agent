import { Search, Sparkles, SunMoon, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useUiStore } from '../store/uiStore';
import { NAV_ITEMS } from './layout/nav';

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
}

/**
 * Cmd/Ctrl+K palette. Navigation + theme + a shortcut to start an example run.
 * Fully keyboard driven: ↑/↓ to move, Enter to run, Esc to close.
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...NAV_ITEMS.map((item) => ({
        id: item.to,
        label: `Go to ${item.label}`,
        hint: item.description,
        icon: item.icon,
        run: () => navigate(item.to),
      })),
      {
        id: 'theme',
        label: 'Toggle theme',
        hint: 'Dark / light appearance',
        icon: SunMoon,
        run: toggleTheme,
      },
      {
        id: 'example',
        label: 'Run example: hackathon prep',
        hint: 'Start a workflow from the Command Center',
        icon: Sparkles,
        run: () => {
          navigate('/');
          requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('voiceflow:example')));
        },
      },
    ],
    [navigate, toggleTheme],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (!open) return null;

  function runAt(index: number) {
    const command = filtered[index];
    if (!command) return;
    command.run();
    setPaletteOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPaletteOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runAt(active);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm motion-safe:animate-in"
        onClick={() => setPaletteOpen(false)}
      />
      <div className="glass relative w-full max-w-lg overflow-hidden rounded-2xl shadow-e4 motion-safe:starting:opacity-0 motion-safe:starting:scale-[0.98] motion-safe:transition-all motion-safe:duration-200">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="size-4 shrink-0 text-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Type a command…"
            aria-label="Command input"
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
          />
          <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.65rem] text-subtle">
            esc
          </kbd>
        </div>

        <ul className="scrollbar-thin max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-subtle">No matching commands</li>
          )}
          {filtered.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => runAt(index)}
                aria-current={index === active}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  index === active ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface-2/60',
                )}
              >
                <command.icon className="size-4 shrink-0 text-subtle" />
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                <span className="hidden max-w-[10rem] truncate text-xs text-subtle sm:block">
                  {command.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
