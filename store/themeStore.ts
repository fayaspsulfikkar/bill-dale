import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';
type Accent = 'blue' | 'zinc' | 'rose' | 'green' | 'orange';

interface ThemeState {
  theme: Theme;
  accent: Accent;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  resolvedTheme: () => 'dark' | 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      accent: 'blue',

      setTheme: (theme) => {
        set({ theme });
        const resolved = theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          : theme;
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      },

      setAccent: (accent) => {
        set({ accent });
        const root = document.documentElement;
        root.classList.remove('theme-blue', 'theme-zinc', 'theme-rose', 'theme-green', 'theme-orange');
        root.classList.add(`theme-${accent}`);
      },

      resolvedTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    { name: 'bill-dale-theme' }
  )
);
