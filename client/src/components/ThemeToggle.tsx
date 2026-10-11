import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { Button, Tooltip } from './ui';

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Tooltip label={`Switch to ${next} mode`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={`Switch to ${next} mode`}
        className="text-muted hover:text-ink"
      >
        <Sun className="size-5 hidden dark:block" />
        <Moon className="size-5 block dark:hidden" />
      </Button>
    </Tooltip>
  );
}
