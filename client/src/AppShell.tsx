import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useUiStore } from './store/uiStore';
import { Background } from './components/Background';
import { CommandPalette } from './components/CommandPalette';
import { Header } from './components/layout/Header';
import { MobileTabs } from './components/layout/MobileTabs';
import { Sidebar } from './components/layout/Sidebar';

export function AppShell() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(!useUiStore.getState().paletteOpen);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setPaletteOpen]);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only left-4 top-4 z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>

      <Background />
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main id="main" className="flex-1 pb-28 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <MobileTabs />
      <CommandPalette />
    </div>
  );
}
