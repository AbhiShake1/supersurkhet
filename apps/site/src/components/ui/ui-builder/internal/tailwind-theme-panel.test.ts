import { describe, expect, it } from 'vitest';
import { resolveThemeLayerStyle } from './tailwind-theme-panel';

describe('resolveThemeLayerStyle', () => {
  it('returns style vars for a valid theme', () => {
    const style = resolveThemeLayerStyle('red', 'dark', 0.75);
    const styleVars = style as Record<string, string> | undefined;
    expect(style).toBeDefined();
    expect(styleVars?.['--radius']).toBe('0.75rem');
    expect(styleVars?.color).toMatch(/^hsl\(/);
    expect(styleVars?.borderColor).toMatch(/^hsl\(/);
  });

  it('returns undefined for unknown theme name', () => {
    const style = resolveThemeLayerStyle('missing' as never, 'light', 0.5);
    expect(style).toBeUndefined();
  });
});
