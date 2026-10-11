import { Search } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { ModeBadge } from '../ModeBadge';
import { ThemeToggle } from '../ThemeToggle';
import { Button } from '../ui';
import { Logo } from './Logo';

export function Header() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface-0/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <div className="lg:hidden">
          <Logo />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ModeBadge />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 gap-2 pl-3 pr-2 text-muted sm:inline-flex"
            aria-keyshortcuts="Meta+K Control+K"
          >
            <Search className="size-4" />
            <span className="text-xs">Search</span>
            <kbd className="ml-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.65rem] text-subtle">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            className="sm:hidden"
          >
            <Search className="size-5" />
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
