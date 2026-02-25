import { describe, expect, test } from 'vitest';
import { buildCriticalThemeCss, type CriticalThemeStyles } from './critical-theme-css';

const fallbackTheme: CriticalThemeStyles = {
  light: {
    background: '#f8f8f8',
    foreground: '#111111',
    card: '#ffffff',
  },
  dark: {
    background: '#111111',
    foreground: '#eeeeee',
    card: '#1a1a1a',
  },
};

describe('buildCriticalThemeCss', () => {
  test('does not leak light variables into dark mode declarations', () => {
    const partialTheme: CriticalThemeStyles = {
      light: {
        background: '#ffffff',
      },
      dark: {
        foreground: '#dddddd',
      },
    };

    const css = buildCriticalThemeCss(partialTheme, true, fallbackTheme);

    expect(css).toContain('.dark {');
    expect(css).toContain('--background: #111111');
    expect(css).not.toContain('--background: #ffffff; --background: #111111');
    expect(css).toContain('html { color-scheme: dark; }');
  });

  test('keeps first paint background/text style in critical CSS', () => {
    const css = buildCriticalThemeCss(fallbackTheme, false, fallbackTheme);

    expect(css).toContain(
      'html, body { background-color: var(--background); color: var(--foreground); }',
    );
    expect(css).toContain('html { color-scheme: light; }');
  });
});
