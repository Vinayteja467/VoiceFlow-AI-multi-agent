import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'voiceflow.theme';

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  source: 'browser' | 'omi';

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setPaletteOpen: (open: boolean) => void;
  setSource: (source: 'browser' | 'omi') => void;
}

/** Dark is the default; the inline script in index.html applies it pre-paint. */
export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  sidebarCollapsed: false,
  paletteOpen: false,
  source: 'browser',

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setSource: (source) => set({ source }),
}));
