import { defaultPresets } from '@/lib/theme';

type ThemeVariableMap = Record<string, string | undefined>;

export interface CriticalThemeStyles {
  light: ThemeVariableMap;
  dark: ThemeVariableMap;
}

export function resolveThemeStyles(
  theme: CriticalThemeStyles | null | undefined,
  fallbackTheme: CriticalThemeStyles = defaultPresets.tangerine
    .styles as CriticalThemeStyles,
): CriticalThemeStyles {
  if (!theme) {
    return {
      light: { ...fallbackTheme.light },
      dark: { ...fallbackTheme.dark },
    };
  }

  return {
    light: { ...fallbackTheme.light, ...theme.light },
    dark: { ...fallbackTheme.dark, ...theme.dark },
  };
}

function toCssVariableDeclarations(themeVariables: ThemeVariableMap) {
  return Object.entries(themeVariables)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `--${key}: ${value}`)
    .join('; ');
}

export function buildCriticalThemeCss(
  theme: CriticalThemeStyles | null | undefined,
  isDarkMode: boolean,
  fallbackTheme: CriticalThemeStyles = defaultPresets.tangerine
    .styles as CriticalThemeStyles,
) {
  const resolvedTheme = resolveThemeStyles(theme, fallbackTheme);
  const lightDeclarations = toCssVariableDeclarations(resolvedTheme.light);
  const darkDeclarations = toCssVariableDeclarations(resolvedTheme.dark);
  const cssRules: string[] = [];

  if (lightDeclarations) cssRules.push(`:root { ${lightDeclarations}; }`);
  if (darkDeclarations) cssRules.push(`.dark { ${darkDeclarations}; }`);
  cssRules.push(`html { color-scheme: ${isDarkMode ? 'dark' : 'light'}; }`);
  cssRules.push(
    'html, body { background-color: var(--background); color: var(--foreground); }',
  );

  return cssRules.join(' ');
}
