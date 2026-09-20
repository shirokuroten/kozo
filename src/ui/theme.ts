import { useState } from 'react';

export type Theme = 'auto' | 'light' | 'dark';

// The same key and attribute are read by the inline script in index.html, which applies the theme before the first paint
const STORAGE_KEY = 'kozo:theme';
const PAPER = { light: '#FAFBF9', dark: '#14171C' };

export function parseTheme(saved: string | null): Theme {
  return saved === 'light' || saved === 'dark' ? saved : 'auto';
}

function loadTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be blocked (private mode). Following the system is a safe default
    return 'auto';
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;

  // The browser bar follows the system through the media attributes. A forced theme has to override both
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta) => {
    const system = meta.media.includes('dark') ? PAPER.dark : PAPER.light;
    meta.content = theme === 'auto' ? system : PAPER[theme];
  });
}

export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(loadTheme);
  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      if (next === 'auto') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still holds for this visit
    }
  };
  return { theme, setTheme };
}
