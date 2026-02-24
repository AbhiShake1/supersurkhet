import { defaultPresets } from '@/lib/theme';

type ThemeVariableMap = Record<string, string | undefined>;

export interface CriticalThemeStyles {
  light: ThemeVariableMap;
  dark: ThemeVariableMap;
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
  if (!theme) {
    return [
      `html { color-scheme: ${isDarkMode ? 'dark' : 'light'}; }`,
      'html, body { background-color: var(--background); color: var(--foreground); }',
    ].join(' ');
  }

  const mergedLightTheme = { ...fallbackTheme.light, ...theme.light };
  const mergedDarkTheme = { ...fallbackTheme.dark, ...theme.dark };
  const lightDeclarations = toCssVariableDeclarations(mergedLightTheme);
  const darkDeclarations = toCssVariableDeclarations(mergedDarkTheme);
  const cssRules: string[] = [];

  if (lightDeclarations) cssRules.push(`:root { ${lightDeclarations}; }`);
  if (darkDeclarations) cssRules.push(`.dark { ${darkDeclarations}; }`);
  cssRules.push(`html { color-scheme: ${isDarkMode ? 'dark' : 'light'}; }`);
  cssRules.push(
    'html, body { background-color: var(--background); color: var(--foreground); }',
  );

  return cssRules.join(' ');
}
