import { createServerFn } from '@tanstack/react-start';
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server';
import type React from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { z } from 'zod';
import { defaultPresets, type ThemeStyles } from '@/lib/theme';
import { resolveThemeStyles } from '@/lib/theme/critical-theme-css';

const THEME_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 365,
};
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface ThemeContextType {
  theme: ThemeStyles;
  setTheme: React.Dispatch<React.SetStateAction<ThemeStyles>>;
  currentThemeName: string | null;
  setCurrentThemeName: (name: string | null) => void;
  applyPreset: (presetName: string) => void;
  getAvailablePresets: () => { name: string; label: string }[];
  isDarkMode: boolean;
  toggleDarkMode: (coords?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const setAppTheme = createServerFn()
  .inputValidator(z.string().nullable())
  .handler(({ data }) => {
    if (!data) return deleteCookie('app-theme', { path: '/' });
    return setCookie('app-theme', data, THEME_COOKIE_OPTIONS);
  });

export const getAppTheme = createServerFn().handler(async () => {
  return getCookie('app-theme');
});

export const setAppThemeData = createServerFn()
  .inputValidator(z.custom<ThemeStyles>())
  .handler(({ data }) => {
    return setCookie(
      'app-theme-data',
      JSON.stringify(data),
      THEME_COOKIE_OPTIONS,
    );
  });

export const getAppThemeData = createServerFn().handler(async () => {
  const theme = getCookie('app-theme-data');
  if (!theme) return null;
  try {
    return JSON.parse(theme) as ThemeStyles;
  } catch {
    return null;
  }
});

export const setAppDarkMode = createServerFn()
  .inputValidator(z.boolean())
  .handler(({ data }) => {
    return setCookie('app-dark-mode', data.toString(), THEME_COOKIE_OPTIONS);
  });

export const getAppDarkMode = createServerFn().handler(async () => {
  return getCookie('app-dark-mode');
});

export function resolveDarkModePreference(
  savedDarkMode: string | null | undefined,
) {
  return savedDarkMode !== 'false';
}

export function applyTheme(
  theme: ThemeStyles,
  isDarkMode: boolean,
  currentThemeName: string | null,
) {
  const root = document.documentElement;
  const resolvedTheme = resolveThemeStyles(theme);

  // Apply light theme variables
  Object.entries(resolvedTheme.light).forEach(([key, value]) => {
    if (value !== undefined) {
      root.style.setProperty(`--${key}`, value);
    }
  });

  // Apply dark theme variables only when in dark mode
  if (isDarkMode) {
    Object.entries(resolvedTheme.dark).forEach(([key, value]) => {
      if (value !== undefined) {
        root.style.setProperty(`--${key}`, value);
      }
    });
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    // Remove dark mode variables when in light mode
    Object.keys(resolvedTheme.dark).forEach((key) => {
      root.style.removeProperty(`--${key}`);
    });
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  if (currentThemeName) {
    setAppTheme({ data: currentThemeName });
    setAppThemeData({ data: theme });
  }
  setAppDarkMode({ data: isDarkMode });
}

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  savedThemeName: string | null | undefined;
  savedDarkMode: string | null | undefined;
  savedTheme: ThemeStyles | null | undefined;
}> = ({ children, savedTheme, savedDarkMode, savedThemeName }) => {
  const [currentThemeName, setCurrentThemeName] = useState(
    savedThemeName ?? null,
  );
  const [isDarkMode, setIsDarkMode] = useState(
    resolveDarkModePreference(savedDarkMode),
  );
  const [theme, setTheme] = useState(() => {
    const theme = savedTheme ?? defaultPresets.tangerine.styles;
    // applyTheme(theme, isDarkMode, currentThemeName ?? null)
    return theme;
  });
  // Apply theme changes to CSS variables
  useIsomorphicLayoutEffect(() => {
    applyTheme(theme, isDarkMode, currentThemeName ?? null);
  }, [theme, isDarkMode, currentThemeName]);

  const applyPreset = (presetName: string) => {
    const preset = defaultPresets[presetName as keyof typeof defaultPresets];
    if (preset) {
      setTheme(preset.styles);
      setCurrentThemeName(presetName);
    }
  };

  const getAvailablePresets = () => {
    return Object.entries(defaultPresets).map(([name, preset]) => ({
      name,
      label: preset.label || name,
    }));
  };

  const toggleDarkMode = (coords?: { x: number; y: number }) => {
    const { x, y } = coords ?? {};
    const root = document.documentElement;
    const newMode = !isDarkMode;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!document.startViewTransition || prefersReducedMotion) {
      setIsDarkMode(newMode);
      return;
    }

    if (x) {
      root.style.setProperty('--x', `${x}px`);
      root.style.setProperty('--y', `${y}px`);
    } else {
      root.style.removeProperty('--x');
      root.style.removeProperty('--y');
    }

    root.dataset.themeTransition = 'active';

    const transition = document.startViewTransition(() => {
      setIsDarkMode(newMode);
    });

    void transition.finished.finally(() => {
      delete root.dataset.themeTransition;
      root.style.removeProperty('--x');
      root.style.removeProperty('--y');
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        currentThemeName,
        setCurrentThemeName,
        applyPreset,
        getAvailablePresets,
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
